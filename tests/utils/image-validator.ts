import * as fs from 'fs';
import { createHash } from 'crypto';

/**
 * Image Validator Utility
 * 
 * Provides methods to validate and inspect image files.
 * Uses sharp for image processing and validation.
 */
export class ImageValidator {
  private sharp: any;

  constructor() {
    // Lazy load sharp to avoid requiring it if not needed
    this.sharp = null;
  }

  private async getSharp() {
    if (!this.sharp) {
      this.sharp = await import('sharp');
    }
    return this.sharp.default;
  }

  /**
   * Get image dimensions (width, height)
   */
  async getDimensions(imagePath: string): Promise<{ width: number; height: number }> {
    try {
      const sharp = await this.getSharp();
      const metadata = await sharp(imagePath).metadata();
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
      };
    } catch (error) {
      throw new Error(`Could not read image dimensions: ${error}`);
    }
  }

  /**
   * Get image format
   */
  async getFormat(imagePath: string): Promise<string> {
    try {
      const sharp = await this.getSharp();
      const metadata = await sharp(imagePath).metadata();
      return metadata.format || 'unknown';
    } catch (error) {
      throw new Error(`Could not read image format: ${error}`);
    }
  }

  /**
   * Get file size in bytes
   */
  getFileSize(imagePath: string): number {
    return fs.statSync(imagePath).size;
  }

  /**
   * Check if image is valid (can be opened and parsed)
   */
  async isValid(imagePath: string): Promise<boolean> {
    try {
      const sharp = await this.getSharp();
      await sharp(imagePath).metadata();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Calculate image hash (for comparison)
   */
  async getImageHash(imagePath: string): Promise<string> {
    const buffer = fs.readFileSync(imagePath);
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Compare two images by dimensions
   */
  async compareDimensions(
    image1Path: string,
    image2Path: string
  ): Promise<{
    sameDimensions: boolean;
    dimensions1: { width: number; height: number };
    dimensions2: { width: number; height: number };
  }> {
    const dims1 = await this.getDimensions(image1Path);
    const dims2 = await this.getDimensions(image2Path);

    return {
      sameDimensions: dims1.width === dims2.width && dims1.height === dims2.height,
      dimensions1: dims1,
      dimensions2: dims2,
    };
  }

  /**
   * Check if image has transparency (alpha channel)
   */
  async hasTransparency(imagePath: string): Promise<boolean> {
    try {
      const sharp = await this.getSharp();
      const metadata = await sharp(imagePath).metadata();
      return metadata.hasAlpha === true;
    } catch {
      return false;
    }
  }

  /**
   * Get image color space
   */
  async getColorSpace(imagePath: string): Promise<string> {
    try {
      const sharp = await this.getSharp();
      const metadata = await sharp(imagePath).metadata();
      return metadata.space || 'unknown';
    } catch {
      return 'unknown';
    }
  }
}

export const imageValidator = new ImageValidator();

