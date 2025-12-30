import { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Text, Rect, Circle, Line, Transformer, Group } from 'react-konva';
import useImage from 'use-image';
import { Annotation, Tool } from './types';
import Konva from 'konva';

interface PdfCanvasProps {
  pageImage: string;
  width: number;
  height: number;
  pageWidth: number;
  pageHeight: number;
  zoom: number;
  tool: Tool;
  currentPage: number;
  textColor: string;
  textSize: number;
  fontFamily: string;
  highlightColor: string;
  shapeColor: string;
  strokeWidth: number;
  annotations: Annotation[];
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string | null) => void;
  onAddAnnotation: (annotation: Annotation) => void;
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  onDeleteAnnotation: (id: string) => void;
  onToolChange?: (tool: Tool) => void;
}

export default function PdfCanvas({
  pageImage,
  width,
  height,
  pageWidth: _pageWidth,
  pageHeight: _pageHeight,
  zoom,
  tool,
  currentPage,
  textColor,
  textSize,
  fontFamily,
  highlightColor,
  shapeColor,
  strokeWidth,
  annotations,
  selectedAnnotationId,
  onSelectAnnotation,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onToolChange
}: PdfCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [image] = useImage(pageImage);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentShape, setCurrentShape] = useState<{
    type: Tool;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Freeform highlight drawing state
  const [highlightPoints, setHighlightPoints] = useState<number[]>([]);

  // Inline text editing state
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [textareaStyle, setTextareaStyle] = useState<React.CSSProperties>({});

  // Comment popover state
  const [showCommentPopover, setShowCommentPopover] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [commentPopoverPos, setCommentPopoverPos] = useState({ x: 0, y: 0 });

  // Get the annotation being edited
  const editingAnnotation = editingAnnotationId
    ? annotations.find(a => a.id === editingAnnotationId)
    : null;

  // Update transformer when selection changes
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;

    const transformer = transformerRef.current;
    const stage = stageRef.current;

    // Don't show transformer when editing text
    if (editingAnnotationId) {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
      return;
    }

    if (selectedAnnotationId) {
      const node = stage.findOne(`#${selectedAnnotationId}`);
      if (node) {
        transformer.nodes([node]);
        transformer.getLayer()?.batchDraw();
      }
    } else {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
    }
  }, [selectedAnnotationId, editingAnnotationId]);

  /**
   * Start inline text editing
   */
  const startTextEditing = useCallback((annotationId: string) => {
    const annotation = annotations.find(a => a.id === annotationId);
    if (!annotation || annotation.type !== 'text') return;

    // Set editing state
    setEditingAnnotationId(annotationId);
    setEditingText(annotation.text === 'Double-click to edit' ? '' : (annotation.text || ''));
    onSelectAnnotation(annotationId);

    // Calculate textarea position (account for zoom and container offset)
    const stageBox = stageRef.current?.container().getBoundingClientRect();
    if (stageBox) {
      setTextareaStyle({
        position: 'absolute',
        left: `${annotation.x * zoom}px`,
        top: `${annotation.y * zoom}px`,
        width: `${Math.max(200, annotation.width) * zoom}px`,
        minHeight: `${annotation.height * zoom}px`,
        fontSize: `${(annotation.fontSize || 16) * zoom}px`,
        fontFamily: annotation.fontFamily || 'Arial',
        color: annotation.color || '#000000',
        border: '2px solid #00F3FF',
        borderRadius: '4px',
        padding: '4px',
        margin: '0',
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.95)',
        outline: 'none',
        resize: 'none',
        lineHeight: '1.2',
        zIndex: 1000,
      });
    }

    // Focus textarea after render
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }, 10);
  }, [annotations, zoom, onSelectAnnotation]);

  /**
   * Finish text editing
   */
  const finishTextEditing = useCallback(() => {
    if (!editingAnnotationId) return;

    const trimmedText = editingText.trim();

    if (trimmedText === '') {
      // Delete empty annotation
      onDeleteAnnotation(editingAnnotationId);
    } else {
      // Update with new text
      onUpdateAnnotation(editingAnnotationId, { text: trimmedText });
    }

    setEditingAnnotationId(null);
    setEditingText('');

    // Switch to select tool after editing
    if (onToolChange) {
      onToolChange('select');
    }
  }, [editingAnnotationId, editingText, onDeleteAnnotation, onUpdateAnnotation, onToolChange]);

  /**
   * Cancel text editing (ESC)
   */
  const cancelTextEditing = useCallback(() => {
    if (!editingAnnotationId) return;

    const annotation = annotations.find(a => a.id === editingAnnotationId);

    // If it was a new annotation with placeholder or empty, delete it
    if (annotation && (!annotation.text || annotation.text === 'Double-click to edit' || annotation.text.trim() === '')) {
      onDeleteAnnotation(editingAnnotationId);
    }

    setEditingAnnotationId(null);
    setEditingText('');

    if (onToolChange) {
      onToolChange('select');
    }
  }, [editingAnnotationId, annotations, onDeleteAnnotation, onToolChange]);

  /**
   * Handle mouse down - start drawing/adding
   */
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // If editing text, clicking elsewhere finishes editing
    if (editingAnnotationId) {
      finishTextEditing();
      return;
    }

    // If clicking on stage background or the PDF image (not an annotation)
    const isBackground = e.target === e.target.getStage() || e.target.getClassName() === 'Image';

    if (isBackground) {
      // Close any open comment popover
      if (showCommentPopover) {
        setShowCommentPopover(null);
        setCommentInput('');
      }

      onSelectAnnotation(null);

      const pos = e.target.getStage()?.getPointerPosition();
      if (!pos) return;

      // Adjust for zoom
      const adjustedPos = { x: pos.x / zoom, y: pos.y / zoom };

      // Start drawing for shape tools
      if (['rect', 'circle'].includes(tool)) {
        setIsDrawing(true);
        setCurrentShape({
          type: tool,
          x: adjustedPos.x,
          y: adjustedPos.y,
          width: 0,
          height: 0
        });
      } else if (tool === 'highlight') {
        // Start freeform highlight
        setIsDrawing(true);
        setHighlightPoints([adjustedPos.x, adjustedPos.y]);
      } else if (tool === 'text') {
        // Create text annotation and immediately start editing
        const newAnnotation: Annotation = {
          id: `text_${Date.now()}`,
          type: 'text',
          page: currentPage,
          x: adjustedPos.x,
          y: adjustedPos.y,
          width: 200,
          height: 30,
          text: '',
          fontSize: textSize,
          fontFamily: fontFamily,
          color: textColor,
          createdAt: Date.now()
        };
        onAddAnnotation(newAnnotation);

        // Start editing immediately
        setTimeout(() => {
          startTextEditing(newAnnotation.id);
        }, 10);
      } else if (tool === 'comment') {
        // Show comment input popover
        setCommentPopoverPos({ x: pos.x, y: pos.y });
        setShowCommentPopover('new');
        setCommentInput('');

        // Store position for creating annotation
        setCurrentShape({
          type: 'comment',
          x: adjustedPos.x,
          y: adjustedPos.y,
          width: 32,
          height: 32
        });
      }
    }
  };

  /**
   * Handle mouse move - update drawing shape
   */
  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing) return;

    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    const adjustedPos = { x: pos.x / zoom, y: pos.y / zoom };

    if (tool === 'highlight' && highlightPoints.length > 0) {
      // Add points to freeform highlight path
      setHighlightPoints(prev => [...prev, adjustedPos.x, adjustedPos.y]);
    } else if (currentShape) {
      setCurrentShape({
        ...currentShape,
        width: adjustedPos.x - currentShape.x,
        height: adjustedPos.y - currentShape.y
      });
    }
  };

  /**
   * Handle mouse up - finish drawing
   */
  const handleMouseUp = () => {
    if (!isDrawing) return;

    if (tool === 'highlight' && highlightPoints.length > 4) {
      // Create smooth highlight from freeform path
      // Calculate bounding box
      const xs = highlightPoints.filter((_, i) => i % 2 === 0);
      const ys = highlightPoints.filter((_, i) => i % 2 === 1);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      // Normalize points relative to bounding box
      const normalizedPoints = highlightPoints.map((val, i) =>
        i % 2 === 0 ? val - minX : val - minY
      );

      const newAnnotation: Annotation = {
        id: `highlight_${Date.now()}`,
        type: 'highlight',
        page: currentPage,
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        color: highlightColor,
        fillColor: highlightColor,
        opacity: 0.35,
        strokeWidth: 0,
        points: normalizedPoints,
        createdAt: Date.now()
      };

      onAddAnnotation(newAnnotation);
      onSelectAnnotation(newAnnotation.id);
    } else if (currentShape && ['rect', 'circle'].includes(currentShape.type)) {
      // Only add if shape has some size
      if (Math.abs(currentShape.width) > 5 && Math.abs(currentShape.height) > 5) {
        const newAnnotation: Annotation = {
          id: `${currentShape.type}_${Date.now()}`,
          type: currentShape.type as 'rect' | 'circle',
          page: currentPage,
          x: currentShape.width < 0 ? currentShape.x + currentShape.width : currentShape.x,
          y: currentShape.height < 0 ? currentShape.y + currentShape.height : currentShape.y,
          width: Math.abs(currentShape.width),
          height: Math.abs(currentShape.height),
          color: shapeColor,
          fillColor: undefined,
          opacity: 1,
          strokeWidth: strokeWidth,
          createdAt: Date.now()
        };

        onAddAnnotation(newAnnotation);
        onSelectAnnotation(newAnnotation.id);
      }
    }

    setIsDrawing(false);
    setCurrentShape(null);
    setHighlightPoints([]);
  };

  /**
   * Handle creating comment from popover
   */
  const handleCreateComment = () => {
    if (!commentInput.trim() || !currentShape) return;

    const newAnnotation: Annotation = {
      id: `comment_${Date.now()}`,
      type: 'comment',
      page: currentPage,
      x: currentShape.x,
      y: currentShape.y,
      width: 32,
      height: 32,
      text: commentInput.trim(),
      color: '#FFD700',
      createdAt: Date.now()
    };

    onAddAnnotation(newAnnotation);
    setShowCommentPopover(null);
    setCommentInput('');
    setCurrentShape(null);

    if (onToolChange) {
      onToolChange('select');
    }
  };

  /**
   * Handle annotation click
   */
  const handleAnnotationClick = (id: string, e?: Konva.KonvaEventObject<MouseEvent>) => {
    if (tool === 'select') {
      onSelectAnnotation(id);

      // For comments, show the popover
      const annotation = annotations.find(a => a.id === id);
      if (annotation?.type === 'comment' && e) {
        const pos = e.target.getStage()?.getPointerPosition();
        if (pos) {
          setCommentPopoverPos({ x: pos.x, y: pos.y });
          setShowCommentPopover(id);
        }
      }
    }
  };

  /**
   * Handle text double click - start inline editing
   */
  const handleTextDblClick = (id: string) => {
    startTextEditing(id);
  };

  /**
   * Handle annotation drag
   */
  const handleAnnotationDragEnd = (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    onUpdateAnnotation(id, {
      x: node.x(),
      y: node.y()
    });
  };

  /**
   * Handle annotation transform
   */
  const handleAnnotationTransformEnd = (id: string, e: Konva.KonvaEventObject<Event>) => {
    const node = e.target as Konva.Shape;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale
    node.scaleX(1);
    node.scaleY(1);

    onUpdateAnnotation(id, {
      x: node.x(),
      y: node.y(),
      width: Math.max(5, node.width() * scaleX),
      height: Math.max(5, node.height() * scaleY),
      rotation: node.rotation()
    });
  };

  /**
   * Handle keyboard events
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If editing text, handle text-specific keys
      if (editingAnnotationId) {
        if (e.key === 'Escape') {
          e.preventDefault();
          cancelTextEditing();
        }
        return; // Don't process other shortcuts while editing
      }

      // Tool shortcuts (only when not editing)
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'v':
            onToolChange?.('select');
            break;
          case 't':
            onToolChange?.('text');
            break;
          case 'h':
            onToolChange?.('highlight');
            break;
          case 'r':
            onToolChange?.('rect');
            break;
          case 'c':
            onToolChange?.('circle');
            break;
          case 'n':
            onToolChange?.('comment');
            break;
          case 'escape':
            onSelectAnnotation(null);
            setShowCommentPopover(null);
            break;
        }
      }

      // Delete selected annotation
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedAnnotationId && !editingAnnotationId) {
          e.preventDefault();
          onDeleteAnnotation(selectedAnnotationId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAnnotationId, editingAnnotationId, onDeleteAnnotation, onSelectAnnotation, onToolChange, cancelTextEditing]);

  /**
   * Get cursor style based on tool
   */
  const getCursorStyle = () => {
    if (editingAnnotationId) return 'text';
    switch (tool) {
      case 'pan': return 'grab';
      case 'select': return 'default';
      case 'text': return 'text';
      case 'highlight': return 'crosshair';
      case 'comment': return 'cell';
      default: return 'crosshair';
    }
  };

  /**
   * Render smooth highlight shape
   */
  const renderHighlight = (annot: Annotation) => {
    if (annot.points && annot.points.length > 4) {
      // Freeform highlight with smooth line
      return (
        <Group key={annot.id}>
          <Line
            id={annot.id}
            x={annot.x}
            y={annot.y}
            points={annot.points}
            stroke={annot.color || highlightColor}
            strokeWidth={(annot.height || 20) * 0.8}
            opacity={annot.opacity || 0.35}
            lineCap="round"
            lineJoin="round"
            tension={0.5}
            draggable={tool === 'select'}
            onClick={(e) => handleAnnotationClick(annot.id, e)}
            onDragEnd={(e) => handleAnnotationDragEnd(annot.id, e)}
            globalCompositeOperation="multiply"
          />
        </Group>
      );
    } else {
      // Fallback to rectangle highlight with rounded corners
      return (
        <Rect
          key={annot.id}
          id={annot.id}
          x={annot.x}
          y={annot.y}
          width={annot.width}
          height={annot.height}
          fill={annot.fillColor || annot.color || highlightColor}
          stroke="transparent"
          strokeWidth={0}
          opacity={annot.opacity || 0.35}
          cornerRadius={4}
          rotation={annot.rotation || 0}
          draggable={tool === 'select'}
          onClick={(e) => handleAnnotationClick(annot.id, e)}
          onDragEnd={(e) => handleAnnotationDragEnd(annot.id, e)}
          onTransformEnd={(e) => handleAnnotationTransformEnd(annot.id, e)}
          globalCompositeOperation="multiply"
        />
      );
    }
  };

  return (
    <div ref={containerRef} className="relative flex items-center justify-center">
      <Stage
        ref={stageRef}
        width={width * zoom}
        height={height * zoom}
        scaleX={zoom}
        scaleY={zoom}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="shadow-2xl"
        style={{ cursor: getCursorStyle() }}
      >
        {/* Background layer with PDF image */}
        <Layer>
          <KonvaImage
            image={image}
            width={width}
            height={height}
          />
        </Layer>

        {/* Annotations layer */}
        <Layer>
          {annotations.map(annot => {
            // Hide text being edited (show textarea instead)
            if (annot.type === 'text' && annot.id === editingAnnotationId) {
              return null;
            }

            if (annot.type === 'text') {
              return (
                <Text
                  key={annot.id}
                  id={annot.id}
                  x={annot.x}
                  y={annot.y}
                  text={annot.text || ''}
                  fontSize={annot.fontSize || 16}
                  fontFamily={annot.fontFamily || 'Arial'}
                  fill={annot.color || '#000000'}
                  width={annot.width}
                  rotation={annot.rotation || 0}
                  draggable={tool === 'select'}
                  onClick={(e) => handleAnnotationClick(annot.id, e)}
                  onDblClick={() => handleTextDblClick(annot.id)}
                  onDragEnd={(e) => handleAnnotationDragEnd(annot.id, e)}
                  onTransformEnd={(e) => handleAnnotationTransformEnd(annot.id, e)}
                />
              );
            } else if (annot.type === 'highlight') {
              return renderHighlight(annot);
            } else if (annot.type === 'rect') {
              return (
                <Rect
                  key={annot.id}
                  id={annot.id}
                  x={annot.x}
                  y={annot.y}
                  width={annot.width}
                  height={annot.height}
                  fill={annot.fillColor || 'transparent'}
                  stroke={annot.color || '#FF0000'}
                  strokeWidth={annot.strokeWidth || 2}
                  opacity={annot.opacity || 1}
                  rotation={annot.rotation || 0}
                  draggable={tool === 'select'}
                  onClick={(e) => handleAnnotationClick(annot.id, e)}
                  onDragEnd={(e) => handleAnnotationDragEnd(annot.id, e)}
                  onTransformEnd={(e) => handleAnnotationTransformEnd(annot.id, e)}
                />
              );
            } else if (annot.type === 'circle') {
              return (
                <Circle
                  key={annot.id}
                  id={annot.id}
                  x={annot.x + annot.width / 2}
                  y={annot.y + annot.height / 2}
                  radius={Math.min(annot.width, annot.height) / 2}
                  fill={annot.fillColor || 'transparent'}
                  stroke={annot.color || '#FF0000'}
                  strokeWidth={annot.strokeWidth || 2}
                  opacity={annot.opacity || 1}
                  draggable={tool === 'select'}
                  onClick={(e) => handleAnnotationClick(annot.id, e)}
                  onDragEnd={(e) => {
                    const node = e.target;
                    onUpdateAnnotation(annot.id, {
                      x: node.x() - annot.width / 2,
                      y: node.y() - annot.height / 2
                    });
                  }}
                  onTransformEnd={(e) => handleAnnotationTransformEnd(annot.id, e)}
                />
              );
            } else if (annot.type === 'comment') {
              return (
                <Group key={annot.id}>
                  {/* Comment icon background */}
                  <Rect
                    id={annot.id}
                    x={annot.x}
                    y={annot.y}
                    width={32}
                    height={32}
                    fill="#FFD700"
                    cornerRadius={6}
                    shadowBlur={4}
                    shadowColor="rgba(0,0,0,0.3)"
                    shadowOffsetY={2}
                    draggable={tool === 'select'}
                    onClick={(e) => handleAnnotationClick(annot.id, e)}
                    onDragEnd={(e) => handleAnnotationDragEnd(annot.id, e)}
                  />
                  {/* Comment icon */}
                  <Text
                    x={annot.x + 8}
                    y={annot.y + 6}
                    text="💬"
                    fontSize={16}
                    listening={false}
                  />
                </Group>
              );
            }
            return null;
          })}

          {/* Currently drawing highlight (freeform) */}
          {isDrawing && tool === 'highlight' && highlightPoints.length > 2 && (
            <Line
              points={highlightPoints}
              stroke={highlightColor}
              strokeWidth={20}
              opacity={0.4}
              lineCap="round"
              lineJoin="round"
              tension={0.5}
              globalCompositeOperation="multiply"
            />
          )}

          {/* Currently drawing shape (rect/circle) */}
          {isDrawing && currentShape && ['rect', 'circle'].includes(currentShape.type) && (
            <>
              {currentShape.type === 'rect' ? (
                <Rect
                  x={currentShape.width < 0 ? currentShape.x + currentShape.width : currentShape.x}
                  y={currentShape.height < 0 ? currentShape.y + currentShape.height : currentShape.y}
                  width={Math.abs(currentShape.width)}
                  height={Math.abs(currentShape.height)}
                  fill="transparent"
                  stroke={shapeColor}
                  strokeWidth={strokeWidth}
                  dash={[5, 5]}
                />
              ) : (
                <Circle
                  x={currentShape.x + currentShape.width / 2}
                  y={currentShape.y + currentShape.height / 2}
                  radius={Math.abs(Math.min(currentShape.width, currentShape.height) / 2)}
                  fill="transparent"
                  stroke={shapeColor}
                  strokeWidth={strokeWidth}
                  dash={[5, 5]}
                />
              )}
            </>
          )}

          {/* Transformer for selected annotation */}
          <Transformer
            ref={transformerRef}
            borderStroke="#00F3FF"
            borderStrokeWidth={2}
            anchorStroke="#00F3FF"
            anchorFill="#fff"
            anchorSize={8}
            enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
            rotateEnabled={true}
            rotateAnchorOffset={20}
          />
        </Layer>
      </Stage>

      {/* Inline text editing textarea */}
      {editingAnnotationId && editingAnnotation && (
        <textarea
          ref={textareaRef}
          value={editingText}
          onChange={(e) => setEditingText(e.target.value)}
          onBlur={finishTextEditing}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              cancelTextEditing();
            }
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              finishTextEditing();
            }
          }}
          style={textareaStyle}
          placeholder="Type here..."
          autoFocus
        />
      )}

      {/* Comment popover */}
      {showCommentPopover && (
        <div
          className="absolute bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-50"
          style={{
            left: `${commentPopoverPos.x + 10}px`,
            top: `${commentPopoverPos.y + 10}px`,
            minWidth: '250px'
          }}
        >
          {showCommentPopover === 'new' ? (
            <>
              <div className="text-sm font-medium text-gray-700 mb-2">Add Comment</div>
              <textarea
                autoFocus
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleCreateComment();
                  }
                  if (e.key === 'Escape') {
                    setShowCommentPopover(null);
                    setCommentInput('');
                    setCurrentShape(null);
                  }
                }}
                className="w-full p-2 border border-gray-300 rounded text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Enter your comment..."
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => {
                    setShowCommentPopover(null);
                    setCommentInput('');
                    setCurrentShape(null);
                  }}
                  className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateComment}
                  disabled={!commentInput.trim()}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Viewing existing comment */}
              <div className="text-sm font-medium text-gray-700 mb-2">Comment</div>
              <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                {annotations.find(a => a.id === showCommentPopover)?.text}
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => {
                    if (showCommentPopover) {
                      onDeleteAnnotation(showCommentPopover);
                    }
                    setShowCommentPopover(null);
                  }}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                >
                  Delete
                </button>
                <button
                  onClick={() => setShowCommentPopover(null)}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
