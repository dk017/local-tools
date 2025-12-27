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
    const testImage = fileLoader.getFixturePathWithFallback(
      'images/portrait.jpg',
      ['images/portrait-with-bg.jpg', 'images/product-with-bg.jpg']
    );
    
    // Check file size limit (web version has 3MB limit for images)
    const sizeCheck = fileLoader.isWithinWebLimits(testImage, true);
    if (!sizeCheck.within) {
      test.skip(true, `Test image (${(sizeCheck.size / 1024 / 1024).toFixed(2)}MB) exceeds web limit (${(sizeCheck.limit / 1024 / 1024).toFixed(0)}MB). Use desktop app for larger files.`);
    }
    
    await baseTest.uploadFile(testImage);

    // Select US passport size - UI uses buttons, not select dropdown
    // Button text: "United States (2x2 inch)"
    await page.click('button:has-text("United States (2x2 inch)")');
    
    // Wait for crop UI to appear, then click "Crop & Save" button
    await page.waitForSelector('button:has-text("Crop"), button:has-text("Save"), button:has-text("Crop & Save")', { timeout: 10000 });
    await page.click('button:has-text("Crop"), button:has-text("Save"), button:has-text("Crop & Save")').catch(async () => {
      // Try alternative selectors
      await page.click('button:has([class*="CheckCircle"])').catch(() => {
        throw new Error('Crop & Save button not found');
      });
    });
    
    await baseTest.waitForProcessing();
    const outputPath = await baseTest.downloadFile();

    // US passport: 2x2 inches = 600x600 pixels (300 DPI)
    await baseTest.assertImageDimensions(outputPath, 600, 600, 5); // 5px tolerance
    await baseTest.assertImageFormat(outputPath, 'jpg');
  });

  test('should create UK passport photo (45x35mm)', async ({ page }) => {
    const testImage = fileLoader.getFixturePathWithFallback(
      'images/portrait.jpg',
      ['images/portrait-with-bg.jpg', 'images/product-with-bg.jpg']
    );
    
    // Check file size limit
    const sizeCheck = fileLoader.isWithinWebLimits(testImage, true);
    if (!sizeCheck.within) {
      test.skip(true, `Test image (${(sizeCheck.size / 1024 / 1024).toFixed(2)}MB) exceeds web limit (${(sizeCheck.limit / 1024 / 1024).toFixed(0)}MB). Use desktop app for larger files.`);
    }
    
    await baseTest.uploadFile(testImage);

    // Select UK passport size - UI uses buttons
    // Button text: "United Kingdom (35x45mm)"
    await page.click('button:has-text("United Kingdom (35x45mm)")');
    
    // Wait for crop UI to appear, then click "Crop & Save" button
    await page.waitForSelector('button:has-text("Crop"), button:has-text("Save"), button:has-text("Crop & Save")', { timeout: 10000 });
    await page.click('button:has-text("Crop"), button:has-text("Save"), button:has-text("Crop & Save")').catch(async () => {
      await page.click('button:has([class*="CheckCircle"])').catch(() => {
        throw new Error('Crop & Save button not found');
      });
    });
    
    await baseTest.waitForProcessing();
    const outputPath = await baseTest.downloadFile();

    // UK passport: 35x45mm (width x height) = 413x531 pixels (300 DPI)
    // Note: UK passport dimensions are 35mm width x 45mm height
    await baseTest.assertImageDimensions(outputPath, 413, 531, 5);
  });

  test('should create EU passport photo (35x45mm)', async ({ page }) => {
    const testImage = fileLoader.getFixturePathWithFallback(
      'images/portrait.jpg',
      ['images/portrait-with-bg.jpg', 'images/product-with-bg.jpg']
    );
    
    // Check file size limit
    const sizeCheck = fileLoader.isWithinWebLimits(testImage, true);
    if (!sizeCheck.within) {
      test.skip(true, `Test image (${(sizeCheck.size / 1024 / 1024).toFixed(2)}MB) exceeds web limit (${(sizeCheck.limit / 1024 / 1024).toFixed(0)}MB). Use desktop app for larger files.`);
    }
    
    await baseTest.uploadFile(testImage);

    // Select EU passport size - UI uses buttons
    // Button text: "Europe (35x45mm)"
    await page.click('button:has-text("Europe (35x45mm)")');
    
    // Wait for crop UI to appear, then click "Crop & Save" button
    await page.waitForSelector('button:has-text("Crop"), button:has-text("Save"), button:has-text("Crop & Save")', { timeout: 10000 });
    await page.click('button:has-text("Crop"), button:has-text("Save"), button:has-text("Crop & Save")').catch(async () => {
      await page.click('button:has([class*="CheckCircle"])').catch(() => {
        throw new Error('Crop & Save button not found');
      });
    });
    
    await baseTest.waitForProcessing();
    const outputPath = await baseTest.downloadFile();

    // EU passport: 35x45mm = 413x531 pixels (300 DPI)
    await baseTest.assertImageDimensions(outputPath, 413, 531, 5);
  });

  test('should maintain correct aspect ratio', async ({ page }) => {
    const testImage = fileLoader.getFixturePathWithFallback(
      'images/portrait.jpg',
      ['images/portrait-with-bg.jpg', 'images/product-with-bg.jpg']
    );
    
    // Check file size limit
    const sizeCheck = fileLoader.isWithinWebLimits(testImage, true);
    if (!sizeCheck.within) {
      test.skip(true, `Test image (${(sizeCheck.size / 1024 / 1024).toFixed(2)}MB) exceeds web limit (${(sizeCheck.limit / 1024 / 1024).toFixed(0)}MB). Use desktop app for larger files.`);
    }
    
    await baseTest.uploadFile(testImage);

    // Select US passport size - UI uses buttons
    await page.click('button:has-text("United States (2x2 inch)")');
    
    // Wait for crop UI to appear, then click "Crop & Save" button
    await page.waitForSelector('button:has-text("Crop"), button:has-text("Save"), button:has-text("Crop & Save")', { timeout: 10000 });
    await page.click('button:has-text("Crop"), button:has-text("Save"), button:has-text("Crop & Save")').catch(async () => {
      await page.click('button:has([class*="CheckCircle"])').catch(() => {
        throw new Error('Crop & Save button not found');
      });
    });
    
    await baseTest.waitForProcessing();
    const outputPath = await baseTest.downloadFile();

    const dimensions = await imageValidator.getDimensions(outputPath);
    const aspectRatio = dimensions.width / dimensions.height;
    
    // US passport should be square (1:1 ratio)
    expect(aspectRatio).toBeCloseTo(1.0, 2);
  });
});

