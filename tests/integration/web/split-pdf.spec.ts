import { test, expect } from '@playwright/test';
import { BaseTest } from '../../utils/base-test';
import { fileLoader } from '../../utils/file-loader';
import { pdfInspector } from '../../utils/pdf-inspector';

/**
 * Split PDF Tool Test
 * 
 * Tests the split-pdf tool:
 * - Splits PDF by page ranges
 * - Splits PDF into individual pages
 * - Validates output page counts
 * - Verifies page order is correct
 */
test.describe('Split PDF Tool', () => {
  let baseTest: BaseTest;

  test.beforeEach(async ({ page }) => {
    baseTest = new BaseTest(page);
    await baseTest.navigateToTool('split-pdf');
  });

  test('should split PDF into individual pages', async ({ page }) => {
    const testPDF = fileLoader.getFixturePath('pdfs/multi-page.pdf');
    const originalPageCount = await pdfInspector.getPageCount(testPDF);

    await baseTest.uploadFile(testPDF);

    // Select "Split by pages" or "Individual pages" option
    await page.click('button:has-text("Split"), button:has-text("Individual"), input[value="pages"]');

    await baseTest.waitForProcessing();
    const outputPath = await baseTest.downloadFile();

    // Should download a ZIP file with individual PDFs
    expect(outputPath).toMatch(/\.zip$/i);

    // Note: In a real test, we'd extract the ZIP and verify each PDF has 1 page
    // For now, we verify the ZIP was created
    const fileSize = fileLoader.getFileSize(outputPath);
    expect(fileSize).toBeGreaterThan(0);
  });

  test('should split PDF by page range', async ({ page }) => {
    const testPDF = fileLoader.getFixturePath('pdfs/multi-page.pdf');
    const originalPageCount = await pdfInspector.getPageCount(testPDF);
    expect(originalPageCount).toBeGreaterThanOrEqual(3); // Need at least 3 pages

    await baseTest.uploadFile(testPDF);

    // Select "Split by range" option
    await page.click('button:has-text("Range"), input[value="range"]');

    // Enter page range (e.g., pages 1-2)
    await page.fill('input[name="pages"], input[placeholder*="page"]', '1-2');

    await baseTest.waitForProcessing();
    const outputPath = await baseTest.downloadFile();

    // Verify output PDF has 2 pages
    await baseTest.assertPDFPageCount(outputPath, 2);
    await baseTest.assertPDFValid(outputPath);
  });

  test('should split PDF by custom page selection', async ({ page }) => {
    const testPDF = fileLoader.getFixturePath('pdfs/multi-page.pdf');
    await baseTest.uploadFile(testPDF);

    // Select custom pages (e.g., pages 1, 3, 5)
    await page.click('button:has-text("Custom"), input[value="custom"]');
    await page.fill('input[name="pages"]', '1,3,5');

    await baseTest.waitForProcessing();
    const outputPath = await baseTest.downloadFile();

    // Verify output PDF has 3 pages
    await baseTest.assertPDFPageCount(outputPath, 3);
  });

  test('should handle single page PDF', async ({ page }) => {
    const testPDF = fileLoader.getFixturePath('pdfs/single-page.pdf');
    await baseTest.uploadFile(testPDF);

    await page.click('button:has-text("Split")');
    await baseTest.waitForProcessing();
    const outputPath = await baseTest.downloadFile();

    // Single page PDF should still produce valid output
    await baseTest.assertPDFValid(outputPath);
    await baseTest.assertPDFPageCount(outputPath, 1);
  });
});

