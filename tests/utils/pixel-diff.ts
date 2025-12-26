import * as fs from 'fs';
import { ImageValidator } from './image-validator';

/**
 * Pixel Diff Utility
 * 
 * Compares images pixel-by-pixel to detect differences.
 * Useful for validating image processing tools.
 */
export class PixelDiff {
  private imageValidator: ImageValidator;

  constructor() {
    this.imageValidator = new ImageValidator();
  }

  /**
   * Compare two images and calculate difference percentage
   * Returns: { different: boolean, differencePercent: number, diffImagePath?: string }
   */
  async compare(
    image1Path: string,
    image2Path: string,
    threshold: number = 0.01, // 1% difference threshold
    saveDiffImage: boolean = false
  ): Promise<{
    different: boolean;
    differencePercent: number;
    diffImagePath?: string;
  }> {
    try {
      const sharp = await import('sharp');
      const sharpDefault = sharp.default;

      // Load both images
      const img1 = sharpDefault(image1Path);
      const img2 = sharpDefault(image2Path);

      // Get dimensions
      const meta1 = await img1.metadata();
      const meta2 = await img2.metadata();

      if (meta1.width !== meta2.width || meta1.height !== meta2.height) {
        return {
          different: true,
          differencePercent: 100, // Completely different if dimensions don't match
        };
      }

      // Get raw pixel data
      const pixels1 = await img1.raw().toBuffer();
      const pixels2 = await img2.raw().toBuffer();

      if (pixels1.length !== pixels2.length) {
        return {
          different: true,
          differencePercent: 100,
        };
      }

      // Calculate difference
      let diffPixels = 0;
      const totalPixels = pixels1.length / (meta1.channels || 4);

      for (let i = 0; i < pixels1.length; i += meta1.channels || 4) {
        let pixelDiff = false;
        for (let c = 0; c < (meta1.channels || 4); c++) {
          const diff = Math.abs(pixels1[i + c] - pixels2[i + c]);
          if (diff > 1) { // Allow 1 pixel difference for compression artifacts
            pixelDiff = true;
            break;
          }
        }
        if (pixelDiff) {
          diffPixels++;
        }
      }

      const differencePercent = (diffPixels / totalPixels) * 100;
      const different = differencePercent > threshold * 100;

      let diffImagePath: string | undefined;
      if (saveDiffImage && different) {
        // Create a diff image highlighting differences
        diffImagePath = await this.createDiffImage(
          image1Path,
          image2Path,
          meta1.width!,
          meta1.height!,
          meta1.channels || 4
        );
      }

      return {
        different,
        differencePercent,
        diffImagePath,
      };
    } catch (error) {
      throw new Error(`Pixel comparison failed: ${error}`);
    }
  }

  /**
   * Create a visual diff image highlighting differences
   */
  private async createDiffImage(
    image1Path: string,
    image2Path: string,
    width: number,
    height: number,
    channels: number
  ): Promise<string> {
    const sharp = await import('sharp');
    const sharpDefault = sharp.default;

    const pixels1 = await sharpDefault(image1Path).raw().toBuffer();
    const pixels2 = await sharpDefault(image2Path).raw().toBuffer();

    const diffPixels = Buffer.alloc(pixels1.length);

    for (let i = 0; i < pixels1.length; i += channels) {
      let hasDiff = false;
      for (let c = 0; c < channels; c++) {
        const diff = Math.abs(pixels1[i + c] - pixels2[i + c]);
        if (diff > 1) {
          hasDiff = true;
          break;
        }
      }

      if (hasDiff) {
        // Highlight differences in red
        diffPixels[i] = 255; // R
        diffPixels[i + 1] = 0; // G
        diffPixels[i + 2] = 0; // B
        if (channels === 4) {
          diffPixels[i + 3] = 255; // A
        }
      } else {
        // Copy original pixel
        for (let c = 0; c < channels; c++) {
          diffPixels[i + c] = pixels1[i + c];
        }
      }
    }

    const outputPath = `test-results/diff-${Date.now()}.png`;
    await sharpDefault(diffPixels, {
      raw: {
        width,
        height,
        channels: channels as 3 | 4,
      },
    })
      .png()
      .toFile(outputPath);

    return outputPath;
  }

  /**
   * Check if two images are visually similar (within threshold)
   */
  async areSimilar(
    image1Path: string,
    image2Path: string,
    threshold: number = 0.01
  ): Promise<boolean> {
    const result = await this.compare(image1Path, image2Path, threshold);
    return !result.different;
  }
}

export const pixelDiff = new PixelDiff();

