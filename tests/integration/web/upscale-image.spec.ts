import { test, expect } from '@playwright/test';
import { BaseTest } from '../../utils/base-test';
import { fileLoader } from '../../utils/file-loader';
import { imageValidator } from '../../utils/image-validator';

/**
 * Upscale Image Tool Test
 * 
 * Tests image upscaling/resolution enhancement:
 * - Upscales image by specified factor (2x or 4x)
 * - Validates output dimensions are increased correctly
 * - Verifies aspect ratio is maintained
 * - Verifies image format is preserved
 */
test.describe('Upscale Image Tool', () => {
  let baseTest: BaseTest;

  test.beforeEach(async ({ page }) => {
    baseTest = new BaseTest(page);
    await baseTest.navigateToTool('upscale-image');
  });

  test('should upscale image by 2x', async ({ page }) => {
    // Use fallback if small-image.jpg doesn't exist
    const testImage = fileLoader.getFixturePathWithFallback('images/small-image.jpg', ['images/portrait.jpg', 'images/portrait-with-bg.jpg']);
    const originalDims = await imageValidator.getDimensions(testImage);

    await baseTest.uploadFile(testImage);

    // Click 2x button (default is 2x, but click to ensure)
    await page.click('button:has-text("2x")').catch(() => {});

    await baseTest.waitForProcessing();
    const outputPath = await baseTest.downloadFile();

    // Verify dimensions are doubled
    const outputDims = await imageValidator.getDimensions(outputPath);
    expect(outputDims.width).toBe(originalDims.width * 2);
    expect(outputDims.height).toBe(originalDims.height * 2);
  });

  test('should upscale image by 4x', async ({ page }) => {
    // Use fallback if small-image.jpg doesn't exist
    const testImage = fileLoader.getFixturePathWithFallback('images/small-image.jpg', ['images/portrait.jpg', 'images/portrait-with-bg.jpg']);
    const originalDims = await imageValidator.getDimensions(testImage);

    await baseTest.uploadFile(testImage);
    
    // Click 4x button
    await page.click('button:has-text("4x")');

    await baseTest.waitForProcessing();
    const outputPath = await baseTest.downloadFile();

    const outputDims = await imageValidator.getDimensions(outputPath);
    expect(outputDims.width).toBe(originalDims.width * 4);
    expect(outputDims.height).toBe(originalDims.height * 4);
  });

  test('should maintain aspect ratio', async ({ page }) => {
    const testImage = fileLoader.getFixturePathWithFallback('images/portrait.jpg', ['images/portrait-with-bg.jpg', 'images/small-image.jpg']);
    const originalDims = await imageValidator.getDimensions(testImage);
    const originalAspectRatio = originalDims.width / originalDims.height;

    await baseTest.uploadFile(testImage);
    // Click 2x button
    await page.click('button:has-text("2x")').catch(() => {});

    await baseTest.waitForProcessing();
    const outputPath = await baseTest.downloadFile();

    const outputDims = await imageValidator.getDimensions(outputPath);
    const outputAspectRatio = outputDims.width / outputDims.height;

    // Aspect ratio should be preserved (within small tolerance)
    expect(outputAspectRatio).toBeCloseTo(originalAspectRatio, 2);
  });

  test('should preserve image format', async ({ page }) => {
    // Use fallback if image.png doesn't exist
    const testImage = fileLoader.getFixturePathWithFallback('images/image.png', ['images/portrait-2.png', 'images/portrait-1.png', 'images/portrait.jpg']);
    const originalFormat = await imageValidator.getFormat(testImage);

    await baseTest.uploadFile(testImage);
    await baseTest.waitForProcessing();
    const outputPath = await baseTest.downloadFile();

    const outputFormat = await imageValidator.getFormat(outputPath);
    expect(outputFormat.toLowerCase()).toBe(originalFormat.toLowerCase());
  });
});

