import { test, expect } from '@playwright/test';
import { BaseTest } from '../../utils/base-test';
import { fileLoader } from '../../utils/file-loader';
import { imageValidator } from '../../utils/image-validator';

/**
 * Passport Photo Tool Test
 * 
 * Tests the passport-photo tool:
 * - Uploads a portrait image
 * - Selects a country/size preset (US, UK, EU, etc.)
 * - Validates output matches exact dimensions for that country
 * - Verifies aspect ratio is correct
 */
test.describe('Passport Photo Tool', () => {
  let baseTest: BaseTest;

  test.beforeEach(async ({ page }) => {
    baseTest = new BaseTest(page);
    await baseTest.navigateToTool('passport-photo');
  });

  test('should create US passport photo (2x2 inches)', async ({ page }) => {
    const testImage = fileLoader.getFixturePath('images/portrait.jpg');
    await baseTest.uploadFile(testImage);

    // Select US passport size (2x2 inches = 600x600 pixels at 300 DPI)
    await page.selectOption('select[name="country"], select[name="size"]', { label: /US|United States|2x2/i });
    
    await baseTest.waitForProcessing();
    const outputPath = await baseTest.downloadFile();

    // US passport: 2x2 inches = 600x600 pixels (300 DPI)
    await baseTest.assertImageDimensions(outputPath, 600, 600, 5); // 5px tolerance
    await baseTest.assertImageFormat(outputPath, 'jpg');
  });

  test('should create UK passport photo (45x35mm)', async ({ page }) => {
    const testImage = fileLoader.getFixturePath('images/portrait.jpg');
    await baseTest.uploadFile(testImage);

    // Select UK passport size (45x35mm = 531x413 pixels at 300 DPI)
    await page.selectOption('select[name="country"], select[name="size"]', { label: /UK|United Kingdom/i });
    
    await baseTest.waitForProcessing();
    const outputPath = await baseTest.downloadFile();

    // UK passport: 45x35mm = 531x413 pixels (300 DPI)
    await baseTest.assertImageDimensions(outputPath, 531, 413, 5);
  });

  test('should create EU passport photo (35x45mm)', async ({ page }) => {
    const testImage = fileLoader.getFixturePath('images/portrait.jpg');
    await baseTest.uploadFile(testImage);

    // Select EU passport size (35x45mm = 413x531 pixels at 300 DPI)
    await page.selectOption('select[name="country"], select[name="size"]', { label: /EU|Europe/i });
    
    await baseTest.waitForProcessing();
    const outputPath = await baseTest.downloadFile();

    // EU passport: 35x45mm = 413x531 pixels (300 DPI)
    await baseTest.assertImageDimensions(outputPath, 413, 531, 5);
  });

  test('should maintain correct aspect ratio', async ({ page }) => {
    const testImage = fileLoader.getFixturePath('images/portrait.jpg');
    await baseTest.uploadFile(testImage);

    await page.selectOption('select[name="country"], select[name="size"]', { label: /US/i });
    await baseTest.waitForProcessing();
    const outputPath = await baseTest.downloadFile();

    const dimensions = await imageValidator.getDimensions(outputPath);
    const aspectRatio = dimensions.width / dimensions.height;
    
    // US passport should be square (1:1 ratio)
    expect(aspectRatio).toBeCloseTo(1.0, 2);
  });
});

