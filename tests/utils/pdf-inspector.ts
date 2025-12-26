import * as fs from 'fs';
import { execSync } from 'child_process';

/**
 * PDF Inspector Utility
 * 
 * Provides methods to inspect and validate PDF files.
 * Uses pdf-lib for parsing and validation.
 */
export class PDFInspector {
  /**
   * Get page count of a PDF file
   */
  async getPageCount(pdfPath: string): Promise<number> {
    try {
      // Try using pdf-lib (Node.js library)
      const { PDFDocument } = await import('pdf-lib');
      const pdfBytes = fs.readFileSync(pdfPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      return pdfDoc.getPageCount();
    } catch (error) {
      // Fallback: Try using pdftk or pdfinfo if available
      try {
        const output = execSync(`pdfinfo "${pdfPath}"`, { encoding: 'utf-8' });
        const match = output.match(/Pages:\s+(\d+)/);
        if (match) {
          return parseInt(match[1], 10);
        }
      } catch {
        // If pdfinfo not available, try pdftk
        try {
          const output = execSync(`pdftk "${pdfPath}" dump_data`, { encoding: 'utf-8' });
          const match = output.match(/NumberOfPages:\s+(\d+)/);
          if (match) {
            return parseInt(match[1], 10);
          }
        } catch {
          throw new Error(`Could not determine page count. Error: ${error}`);
        }
      }
      throw error;
    }
  }

  /**
   * Extract text from a PDF (first page or all pages)
   */
  async extractText(pdfPath: string, pageNumber?: number): Promise<string> {
    try {
      const { PDFDocument } = await import('pdf-lib');
      const pdfBytes = fs.readFileSync(pdfPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      if (pageNumber !== undefined) {
        const page = pdfDoc.getPage(pageNumber - 1); // 0-indexed
        // Note: pdf-lib doesn't extract text directly, we'd need pdfjs-dist for that
        // For now, return empty string and use pdfjs-dist if needed
        return '';
      }
      
      // For full text extraction, we'd use pdfjs-dist
      return '';
    } catch (error) {
      throw new Error(`Could not extract text from PDF: ${error}`);
    }
  }

  /**
   * Check if PDF is valid (can be opened and parsed)
   */
  async isValid(pdfPath: string): Promise<boolean> {
    try {
      const { PDFDocument } = await import('pdf-lib');
      const pdfBytes = fs.readFileSync(pdfPath);
      await PDFDocument.load(pdfBytes);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get PDF file size in bytes
   */
  getFileSize(pdfPath: string): number {
    return fs.statSync(pdfPath).size;
  }

  /**
   * Check if PDF is password protected
   */
  async isPasswordProtected(pdfPath: string): Promise<boolean> {
    try {
      const { PDFDocument } = await import('pdf-lib');
      const pdfBytes = fs.readFileSync(pdfPath);
      await PDFDocument.load(pdfBytes);
      return false;
    } catch (error: any) {
      // pdf-lib throws specific error for encrypted PDFs
      return error.message?.includes('encrypted') || error.message?.includes('password');
    }
  }

  /**
   * Get PDF metadata
   */
  async getMetadata(pdfPath: string): Promise<{
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
  }> {
    try {
      const { PDFDocument } = await import('pdf-lib');
      const pdfBytes = fs.readFileSync(pdfPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const metadata = {
        title: pdfDoc.getTitle(),
        author: pdfDoc.getAuthor(),
        subject: pdfDoc.getSubject(),
        creator: pdfDoc.getCreator(),
        producer: pdfDoc.getProducer(),
        creationDate: pdfDoc.getCreationDate(),
        modificationDate: pdfDoc.getModificationDate(),
      };
      return metadata;
    } catch (error) {
      throw new Error(`Could not read PDF metadata: ${error}`);
    }
  }

  /**
   * Compare two PDFs page by page (basic check)
   */
  async comparePDFs(pdf1Path: string, pdf2Path: string): Promise<{
    samePageCount: boolean;
    pageCount1: number;
    pageCount2: number;
    sameFileSize: boolean;
    size1: number;
    size2: number;
  }> {
    const pageCount1 = await this.getPageCount(pdf1Path);
    const pageCount2 = await this.getPageCount(pdf2Path);
    const size1 = this.getFileSize(pdf1Path);
    const size2 = this.getFileSize(pdf2Path);

    return {
      samePageCount: pageCount1 === pageCount2,
      pageCount1,
      pageCount2,
      sameFileSize: size1 === size2,
      size1,
      size2,
    };
  }
}

export const pdfInspector = new PDFInspector();

