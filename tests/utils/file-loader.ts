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
   */
  getFileSize(relativePath: string): number {
    const fullPath = this.getFixturePath(relativePath);
    return fs.statSync(fullPath).size;
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
}

// Singleton instance
export const fileLoader = new FileLoader();

