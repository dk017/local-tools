import { test, expect } from '@playwright/test';
import { BaseTest } from '../../utils/base-test';
import { fileLoader } from '../../utils/file-loader';
import { imageValidator } from '../../utils/image-validator';
import * as fs from 'fs';

/**
 * Background Remover Tool Test
 * 
 * Tests the remove-image-background tool:
 * - Uploads an image with background
 * - Processes it to remove background
 * - Validates output has transparency (PNG with alpha channel)
 * - Verifies image dimensions are preserved
 */
test.describe('Remove Background Tool', () => {
  let baseTest: BaseTest;

  test.beforeEach(async ({ page }) => {
    baseTest = new BaseTest(page);
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });
    
    // Listen for page errors
    page.on('pageerror', error => {
      console.log('Page error:', error.message);
    });
    
    await baseTest.navigateToTool('remove-image-background');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle').catch(() => {}); // Wait for network to settle
    // Wait for file uploader to be ready - increase timeout
    await page.waitForSelector('input[type="file"]', { timeout: 30000 }).catch(() => {});
  });

  test('should remove background from image', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes for this test
    
    // Upload test image - try portrait-with-bg.jpg first, fallback to portrait.jpg
    const testImage = fileLoader.getFixturePathWithFallback(
      'images/portrait-with-bg.jpg',
      ['images/portrait.jpg', 'images/portrait-2.png', 'images/portriat-1.png']
    );
    
    // Wait for file input to be ready - increase timeout
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.waitFor({ state: 'attached', timeout: 30000 });
    
    // Upload file
    await fileInput.setInputFiles(testImage);
    
    // Wait for status to change to "uploading" or "processing"
    // The tool should auto-process after file upload
    try {
      // Wait for either uploading or processing state
      await page.waitForSelector(
        'text=/Uploading|Processing|uploading|processing/i, [class*="animate-spin"]',
        { timeout: 10000 }
      );
      console.log('Processing started');
    } catch (e) {
      // Take screenshot for debugging
      await page.screenshot({ path: 'test-results/debug-upload.png', fullPage: true });
      console.log('Warning: Processing indicator not found, but continuing...');
    }
    
    // Wait for processing to complete (look for download button)
    await baseTest.waitForProcessing(180000);

    // Download result
    const outputPath = await baseTest.downloadFile();

    // Validate output
    await baseTest.assertImageFormat(outputPath, 'png');
    
    // Check that output has transparency (alpha channel)
    const hasTransparency = await imageValidator.hasTransparency(outputPath);
    expect(hasTransparency).toBe(true);

    // Verify dimensions are preserved
    const originalDims = await imageValidator.getDimensions(testImage);
    const outputDims = await imageValidator.getDimensions(outputPath);
    expect(outputDims.width).toBe(originalDims.width);
    expect(outputDims.height).toBe(originalDims.height);
  });

  test('should handle multiple images', async ({ page }) => {
    // Try to use portrait-with-bg.jpg, fallback to portrait.jpg
    const image1 = fileLoader.getFixturePathWithFallback(
      'images/portrait-with-bg.jpg',
      ['images/portrait.jpg', 'images/portrait-2.png']
    );
    // Try product-with-bg.jpg, fallback to any other image
    const image2 = fileLoader.getFixturePathWithFallback(
      'images/product-with-bg.jpg',
      ['images/portrait-2.png', 'images/portriat-1.png', 'images/portrait.jpg']
    );
    const testImages = [image1, image2];

    await baseTest.uploadFiles(testImages);
    await baseTest.waitForProcessing();

    // Check if download link points to pricing (licensing gate for multiple images)
    const downloadButton = page.locator('a[href*="/api/"], a[download], a:has-text("Download"), button:has-text("Download")').first();
    await downloadButton.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    const href = await downloadButton.getAttribute('href').catch(() => null);
    
    if (href && (href.includes('#pricing') || href.includes('/pricing'))) {
      // Multiple image processing requires a license - skip this test
      test.skip();
      return;
    }

    // Should download a ZIP file with multiple processed images
    const outputPath = await baseTest.downloadFile();
    
    // Verify it's a ZIP file - check file content (Playwright downloads don't preserve extensions)
    const fileBuffer = fs.readFileSync(outputPath);
    // ZIP files start with PK (50 4B) signature
    const isZip = fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4B;
    expect(isZip).toBe(true);
  });

  test('should preserve image quality', async ({ page }) => {
    // Try to use portrait-with-bg.jpg, fallback to portrait.jpg
    const testImage = fileLoader.getFixturePathWithFallback(
      'images/portrait-with-bg.jpg',
      ['images/portrait.jpg', 'images/portrait-2.png', 'images/portriat-1.png']
    );
    await baseTest.uploadFile(testImage);
    await baseTest.waitForProcessing();

    const outputPath = await baseTest.downloadFile();
    
    // Original and output should have same dimensions
    const originalDims = await imageValidator.getDimensions(testImage);
    const outputDims = await imageValidator.getDimensions(outputPath);
    expect(outputDims).toEqual(originalDims);
  });
});

