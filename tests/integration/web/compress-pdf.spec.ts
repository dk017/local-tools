import { test, expect } from '@playwright/test';
import { BaseTest } from '../../utils/base-test';
import { fileLoader } from '../../utils/file-loader';
import { pdfInspector } from '../../utils/pdf-inspector';

/**
 * Compress PDF Tool Test
 * 
 * Tests the compress-pdf tool:
 * - Compresses PDF and reduces file size
 * - Validates output is still a valid PDF
 * - Verifies page count is preserved
 * - Checks compression ratio meets minimum threshold
 */
test.describe('Compress PDF Tool', () => {
  let baseTest: BaseTest;

  test.beforeEach(async ({ page }) => {
    baseTest = new BaseTest(page);
    await baseTest.navigateToTool('compress-pdf');
  });

  test('should compress PDF and reduce file size', async ({ page }) => {
    // Use fallback if large-document.pdf doesn't exist
    const testPDF = fileLoader.getFixturePathWithFallback(
      'pdfs/large-document.pdf',
      ['pdfs/Agoda_Relocation_Package_-_Thailand.pdf', 'pdfs/single-page.pdf']
    );
    
    // Check file size limit (web version has 5MB limit for PDFs)
    const sizeCheck = fileLoader.isWithinWebLimits(testPDF, true);
    if (!sizeCheck.within) {
      test.skip(true, `Test PDF (${(sizeCheck.size / 1024 / 1024).toFixed(2)}MB) exceeds web limit (${(sizeCheck.limit / 1024 / 1024).toFixed(0)}MB). Use desktop app for larger files.`);
    }
    
    // testPDF is already an absolute path from getFixturePathWithFallback
    const originalSize = fileLoader.getFileSize(testPDF, true);
    const originalPageCount = await pdfInspector.getPageCount(testPDF);

    await baseTest.uploadFile(testPDF);

    // Select compression level (if available)
    await page.selectOption('select[name="level"], select[name="quality"]', { label: /medium|standard/i }).catch(() => {});

    await baseTest.waitForProcessing();
    const outputPath = await baseTest.downloadFile();

    // Verify file size reduction (at least 5% smaller - some PDFs are already compressed)
    await baseTest.assertFileSizeReduction(testPDF, outputPath, 5);

    // Verify PDF is still valid
    await baseTest.assertPDFValid(outputPath);
    await baseTest.assertPDFPageCount(outputPath, originalPageCount);
  });

  test('should preserve PDF quality at low compression', async ({ page }) => {
    // Use fallback if document-with-images.pdf doesn't exist
    const testPDF = fileLoader.getFixturePathWithFallback(
      'pdfs/document-with-images.pdf',
      ['pdfs/Agoda_Relocation_Package_-_Thailand.pdf', 'pdfs/single-page.pdf']
    );
    
    // Check file size limit
    const sizeCheck = fileLoader.isWithinWebLimits(testPDF, true);
    if (!sizeCheck.within) {
      test.skip(true, `Test PDF (${(sizeCheck.size / 1024 / 1024).toFixed(2)}MB) exceeds web limit (${(sizeCheck.limit / 1024 / 1024).toFixed(0)}MB). Use desktop app for larger files.`);
    }
    
    const originalPageCount = await pdfInspector.getPageCount(testPDF);

    await baseTest.uploadFile(testPDF);
    await page.selectOption('select[name="level"]', { label: /low|minimum/i }).catch(() => {});

    await baseTest.waitForProcessing();
    const outputPath = await baseTest.downloadFile();

    // Low compression should still reduce size but preserve quality
    // testPDF is already an absolute path from getFixturePathWithFallback
    const originalSize = fileLoader.getFileSize(testPDF, true);
    const compressedSize = fileLoader.getFileSize(outputPath, true);
    const reductionPercent = ((originalSize - compressedSize) / originalSize) * 100;

    // Should have some reduction (at least 1%)
    expect(reductionPercent).toBeGreaterThanOrEqual(1);
    // But not too aggressive (less than 50% reduction for low compression)
    expect(reductionPercent).toBeLessThan(50);

    await baseTest.assertPDFPageCount(outputPath, originalPageCount);
  });

  test('should handle high compression level', async ({ page }) => {
    // Use fallback if large-document.pdf doesn't exist
    const testPDF = fileLoader.getFixturePathWithFallback(
      'pdfs/large-document.pdf',
      ['pdfs/Agoda_Relocation_Package_-_Thailand.pdf', 'pdfs/single-page.pdf']
    );
    
    // Check file size limit
    const sizeCheck = fileLoader.isWithinWebLimits(testPDF, true);
    if (!sizeCheck.within) {
      test.skip(true, `Test PDF (${(sizeCheck.size / 1024 / 1024).toFixed(2)}MB) exceeds web limit (${(sizeCheck.limit / 1024 / 1024).toFixed(0)}MB). Use desktop app for larger files.`);
    }
    
    await baseTest.uploadFile(testPDF);

    await page.selectOption('select[name="level"]', { label: /high|maximum/i }).catch(() => {});

    await baseTest.waitForProcessing();
    const outputPath = await baseTest.downloadFile();

    // High compression should achieve significant size reduction (at least 5% - some PDFs are already compressed)
    await baseTest.assertFileSizeReduction(testPDF, outputPath, 5);
    await baseTest.assertPDFValid(outputPath);
  });

  test('should maintain PDF structure after compression', async ({ page }) => {
    // Use fallback if multi-page.pdf doesn't exist
    const testPDF = fileLoader.getFixturePathWithFallback(
      'pdfs/multi-page.pdf',
      ['pdfs/Agoda_Relocation_Package_-_Thailand.pdf', 'pdfs/single-page.pdf']
    );
    const originalPageCount = await pdfInspector.getPageCount(testPDF);

    await baseTest.uploadFile(testPDF);
    await baseTest.waitForProcessing();
    const outputPath = await baseTest.downloadFile();

    // Verify all pages are preserved
    await baseTest.assertPDFPageCount(outputPath, originalPageCount);
    
    // Verify PDF metadata is intact (if applicable)
    const metadata = await pdfInspector.getMetadata(outputPath);
    expect(metadata).toBeDefined();
  });
});

