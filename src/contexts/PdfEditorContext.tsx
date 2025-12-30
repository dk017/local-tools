import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Annotation, Tool, PDFInfo } from '../components/PdfEditor/types';

interface PdfEditorState {
  // File state
  pdfPath: string | null;
  pdfFile: File | null;
  pdfInfo: PDFInfo | null;

  // Page state
  currentPage: number;
  pageImages: Map<number, string>; // Cache rendered page images
  pageWidth: number;
  pageHeight: number;
  canvasWidth: number;
  canvasHeight: number;

  // Editor state
  zoom: number;
  tool: Tool;
  annotations: Annotation[];
  selectedAnnotationId: string | null;

  // History for undo/redo
  history: Annotation[][];
  historyIndex: number;

  // Tool properties
  textColor: string;
  textSize: number;
  fontFamily: string;
  highlightColor: string;
  shapeColor: string;
  strokeWidth: number;
}

interface PdfEditorContextType extends PdfEditorState {
  // Setters
  setPdfPath: (path: string | null) => void;
  setPdfFile: (file: File | null) => void;
  setPdfInfo: (info: PDFInfo | null) => void;
  setCurrentPage: (page: number) => void;
  setPageImage: (page: number, image: string) => void;
  getPageImage: (page: number) => string | undefined;
  setPageDimensions: (pageWidth: number, pageHeight: number, canvasWidth: number, canvasHeight: number) => void;
  setZoom: (zoom: number) => void;
  setTool: (tool: Tool) => void;
  setAnnotations: (annotations: Annotation[]) => void;
  setSelectedAnnotationId: (id: string | null) => void;
  setHistory: (history: Annotation[][]) => void;
  setHistoryIndex: (index: number) => void;
  setTextColor: (color: string) => void;
  setTextSize: (size: number) => void;
  setFontFamily: (family: string) => void;
  setHighlightColor: (color: string) => void;
  setShapeColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;

  // Actions
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Reset
  resetEditor: () => void;
  hasUnsavedChanges: boolean;
}

const initialState: PdfEditorState = {
  pdfPath: null,
  pdfFile: null,
  pdfInfo: null,
  currentPage: 0,
  pageImages: new Map(),
  pageWidth: 0,
  pageHeight: 0,
  canvasWidth: 0,
  canvasHeight: 0,
  zoom: 1.0,
  tool: 'select',
  annotations: [],
  selectedAnnotationId: null,
  history: [],
  historyIndex: -1,
  textColor: '#000000',
  textSize: 16,
  fontFamily: 'Arial',
  highlightColor: '#FFFF00',
  shapeColor: '#FF0000',
  strokeWidth: 2,
};

const PdfEditorContext = createContext<PdfEditorContextType | undefined>(undefined);

