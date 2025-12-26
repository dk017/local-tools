import { Page, expect } from '@playwright/test';
import { FileLoader } from './file-loader';
import { PDFInspector } from './pdf-inspector';
import { ImageValidator } from './image-validator';
import { PixelDiff } from './pixel-diff';

/**
 * Base Test Class
 * 
 * Provides common functionality for all integration tests.
 * Handles file uploads, API calls, and output validation.
 */
export class BaseTest {
  protected page: Page;
  protected fileLoader: FileLoader;
  protected pdfInspector: PDFInspector;
  protected imageValidator: ImageValidator;
  protected pixelDiff: PixelDiff;

  constructor(page: Page) {
    this.page = page;
    this.fileLoader = new FileLoader();
    this.pdfInspector = new PDFInspector();
    this.imageValidator = new ImageValidator();
    this.pixelDiff = new PixelDiff();
  }

  /**
   * Navigate to a tool page
   */
  async navigateToTool(toolSlug: string, locale: string = 'en'): Promise<void> {
    await this.page.goto(`/${locale}/tools/${toolSlug}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Upload a file using the file input
   */
  async uploadFile(filePath: string, inputSelector: string = 'input[type="file"]'): Promise<void> {
    const input = this.page.locator(inputSelector);
    await input.setInputFiles(filePath);
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(filePaths: string[], inputSelector: string = 'input[type="file"]'): Promise<void> {
    const input = this.page.locator(inputSelector);
    await input.setInputFiles(filePaths);
  }

  /**
   * Wait for processing to complete
   */
  async waitForProcessing(timeout: number = 120000): Promise<void> {
    // Wait for processing status to appear and disappear
    await this.page.waitForSelector('text=Processing', { timeout: 10000 }).catch(() => {});
    await this.page.waitForSelector('text=Processing', { state: 'hidden', timeout });
  }

  /**
   * Wait for download button/link to appear
   */
  async waitForDownload(timeout: number = 120000): Promise<string> {
    // Wait for download link/button
    const downloadButton = this.page.locator('a[download], button:has-text("Download"), text=/download/i').first();
    await downloadButton.waitFor({ state: 'visible', timeout });

    // Get download URL
    const href = await downloadButton.getAttribute('href');
    if (href) {
      return href;
    }

    // If no href, trigger download and wait for it
    const [download] = await Promise.all([
      this.page.waitForEvent('download', { timeout }),
      downloadButton.click(),
    ]);

    return download.url();
  }

  /**
   * Download a file from the page
   */
  async downloadFile(selector: string = 'a[download], button:has-text("Download")'): Promise<string> {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.page.locator(selector).first().click(),
    ]);

    const path = await download.path();
    if (!path) {
      throw new Error('Download failed - no file path');
    }

    return path;
  }

  /**
   * Call API directly (for faster testing without UI)
   */
  async callAPI(
    endpoint: string,
    files: string[],
    additionalData: Record<string, any> = {}
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const formData = new FormData();
    
    // Add files
    for (const filePath of files) {
      const fileBuffer = this.fileLoader.readFixture(filePath);
      const fileName = filePath.split('/').pop() || 'file';
      const blob = new Blob([fileBuffer]);
      formData.append('files', blob, fileName);
    }

    // Add additional form data
    for (const [key, value] of Object.entries(additionalData)) {
      formData.append(key, String(value));
    }

    try {
      const response = await this.page.request.post(endpoint, {
        multipart: formData as any,
      });

      if (response.ok()) {
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('application/json')) {
          return { success: true, data: await response.json() };
        } else {
          // Binary response (file download)
          return { success: true, data: await response.body() };
        }
      } else {
        const errorText = await response.text();
        return { success: false, error: errorText };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Assert PDF page count
   */
  async assertPDFPageCount(pdfPath: string, expectedPages: number): Promise<void> {
    const pageCount = await this.pdfInspector.getPageCount(pdfPath);
    expect(pageCount).toBe(expectedPages);
  }

  /**
   * Assert PDF is valid
   */
  async assertPDFValid(pdfPath: string): Promise<void> {
    const isValid = await this.pdfInspector.isValid(pdfPath);
    expect(isValid).toBe(true);
  }

  /**
   * Assert image dimensions
   */
  async assertImageDimensions(
    imagePath: string,
    expectedWidth: number,
    expectedHeight: number,
    tolerance: number = 0
  ): Promise<void> {
    const dimensions = await this.imageValidator.getDimensions(imagePath);
    expect(dimensions.width).toBeGreaterThanOrEqual(expectedWidth - tolerance);
    expect(dimensions.width).toBeLessThanOrEqual(expectedWidth + tolerance);
    expect(dimensions.height).toBeGreaterThanOrEqual(expectedHeight - tolerance);
    expect(dimensions.height).toBeLessThanOrEqual(expectedHeight + tolerance);
  }

  /**
   * Assert image format
   */
  async assertImageFormat(imagePath: string, expectedFormat: string): Promise<void> {
    const format = await this.imageValidator.getFormat(imagePath);
    expect(format.toLowerCase()).toBe(expectedFormat.toLowerCase());
  }

  /**
   * Assert file size reduction (for compression tests)
   */
  async assertFileSizeReduction(
    originalPath: string,
    compressedPath: string,
    minReductionPercent: number = 10
  ): Promise<void> {
    const originalSize = this.fileLoader.getFileSize(originalPath);
    const compressedSize = this.fileLoader.getFileSize(compressedPath);
    const reductionPercent = ((originalSize - compressedSize) / originalSize) * 100;
    
    expect(reductionPercent).toBeGreaterThanOrEqual(minReductionPercent);
  }

  /**
   * Assert images are similar (pixel comparison)
   */
  async assertImagesSimilar(
    image1Path: string,
    image2Path: string,
    threshold: number = 0.01
  ): Promise<void> {
    const result = await this.pixelDiff.compare(image1Path, image2Path, threshold);
    expect(result.different).toBe(false);
  }
}

