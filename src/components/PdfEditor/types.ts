/**
 * PDF Editor Type Definitions
 */

export type AnnotationType = 'text' | 'highlight' | 'rect' | 'circle' | 'comment';

export interface Annotation {
  id: string;
  type: AnnotationType;
  page: number; // 0-indexed

  // Canvas coordinates (pixels)
  x: number;
  y: number;
  width: number;
  height: number;

  // Common properties
  rotation?: number;
  scaleX?: number;
  scaleY?: number;

  // Text-specific
  text?: string;
  fontSize?: number;
  fontFamily?: string;

  // Color properties
  color?: string; // hex color
  fillColor?: string; // hex color
  opacity?: number;

  // Shape-specific
  strokeWidth?: number;

  // Freeform highlight points (normalized relative to bounding box)
  points?: number[];

  // Metadata
  createdAt?: number;
  modifiedAt?: number;
}

export interface PDFPageInfo {
  pageNum: number;
  width: number;
  height: number;
  rotation: number;
}

export interface PDFInfo {
  pageCount: number;
  pages: PDFPageInfo[];
}

export interface RenderPageResponse {
  image: string; // data URL
  width: number;
  height: number;
  pageWidth: number;
  pageHeight: number;
  dpi: number;
  zoom: number;
}

export type Tool = 'select' | 'text' | 'highlight' | 'rect' | 'circle' | 'comment' | 'pan';

export interface EditorState {
  currentPage: number;
  totalPages: number;
  zoom: number;
  tool: Tool;
  selectedAnnotationId: string | null;
  annotations: Annotation[];
  pdfPath: string | null;
  pdfInfo: PDFInfo | null;
  isLoading: boolean;
  error: string | null;
}

export interface ToolbarProps {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

export interface NavigationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
}

export interface AnnotationProperties {
  annotation: Annotation | null;
  onChange: (updates: Partial<Annotation>) => void;
  onDelete: () => void;
}

/**
 * Web-safe font family options with PDF font name mappings
 */
export const WEB_SAFE_FONTS = [
  { name: 'Arial', value: 'Arial', pdfName: 'helv' },
  { name: 'Times New Roman', value: 'Times New Roman', pdfName: 'times' },
  { name: 'Courier New', value: 'Courier New', pdfName: 'cour' },
  { name: 'Georgia', value: 'Georgia', pdfName: 'times' },
  { name: 'Verdana', value: 'Verdana', pdfName: 'helv' }
] as const;
