import { test, expect } from '@playwright/test';
import { BaseTest } from '../../utils/base-test';
import { fileLoader } from '../../utils/file-loader';
import { imageValidator } from '../../utils/image-validator';

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
    await baseTest.navigateToTool('remove-image-background');
  });

  test('should remove background from image', async ({ page }) => {
    // Upload test image
    const testImage = fileLoader.getFixturePath('images/portrait-with-bg.jpg');
    await baseTest.uploadFile(testImage);

    // Wait for processing
    await baseTest.waitForProcessing();

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
    const testImages = [
      fileLoader.getFixturePath('images/portrait-with-bg.jpg'),
      fileLoader.getFixturePath('images/product-with-bg.jpg'),
    ];

    await baseTest.uploadFiles(testImages);
    await baseTest.waitForProcessing();

    // Should download a ZIP file with multiple processed images
    const outputPath = await baseTest.downloadFile();
    
    // Verify it's a ZIP file (check extension or MIME type)
    expect(outputPath).toMatch(/\.zip$/i);
  });

  test('should preserve image quality', async ({ page }) => {
    const testImage = fileLoader.getFixturePath('images/portrait-with-bg.jpg');
    await baseTest.uploadFile(testImage);
    await baseTest.waitForProcessing();

    const outputPath = await baseTest.downloadFile();
    
    // Original and output should have same dimensions
    const originalDims = await imageValidator.getDimensions(testImage);
    const outputDims = await imageValidator.getDimensions(outputPath);
    expect(outputDims).toEqual(originalDims);
  });
});

