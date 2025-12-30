/**
 * PDF Coordinate Conversion Utilities
 * Handles conversion between canvas pixels and PDF points
 */

export interface PDFRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasPoint {
  x: number;
  y: number;
}

export interface PDFPoint {
  x: number;
  y: number;
}

/**
 * Convert canvas coordinates (pixels) to PDF coordinates (points)
 * PDF uses points (1/72 inch), canvas uses pixels
 *
 * @param canvasX - X coordinate in canvas pixels
 * @param canvasY - Y coordinate in canvas pixels
 * @param canvasWidth - Canvas width in pixels
 * @param canvasHeight - Canvas height in pixels
 * @param pdfWidth - PDF page width in points
 * @param pdfHeight - PDF page height in points
 * @returns PDF coordinates in points
 */
export function canvasToPdf(
  canvasX: number,
  canvasY: number,
  canvasWidth: number,
  canvasHeight: number,
  pdfWidth: number,
  pdfHeight: number
): PDFPoint {
  const scaleX = pdfWidth / canvasWidth;
  const scaleY = pdfHeight / canvasHeight;

  return {
    x: canvasX * scaleX,
    y: canvasY * scaleY
  };
}

/**
 * Convert PDF coordinates (points) to canvas coordinates (pixels)
 *
 * @param pdfX - X coordinate in PDF points
 * @param pdfY - Y coordinate in PDF points
 * @param canvasWidth - Canvas width in pixels
 * @param canvasHeight - Canvas height in pixels
 * @param pdfWidth - PDF page width in points
 * @param pdfHeight - PDF page height in points
 * @returns Canvas coordinates in pixels
 */
export function pdfToCanvas(
  pdfX: number,
  pdfY: number,
  canvasWidth: number,
  canvasHeight: number,
  pdfWidth: number,
  pdfHeight: number
): CanvasPoint {
  const scaleX = canvasWidth / pdfWidth;
  const scaleY = canvasHeight / pdfHeight;

  return {
    x: pdfX * scaleX,
    y: pdfY * scaleY
  };
}

/**
 * Convert canvas rectangle to PDF rectangle
 */
export function canvasRectToPdf(
  rect: PDFRect,
  canvasWidth: number,
  canvasHeight: number,
  pdfWidth: number,
  pdfHeight: number
): PDFRect {
  const topLeft = canvasToPdf(rect.x, rect.y, canvasWidth, canvasHeight, pdfWidth, pdfHeight);
  const bottomRight = canvasToPdf(
    rect.x + rect.width,
    rect.y + rect.height,
    canvasWidth,
    canvasHeight,
    pdfWidth,
    pdfHeight
  );

  return {
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y
  };
}

/**
 * Convert PDF rectangle to canvas rectangle
 */
export function pdfRectToCanvas(
  rect: PDFRect,
  canvasWidth: number,
  canvasHeight: number,
  pdfWidth: number,
  pdfHeight: number
): PDFRect {
  const topLeft = pdfToCanvas(rect.x, rect.y, canvasWidth, canvasHeight, pdfWidth, pdfHeight);
  const bottomRight = pdfToCanvas(
    rect.x + rect.width,
    rect.y + rect.height,
    canvasWidth,
    canvasHeight,
    pdfWidth,
    pdfHeight
  );

  return {
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y
  };
}
