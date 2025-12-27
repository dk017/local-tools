import * as fs from 'fs';
import * as path from 'path';

/**
 * File Loader Utility
 * 
 * Loads test fixtures (PDFs, images, etc.) from the fixtures directory.
 * Provides helper methods for file operations in tests.
 */
export class FileLoader {
  private fixturesDir: string;

  constructor(fixturesDir: string = path.join(__dirname, '../fixtures')) {
    this.fixturesDir = fixturesDir;
  }

  /**
   * Get the full path to a fixture file
   */
  getFixturePath(relativePath: string): string {
    const fullPath = path.join(this.fixturesDir, relativePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Fixture file not found: ${fullPath}`);
    }
    return fullPath;
  }

  /**
   * Get fixture path with fallback options
   * Tries the primary path first, then falls back to alternatives
   */
  getFixturePathWithFallback(primaryPath: string, fallbackPaths: string[]): string {
    try {
      return this.getFixturePath(primaryPath);
    } catch {
      // Try fallback paths
      for (const fallback of fallbackPaths) {
        try {
          return this.getFixturePath(fallback);
        } catch {
          continue;
        }
      }
      // If all fail, throw error with all attempted paths
      throw new Error(
        `Fixture file not found. Tried: ${primaryPath}, ${fallbackPaths.join(', ')}`
      );
    }
  }

  /**
   * Read a fixture file as a Buffer
   */
  readFixture(relativePath: string): Buffer {
    const fullPath = this.getFixturePath(relativePath);
    return fs.readFileSync(fullPath);
  }

  /**
   * Read a fixture file as base64
   */
  readFixtureBase64(relativePath: string): string {
    const buffer = this.readFixture(relativePath);
    return buffer.toString('base64');
  }

  /**
   * Get file size in bytes
   * Accepts both relative paths (from fixtures) and absolute paths
   */
  getFileSize(filePath: string, isAbsolute: boolean = false): number {
    const fullPath = isAbsolute ? filePath : this.getFixturePath(filePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }
    return fs.statSync(fullPath).size;
  }

  /**
   * Check if file size is within web limits
   * Returns true if file is within limits, false otherwise
   */
  isWithinWebLimits(filePath: string, isAbsolute: boolean = false): { within: boolean; size: number; limit: number; type: 'image' | 'pdf' | 'unknown' } {
    const size = this.getFileSize(filePath, isAbsolute);
    const fullPath = isAbsolute ? filePath : path.join(this.fixturesDir, filePath);
    const ext = path.extname(fullPath).toLowerCase();
    
    // Determine file type
    const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.heic', '.heif'].includes(ext);
    const isPdf = ext === '.pdf';
    
    if (isImage) {
      const limit = 3 * 1024 * 1024; // 3MB
      return { within: size <= limit, size, limit, type: 'image' };
    } else if (isPdf) {
      const limit = 5 * 1024 * 1024; // 5MB
      return { within: size <= limit, size, limit, type: 'pdf' };
    }
    
    return { within: true, size, limit: Infinity, type: 'unknown' };
  }

  /**
   * Save a file to the output directory
   */
  saveOutput(data: Buffer | string, filename: string, outputDir: string = path.join(__dirname, '../test-results/outputs')): string {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, filename);
    if (typeof data === 'string') {
      fs.writeFileSync(outputPath, data, 'base64');
    } else {
      fs.writeFileSync(outputPath, data);
    }
    return outputPath;
  }

  /**
   * Compare two files byte-by-byte
   */
  compareFiles(file1Path: string, file2Path: string): boolean {
    const file1 = fs.readFileSync(file1Path);
    const file2 = fs.readFileSync(file2Path);
    return file1.equals(file2);
  }

  /**
   * Get all fixture files in a directory
   */
  listFixtures(subDir: string = ''): string[] {
    const dir = subDir ? path.join(this.fixturesDir, subDir) : this.fixturesDir;
    if (!fs.existsSync(dir)) {
      return [];
    }
    return fs.readdirSync(dir).map(file => path.join(subDir, file));
  }

  /**
   * Check if a file is a ZIP archive by checking magic number
   */
  isZipFile(filePath: string): boolean {
    try {
      const buffer = fs.readFileSync(filePath);
      // ZIP file signature: PK (0x50 0x4B)
      return buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4B;
    } catch {
      return false;
    }
  }

  /**
   * Check if a file is an image by checking magic numbers
   */
  isImageFile(filePath: string): boolean {
    try {
      const buffer = fs.readFileSync(filePath);
      if (buffer.length < 4) return false;
      
      // PNG: 89 50 4E 47
      if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        return true;
      }
      // JPEG: FF D8 FF
      if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const fileLoader = new FileLoader();