export function PdfEditorProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PdfEditorState>(initialState);

  // Basic setters
  const setPdfPath = useCallback((path: string | null) => {
    setState(prev => ({ ...prev, pdfPath: path }));
  }, []);

  const setPdfFile = useCallback((file: File | null) => {
    setState(prev => ({ ...prev, pdfFile: file }));
  }, []);

  const setPdfInfo = useCallback((info: PDFInfo | null) => {
    setState(prev => ({ ...prev, pdfInfo: info }));
  }, []);

  const setCurrentPage = useCallback((page: number) => {
    setState(prev => ({ ...prev, currentPage: page }));
  }, []);

  const setPageImage = useCallback((page: number, image: string) => {
    setState(prev => {
      const newPageImages = new Map(prev.pageImages);
      newPageImages.set(page, image);
      return { ...prev, pageImages: newPageImages };
    });
  }, []);

  const getPageImage = useCallback((page: number) => {
    return state.pageImages.get(page);
  }, [state.pageImages]);

  const setPageDimensions = useCallback((pageWidth: number, pageHeight: number, canvasWidth: number, canvasHeight: number) => {
    setState(prev => ({ ...prev, pageWidth, pageHeight, canvasWidth, canvasHeight }));
  }, []);

  const setZoom = useCallback((zoom: number) => {
    setState(prev => ({ ...prev, zoom }));
  }, []);

  const setTool = useCallback((tool: Tool) => {
    setState(prev => ({ ...prev, tool }));
  }, []);

  const setAnnotations = useCallback((annotations: Annotation[]) => {
    setState(prev => ({ ...prev, annotations }));
  }, []);

  const setSelectedAnnotationId = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, selectedAnnotationId: id }));
  }, []);

  const setHistory = useCallback((history: Annotation[][]) => {
    setState(prev => ({ ...prev, history }));
  }, []);

  const setHistoryIndex = useCallback((index: number) => {
    setState(prev => ({ ...prev, historyIndex: index }));
  }, []);

  const setTextColor = useCallback((color: string) => {
    setState(prev => ({ ...prev, textColor: color }));
  }, []);

  const setTextSize = useCallback((size: number) => {
    setState(prev => ({ ...prev, textSize: size }));
  }, []);

  const setFontFamily = useCallback((family: string) => {
    setState(prev => ({ ...prev, fontFamily: family }));
  }, []);

  const setHighlightColor = useCallback((color: string) => {
    setState(prev => ({ ...prev, highlightColor: color }));
  }, []);

  const setShapeColor = useCallback((color: string) => {
    setState(prev => ({ ...prev, shapeColor: color }));
  }, []);

  const setStrokeWidth = useCallback((width: number) => {
    setState(prev => ({ ...prev, strokeWidth: width }));
  }, []);

  // Annotation actions with history
  const addAnnotation = useCallback((annotation: Annotation) => {
    setState(prev => {
      const newAnnotations = [...prev.annotations, annotation];
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      newHistory.push(newAnnotations);
      return {
        ...prev,
        annotations: newAnnotations,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  }, []);

  const updateAnnotation = useCallback((id: string, updates: Partial<Annotation>) => {
    setState(prev => {
      const newAnnotations = prev.annotations.map(annot =>
        annot.id === id ? { ...annot, ...updates, modifiedAt: Date.now() } : annot
      );
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      newHistory.push(newAnnotations);
      return {
        ...prev,
        annotations: newAnnotations,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  }, []);

  const deleteAnnotation = useCallback((id: string) => {
    setState(prev => {
      const newAnnotations = prev.annotations.filter(annot => annot.id !== id);
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      newHistory.push(newAnnotations);
      return {
        ...prev,
        annotations: newAnnotations,
        selectedAnnotationId: prev.selectedAnnotationId === id ? null : prev.selectedAnnotationId,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  }, []);

  const undo = useCallback(() => {
    setState(prev => {
      if (prev.historyIndex > 0) {
        return {
          ...prev,
          annotations: prev.history[prev.historyIndex - 1],
          historyIndex: prev.historyIndex - 1,
        };
      }
      return prev;
    });
  }, []);

  const redo = useCallback(() => {
    setState(prev => {
      if (prev.historyIndex < prev.history.length - 1) {
        return {
          ...prev,
          annotations: prev.history[prev.historyIndex + 1],
          historyIndex: prev.historyIndex + 1,
        };
      }
      return prev;
    });
  }, []);

  const resetEditor = useCallback(() => {
    setState(initialState);
  }, []);

  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;
  const hasUnsavedChanges = state.annotations.length > 0;

  const value: PdfEditorContextType = {
    ...state,
    setPdfPath,
    setPdfFile,
    setPdfInfo,
    setCurrentPage,
    setPageImage,
    getPageImage,
    setPageDimensions,
    setZoom,
    setTool,
    setAnnotations,
    setSelectedAnnotationId,
    setHistory,
    setHistoryIndex,
    setTextColor,
    setTextSize,
    setFontFamily,
    setHighlightColor,
    setShapeColor,
    setStrokeWidth,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    undo,
    redo,
    canUndo,
    canRedo,
    resetEditor,
    hasUnsavedChanges,
  };

  return (
    <PdfEditorContext.Provider value={value}>
      {children}
    </PdfEditorContext.Provider>
  );
}

export function usePdfEditor() {
  const context = useContext(PdfEditorContext);
  if (context === undefined) {
    throw new Error('usePdfEditor must be used within a PdfEditorProvider');
  }
  return context;
}
