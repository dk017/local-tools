import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft, Save, Loader2, FolderOpen } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { save } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import { API_BASE_URL } from '../config';
import { RenderPageResponse } from '../components/PdfEditor/types';
import PdfToolbar from '../components/PdfEditor/PdfToolbar';
import PdfCanvas from '../components/PdfEditor/PdfCanvas';
import PdfNavigator from '../components/PdfEditor/PdfNavigator';
import PdfPropertiesPanel from '../components/PdfEditor/PdfPropertiesPanel';
import { canvasRectToPdf } from '../lib/pdf-coordinates';
import { usePdfEditor } from '../contexts/PdfEditorContext';

export default function PdfEditorPage() {
  const navigate = useNavigate();

  // Get state from context (persists across navigation)
  const {
    pdfPath,
    pdfFile,
    pdfInfo,
    currentPage,
    pageWidth,
    pageHeight,
    canvasWidth,
    canvasHeight,
    zoom,
    tool,
    annotations,
    selectedAnnotationId,
    textColor,
    textSize,
    fontFamily,
    highlightColor,
    shapeColor,
    strokeWidth,
    canUndo,
    canRedo,
    setPdfPath,
    setPdfFile,
    setPdfInfo,
    setCurrentPage,
    setPageImage,
    getPageImage,
    setPageDimensions,
    setZoom,
    setTool,
    setSelectedAnnotationId,
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
    hasUnsavedChanges,
  } = usePdfEditor();

  // Local UI state (doesn't need to persist)
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Current page image from cache
  const pageImage = getPageImage(currentPage);

  // Derived state - get the currently selected annotation
  const selectedAnnotation = selectedAnnotationId
    ? annotations.find(a => a.id === selectedAnnotationId) || null
    : null;

  /**
   * Open PDF file dialog
   */
  const handleOpenPdf = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'PDF Files',
          extensions: ['pdf']
        }]
      });

      if (selected && typeof selected === 'string') {
        await loadPdf(selected);
      }
    } catch (err) {
      console.error('Error opening file:', err);
      setError('Failed to open PDF file');
    }
  };

  /**
   * Load PDF file and get its info
   */
  const loadPdf = async (filePath: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Read file using Tauri filesystem API
      const fileBytes = await readFile(filePath);
      const blob = new Blob([fileBytes], { type: 'application/pdf' });
      const fileName = filePath.split(/[\\/]/).pop() || 'document.pdf';
      const file = new File([blob], fileName, { type: 'application/pdf' });

      // Store file in context
      setPdfFile(file);

      // Get PDF info
      const formData = new FormData();
      formData.append('file', file);

      const infoResponse = await fetch(`${API_BASE_URL}/api/pdf-editor/info`, {
        method: 'POST',
        body: formData
      });

      const infoData = await infoResponse.json();

      if (infoData.status === 'success') {
        setPdfPath(filePath);
        setPdfInfo(infoData.data);
        setCurrentPage(0);

        // Load first page
        await loadPage(file, 0);

        // Try to load existing annotations
        await loadAnnotations(file);
      } else {
        throw new Error(infoData.error || 'Failed to load PDF info');
      }
    } catch (err) {
      console.error('Error loading PDF:', err);
      setError(err instanceof Error ? err.message : 'Failed to load PDF');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load a specific page
   */
  const loadPage = useCallback(async (file: File, page: number) => {
    // Check cache first
    const cachedImage = getPageImage(page);
    if (cachedImage) {
      setCurrentPage(page);
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('page', page.toString());
      formData.append('dpi', '150');

      const response = await fetch(`${API_BASE_URL}/api/pdf-editor/render`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.status === 'success') {
        const renderData: RenderPageResponse = data.data;
        // Cache the page image
        setPageImage(page, renderData.image);
        setPageDimensions(renderData.pageWidth, renderData.pageHeight, renderData.width, renderData.height);
        setCurrentPage(page);
      } else {
        throw new Error(data.error || 'Failed to render page');
      }
    } catch (err) {
      console.error('Error loading page:', err);
      setError(err instanceof Error ? err.message : 'Failed to load page');
    } finally {
      setIsLoading(false);
    }
  }, [getPageImage, setPageImage, setPageDimensions, setCurrentPage]);

  /**
   * Load existing annotations from PDF
   */
  const loadAnnotations = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/api/pdf-editor/load-annotations`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.status === 'success' && data.data.annotations) {
        // Convert PDF annotations to canvas annotations
        // TODO: Implement conversion
        console.log('Loaded annotations:', data.data.annotations);
      }
    } catch (err) {
      console.error('Error loading annotations:', err);
      // Non-fatal error, just log it
    }
  };

  /**
   * Save annotations to PDF
   */
  const handleSave = async () => {
    if (!pdfFile || annotations.length === 0) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Convert annotations to PDF coordinates
      const pdfAnnotations = annotations.map(annot => {
        const pdfRect = canvasRectToPdf(
          { x: annot.x, y: annot.y, width: annot.width, height: annot.height },
          canvasWidth,
          canvasHeight,
          pageWidth,
          pageHeight
        );

        return {
          page: annot.page,
          type: annot.type,
          x: pdfRect.x,
          y: pdfRect.y,
          width: pdfRect.width,
          height: pdfRect.height,
          text: annot.text,
          color: annot.color,
          fillColor: annot.fillColor,
          opacity: annot.opacity,
          fontSize: annot.fontSize,
          fontFamily: annot.fontFamily,
          strokeWidth: annot.strokeWidth
        };
      });

      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('annotations', JSON.stringify(pdfAnnotations));
      formData.append('flatten', 'false');

      const response = await fetch(`${API_BASE_URL}/api/pdf-editor/save`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to save PDF');
      }

      // Download the file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Ask user where to save
      const savePath = await save({
        defaultPath: 'annotated_document.pdf',
        filters: [{
          name: 'PDF Files',
          extensions: ['pdf']
        }]
      });

      if (savePath) {
        // Download file
        const a = document.createElement('a');
        a.href = url;
        a.download = savePath.split('/').pop() || 'annotated_document.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Show success message
        alert('PDF saved successfully!');
      }
    } catch (err) {
      console.error('Error saving PDF:', err);
      setError(err instanceof Error ? err.message : 'Failed to save PDF');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle property change for selected annotation or global defaults
   */
  const handlePropertyChange = (property: string, value: unknown) => {
    if (selectedAnnotationId) {
      // Update the selected annotation
      updateAnnotation(selectedAnnotationId, { [property]: value });
    } else {
      // Update global defaults
      switch (property) {
        case 'color':
        case 'textColor':
          setTextColor(value as string);
          break;
        case 'fontSize':
          setTextSize(value as number);
          break;
        case 'fontFamily':
          setFontFamily(value as string);
          break;
        case 'highlightColor':
          setHighlightColor(value as string);
          break;
        case 'shapeColor':
          setShapeColor(value as string);
          break;
        case 'strokeWidth':
          setStrokeWidth(value as number);
          break;
      }
    }
  };

  /**
   * Page navigation
   */
  const handlePageChange = async (page: number) => {
    if (!pdfFile) return;
    if (page < 0 || (pdfInfo && page >= pdfInfo.pageCount)) return;

    try {
      await loadPage(pdfFile, page);
    } catch (err) {
      // loadPage handles its own errors, but catch any unhandled ones
      console.error('Unhandled error in page change:', err);
      setError('Failed to navigate to page');
    }
  };

  const handlePrevPage = () => handlePageChange(currentPage - 1);
  const handleNextPage = () => handlePageChange(currentPage + 1);

  /**
   * Stable handler reference for undo/redo keyboard shortcuts
   * Using useCallback with undo/redo as dependencies since they're
   * already memoized in the context provider
   */
  const handleUndoRedoKeyDown = useCallback((e: KeyboardEvent) => {
    // Undo: Ctrl+Z or Cmd+Z
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    }
    // Redo: Ctrl+Shift+Z or Cmd+Shift+Z or Ctrl+Y
    if ((e.ctrlKey || e.metaKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
      e.preventDefault();
      redo();
    }
  }, [undo, redo]);

  /**
   * Global keyboard shortcuts for undo/redo
   */
  useEffect(() => {
    window.addEventListener('keydown', handleUndoRedoKeyDown);
    return () => window.removeEventListener('keydown', handleUndoRedoKeyDown);
  }, [handleUndoRedoKeyDown]);

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <FileText size={24} className="text-primary" />
          <div>
            <h1 className="text-xl font-bold">PDF Editor</h1>
            <p className="text-sm text-muted-foreground">
              {pdfPath ? pdfPath.split(/[\\/]/).pop() : 'No PDF loaded'}
              {hasUnsavedChanges && pdfPath && <span className="text-yellow-500 ml-2">• Unsaved changes</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pdfPath && (
            <button
              onClick={handleOpenPdf}
              className="px-4 py-2 bg-white/5 text-white rounded-lg font-medium hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <FolderOpen size={16} />
              Open Another
            </button>
          )}

          {!pdfPath && (
            <button
              onClick={handleOpenPdf}
              className="px-4 py-2 bg-primary text-black rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Open PDF
            </button>
          )}

          {pdfPath && (
            <button
              onClick={handleSave}
              disabled={isSaving || annotations.length === 0}
              className="px-4 py-2 bg-primary text-black rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save PDF
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 mx-4 mt-4 rounded-lg">
          {error}
        </div>
      )}

      {pdfPath && pdfInfo && (
        <div className="flex h-[calc(100vh-80px)]">
          {/* Toolbar */}
          <div className="w-16 border-r border-white/10">
            <PdfToolbar
              tool={tool}
              onToolChange={setTool}
              onSave={handleSave}
              onUndo={undo}
              onRedo={redo}
              canUndo={canUndo}
              canRedo={canRedo}
              zoom={zoom}
              onZoomChange={setZoom}
            />
          </div>

          {/* Main Canvas Area */}
          <div className="flex-1 flex flex-col">
            {/* Navigation */}
            <div className="border-b border-white/10 p-2">
              <PdfNavigator
                currentPage={currentPage + 1} // Convert to 1-indexed for display
                totalPages={pdfInfo.pageCount}
                onPageChange={(page) => handlePageChange(page - 1)} // Convert back to 0-indexed
                onPrevPage={handlePrevPage}
                onNextPage={handleNextPage}
              />
            </div>

            {/* Canvas */}
            <div className="flex-1 overflow-auto bg-neutral-900 p-8">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 size={48} className="animate-spin text-primary" />
                </div>
              ) : pageImage ? (
                (() => {
                  const filteredAnnotations = annotations.filter(a => a.page === currentPage);
                  return (
                    <PdfCanvas
                      pageImage={pageImage}
                      width={canvasWidth}
                      height={canvasHeight}
                      pageWidth={pageWidth}
                      pageHeight={pageHeight}
                      zoom={zoom}
                      tool={tool}
                      currentPage={currentPage}
                      textColor={textColor}
                      textSize={textSize}
                      fontFamily={fontFamily}
                      highlightColor={highlightColor}
                      shapeColor={shapeColor}
                      strokeWidth={strokeWidth}
                      annotations={filteredAnnotations}
                      selectedAnnotationId={selectedAnnotationId}
                      onSelectAnnotation={setSelectedAnnotationId}
                      onAddAnnotation={addAnnotation}
                      onUpdateAnnotation={updateAnnotation}
                      onDeleteAnnotation={deleteAnnotation}
                      onToolChange={setTool}
                    />
                  );
                })()

              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Click "Open PDF" to start editing
                </div>
              )}
            </div>
          </div>

          {/* Properties Panel */}
          <PdfPropertiesPanel
            textColor={textColor}
            textSize={textSize}
            fontFamily={fontFamily}
            highlightColor={highlightColor}
            shapeColor={shapeColor}
            strokeWidth={strokeWidth}
            selectedAnnotation={selectedAnnotation}
            onTextColorChange={setTextColor}
            onTextSizeChange={setTextSize}
            onFontFamilyChange={setFontFamily}
            onHighlightColorChange={setHighlightColor}
            onShapeColorChange={setShapeColor}
            onStrokeWidthChange={setStrokeWidth}
            onPropertyChange={handlePropertyChange}
          />
        </div>
      )}

      {!pdfPath && !isLoading && (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] text-center">
          <FileText size={64} className="text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">No PDF Loaded</h2>
          <p className="text-muted-foreground mb-6">
            Click "Open PDF" to start editing
          </p>
          <button
            onClick={handleOpenPdf}
            className="px-6 py-3 bg-primary text-black rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            Open PDF
          </button>
        </div>
      )}
    </div>
  );
}
