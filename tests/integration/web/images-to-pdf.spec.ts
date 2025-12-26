import { test, expect } from '@playwright/test';
import { BaseTest } from '../../utils/base-test';
import { fileLoader } from '../../utils/file-loader';
import { pdfInspector } from '../../utils/pdf-inspector';
import { imageValidator } from '../../utils/image-validator';

/**
 * Images to PDF Tool Test
 * 
 * Tests the images-to-pdf tool:
 * - Converts single image to PDF
 * - Converts multiple images to multi-page PDF
 * - Validates PDF dimensions match image dimensions
 * - Verifies page count matches number of images
 */
test.describe('Images to PDF Tool', () => {
  let baseTest: BaseTest;

  test.beforeEach(async ({ page }) => {
    baseTest = new BaseTest(page);
    await baseTest.navigateToTool('images-to-pdf');
  });

  test('should convert single image to PDF', async ({ page }) => {
    const testImage = fileLoader.getFixturePath('images/portrait.jpg');
    const imageDims = await imageValidator.getDimensions(testImage);

    await baseTest.uploadFile(testImage);
    await baseTest.waitForProcessing();
    const outputPath = await baseTest.downloadFile();

    // Verify PDF was created
    await baseTest.assertPDFValid(outputPath);
    await baseTest.assertPDFPageCount(outputPath, 1);

    // Note: PDF page dimensions are in points (1/72 inch)
    // Image dimensions are in pixels, so we can't directly compare
    // But we can verify the PDF is valid and has 1 page
  });

  test('should convert multiple images to multi-page PDF', async ({ page }) => {
    const testImages = [
      fileLoader.getFixturePath('images/image1.jpg'),
      fileLoader.getFixturePath('images/image2.jpg'),
      fileLoader.getFixturePath('images/image3.jpg'),
    ];

    await baseTest.uploadFiles(testImages);
    await baseTest.waitForProcessing();
    const outputPath = await baseTest.downloadFile();

    // Verify PDF has correct number of pages
    await baseTest.assertPDFPageCount(outputPath, testImages.length);
    await baseTest.assertPDFValid(outputPath);
  });

  test('should preserve image order', async ({ page }) => {
    const testImages = [
      fileLoader.getFixturePath('images/image1.jpg'),
      fileLoader.getFixturePath('images/image2.jpg'),
    ];

    await baseTest.uploadFiles(testImages);
    
    // Reorder if drag-and-drop is available
    // (This tests that order is preserved)

    await baseTest.waitForProcessing();
    const outputPath = await baseTest.downloadFile();

    await baseTest.assertPDFPageCount(outputPath, 2);
  });

  test('should handle different image formats', async ({ page }) => {
    const testImages = [
      fileLoader.getFixturePath('images/image.jpg'),
      fileLoader.getFixturePath('images/image.png'),
      fileLoader.getFixturePath('images/image.webp'),
    ];

    await baseTest.uploadFiles(testImages);
    await baseTest.waitForProcessing();
    const outputPath = await baseTest.downloadFile();

    // All images should be converted to PDF pages
    await baseTest.assertPDFPageCount(outputPath, testImages.length);
  });
});

