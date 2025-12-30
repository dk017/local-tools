import { MousePointer, Type, Highlighter, Square, Circle, MessageSquare, Hand, Undo, Redo, ZoomIn, ZoomOut } from 'lucide-react';
import { Tool } from './types';

interface PdfToolbarProps {
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

export default function PdfToolbar({
  tool,
  onToolChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  zoom,
  onZoomChange
}: PdfToolbarProps) {
  const tools: Array<{ id: Tool; icon: React.ReactNode; label: string; shortcut?: string }> = [
    { id: 'select', icon: <MousePointer size={20} />, label: 'Select', shortcut: 'V' },
    { id: 'pan', icon: <Hand size={20} />, label: 'Pan', shortcut: 'H' },
    { id: 'text', icon: <Type size={20} />, label: 'Text', shortcut: 'T' },
    { id: 'highlight', icon: <Highlighter size={20} />, label: 'Highlight', shortcut: 'H' },
    { id: 'rect', icon: <Square size={20} />, label: 'Rectangle', shortcut: 'R' },
    { id: 'circle', icon: <Circle size={20} />, label: 'Circle', shortcut: 'C' },
    { id: 'comment', icon: <MessageSquare size={20} />, label: 'Comment', shortcut: 'N' }
  ];

  const zoomLevels = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  const handleZoomIn = () => {
    const currentIndex = zoomLevels.findIndex(z => z >= zoom);
    if (currentIndex < zoomLevels.length - 1) {
      onZoomChange(zoomLevels[currentIndex + 1]);
    }
  };

  const handleZoomOut = () => {
    const currentIndex = zoomLevels.findIndex(z => z >= zoom);
    if (currentIndex > 0) {
      onZoomChange(zoomLevels[currentIndex - 1]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/40 p-2">
      {/* Tools */}
      <div className="flex-1 flex flex-col gap-1">
        {tools.map(t => (
          <button
            key={t.id}
            onClick={() => onToolChange(t.id)}
            className={`p-3 rounded-lg transition-colors relative group ${
              tool === t.id
                ? 'bg-primary text-black'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
            title={`${t.label}${t.shortcut ? ` (${t.shortcut})` : ''}`}
          >
            {t.icon}

            {/* Tooltip */}
            <div className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              {t.label}
              {t.shortcut && <span className="ml-1 text-white/50">{t.shortcut}</span>}
            </div>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="h-px bg-white/10 my-2" />

      {/* Undo/Redo */}
      <div className="flex flex-col gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-3 rounded-lg transition-colors text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed group relative"
          title="Undo (Ctrl+Z)"
        >
          <Undo size={20} />
          <div className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            Undo <span className="text-white/50">Ctrl+Z</span>
          </div>
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-3 rounded-lg transition-colors text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed group relative"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo size={20} />
          <div className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            Redo <span className="text-white/50">Ctrl+Shift+Z</span>
          </div>
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/10 my-2" />

      {/* Zoom */}
      <div className="flex flex-col gap-1">
        <button
          onClick={handleZoomIn}
          disabled={zoom >= 2.0}
          className="p-3 rounded-lg transition-colors text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed group relative"
          title="Zoom In"
        >
          <ZoomIn size={20} />
          <div className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            Zoom In <span className="text-white/50">+</span>
          </div>
        </button>

        <div className="text-center text-xs text-white/50 py-1">
          {Math.round(zoom * 100)}%
        </div>

        <button
          onClick={handleZoomOut}
          disabled={zoom <= 0.5}
          className="p-3 rounded-lg transition-colors text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed group relative"
          title="Zoom Out"
        >
          <ZoomOut size={20} />
          <div className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            Zoom Out <span className="text-white/50">-</span>
          </div>
        </button>
      </div>
    </div>
  );
}
