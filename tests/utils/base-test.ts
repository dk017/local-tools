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
    await this.page.goto(`/${locale}/tools/${toolSlug}`, { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    // Wait for page to be interactive, but don't wait for networkidle (can be slow)
    await this.page.waitForLoadState('domcontentloaded');
    // Give it a moment for any async content
    await this.page.waitForTimeout(1000);
  }

  /**
   * Upload a file using the file input
   * Handles react-dropzone hidden input
   */
  async uploadFile(filePath: string, inputSelector: string = 'input[type="file"]'): Promise<void> {
    // Wait for file input to be available (react-dropzone creates hidden input)
    const input = this.page.locator(inputSelector).first();
    await input.waitFor({ state: 'attached', timeout: 30000 }); // Increase timeout
    await input.setInputFiles(filePath);
    
    // Wait a moment for file to be processed by dropzone
    await this.page.waitForTimeout(1000);
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(filePaths: string[], inputSelector: string = 'input[type="file"]'): Promise<void> {
    const input = this.page.locator(inputSelector).first();
    await input.waitFor({ state: 'attached', timeout: 30000 }); // Increase timeout
    await input.setInputFiles(filePaths);
    
    // Wait a moment for files to be processed
    await this.page.waitForTimeout(1000);
  }

  /**
   * Wait for processing to complete
   */
  async waitForProcessing(timeout: number = 120000): Promise<void> {
    // Wait for status to change to "processing" (if it appears)
    // The processing state shows a spinner and "Processing" text
    try {
      // Look for the processing spinner or text using locator
      const processingText = this.page.locator('text=/Processing|processing/i').first();
      const spinner = this.page.locator('svg.animate-spin, [class*="animate-spin"]').first();
      await Promise.race([
        processingText.waitFor({ state: 'visible', timeout: 10000 }),
        spinner.waitFor({ state: 'visible', timeout: 10000 })
      ]).catch(() => {
        // Processing indicator might not appear immediately
      });
    } catch {
      // Processing text might not appear, that's okay - file might process quickly
    }
    
    // Wait for status to be "complete" - look for download link/button
    // The complete state shows a download link with href attribute
    // Try multiple selectors until one is found
    const downloadSelectors = [
      'a[href*="/api/"]',           // Download link with API href
      'a[download]',                // Download link with download attribute
      'a:has-text("Download")',     // Download link with "Download" text
      'a:has-text("Download ZIP")', // Download link with "Download ZIP" text
      'button:has-text("Download")', // Download button
    ];
    
    let found = false;
    for (const selector of downloadSelectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: timeout / downloadSelectors.length, state: 'visible' });
        found = true;
        break;
      } catch {
        // Try next selector
        continue;
      }
    }
    
    if (!found) {
      // Last resort: look for "Complete" text or green checkmark
      try {
        await this.page.locator('text=/Complete|complete/i, svg[class*="CheckCircle"]').first().waitFor({ state: 'visible', timeout: 5000 });
      } catch {
        throw new Error('Processing did not complete - download link/button not found');
      }
    }
    
    // Additional wait to ensure download link is clickable
    await this.page.waitForTimeout(1000);
  }

  /**
   * Wait for download button/link to appear
   */
  async waitForDownload(timeout: number = 120000): Promise<string> {
    // Try multiple selectors to find download link/button
    const downloadSelectors = [
      'a[href*="/api/"]',           // Download link with API href
      'a[download]',                // Download link with download attribute
      'a:has-text("Download")',     // Download link with "Download" text
      'a:has-text("Download ZIP")', // Download link with "Download ZIP" text
      'button:has-text("Download")', // Download button
    ];
    
    let downloadButton = null;
    for (const sel of downloadSelectors) {
      try {
        const button = this.page.locator(sel).first();
        await button.waitFor({ state: 'visible', timeout: timeout / downloadSelectors.length });
        downloadButton = button;
        break;
      } catch {
        continue;
      }
    }
    
    if (!downloadButton) {
      throw new Error('Download button/link not found');
    }

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
  async downloadFile(selector?: string): Promise<string> {
    // If specific selector provided, use it
    if (selector) {
      const downloadButton = this.page.locator(selector).first();
      await downloadButton.waitFor({ state: 'visible', timeout: 30000 });
      
      const isDisabled = await downloadButton.isDisabled().catch(() => false);
      if (isDisabled) {
        throw new Error('Download button is disabled');
      }
      
      const [download] = await Promise.all([
        this.page.waitForEvent('download', { timeout: 60000 }),
        downloadButton.click(),
      ]);

      const path = await download.path();
      if (!path) {
        throw new Error('Download failed - no file path');
      }
      return path;
    }
    
    // Try multiple selectors to find download link/button
    const downloadSelectors = [
      'a[href*="/api/"]',           // Download link with API href
      'a[download]',                // Download link with download attribute
      'a:has-text("Download")',     // Download link with "Download" text
      'a:has-text("Download ZIP")', // Download link with "Download ZIP" text
      'button:has-text("Download")', // Download button
    ];
    
    let downloadButton = null;
    for (const sel of downloadSelectors) {
      try {
        const button = this.page.locator(sel).first();
        await button.waitFor({ state: 'visible', timeout: 5000 });
        downloadButton = button;
        break;
      } catch {
        continue;
      }
    }
    
    if (!downloadButton) {
      throw new Error('Download button/link not found');
    }
    
    // Ensure it's not disabled
    const isDisabled = await downloadButton.isDisabled().catch(() => false);
    if (isDisabled) {
      throw new Error('Download button is disabled');
    }
    
    // Get the href if it's a link (for debugging)
    const href = await downloadButton.getAttribute('href').catch(() => null);
    if (href) {
      console.log(`Download link href: ${href}`);
      // Check if href points to pricing (licensing issue)
      if (href.includes('#pricing') || href.includes('/pricing')) {
        throw new Error(`Download link points to pricing page instead of download. This may indicate a licensing/feature gate issue. href: ${href}`);
      }
    }
    
    const [download] = await Promise.all([
      this.page.waitForEvent('download', { timeout: 120000 }), // Increase to 2 minutes
      downloadButton.click(),
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

