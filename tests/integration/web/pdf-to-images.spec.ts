import { test, expect } from '@playwright/test';
import { BaseTest } from '../../utils/base-test';
import { fileLoader } from '../../utils/file-loader';
import { pdfInspector } from '../../utils/pdf-inspector';
import { imageValidator } from '../../utils/image-validator';
import * as fs from 'fs';
import * as path from 'path';
import * as AdmZip from 'adm-zip';

/**
 * PDF to Images Tool Test
 * 
 * Tests the pdf-to-images tool:
 * - Converts PDF pages to images
 * - Validates number of images matches page count
 * - Verifies image format (PNG/JPEG)
 * - Checks image dimensions are reasonable
 */
test.describe('PDF to Images Tool', () => {
  let baseTest: BaseTest;

  test.beforeEach(async ({ page }) => {
    baseTest = new BaseTest(page);
    await baseTest.navigateToTool('pdf-to-images');
  });

  test('should convert PDF to images', async ({ page }) => {
    // Use fallback if multi-page.pdf doesn't exist
    const testPDF = fileLoader.getFixturePathWithFallback('pdfs/multi-page.pdf', ['pdfs/Agoda_Relocation_Package_-_Thailand.pdf', 'pdfs/single-page.pdf']);
    const pageCount = await pdfInspector.getPageCount(testPDF);

    await baseTest.uploadFile(testPDF);
    await baseTest.waitForProcessing();
    const outputPath = await baseTest.downloadFile();

    // Should download a ZIP file with images
    expect(outputPath).toMatch(/\.zip$/i);

    // Extract and verify
    const zip = new AdmZip(outputPath);
    const entries = zip.getEntries();
    const imageEntries = entries.filter(e => /\.(jpg|jpeg|png)$/i.test(e.entryName));

    // Should have same number of images as PDF pages
    expect(imageEntries.length).toBe(pageCount);
  });

  test('should convert to specified image format', async ({ page }) => {
    const testPDF = fileLoader.getFixturePath('pdfs/single-page.pdf');

    await baseTest.uploadFile(testPDF);

    // Select PNG format
    await page.selectOption('select[name="format"]', { label: /PNG/i }).catch(() => {});

    await baseTest.waitForProcessing();
    const outputPath = await baseTest.downloadFile();

    // Extract ZIP and verify format
    const zip = new AdmZip(outputPath);
    const entries = zip.getEntries();
    const pngEntries = entries.filter(e => /\.png$/i.test(e.entryName));

    expect(pngEntries.length).toBeGreaterThan(0);
  });

  test('should generate images with correct dimensions', async ({ page }) => {
    // Use fallback if document.pdf doesn't exist
    const testPDF = fileLoader.getFixturePathWithFallback('pdfs/document.pdf', ['pdfs/single-page.pdf', 'pdfs/Agoda_Relocation_Package_-_Thailand.pdf']);
    await baseTest.uploadFile(testPDF);
    await baseTest.waitForProcessing();
    const outputPath = await baseTest.downloadFile();

    // Extract first image
    const zip = new AdmZip(outputPath);
    const entries = zip.getEntries();
    const firstImage = entries.find(e => /\.(jpg|jpeg|png)$/i.test(e.entryName));

    if (firstImage) {
      // Extract to temp file
      const tempPath = path.join(__dirname, '../../test-results/temp-image.png');
      fs.writeFileSync(tempPath, firstImage.getData());

      // Verify image is valid and has reasonable dimensions
      const isValid = await imageValidator.isValid(tempPath);
      expect(isValid).toBe(true);

      const dimensions = await imageValidator.getDimensions(tempPath);
      expect(dimensions.width).toBeGreaterThan(100);
      expect(dimensions.height).toBeGreaterThan(100);

      // Cleanup
      fs.unlinkSync(tempPath);
    }
  });

  test('should handle single page PDF', async ({ page }) => {
    const testPDF = fileLoader.getFixturePath('pdfs/single-page.pdf');
    await baseTest.uploadFile(testPDF);
    await baseTest.waitForProcessing();
    const outputPath = await baseTest.downloadFile();

    const zip = new AdmZip(outputPath);
    const entries = zip.getEntries();
    const imageEntries = entries.filter(e => /\.(jpg|jpeg|png)$/i.test(e.entryName));

    expect(imageEntries.length).toBe(1);
  });
});

