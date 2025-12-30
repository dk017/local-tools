import { Type, Palette, Minus, Plus } from 'lucide-react';
import { WEB_SAFE_FONTS, Annotation } from './types';

interface PdfPropertiesPanelProps {
  textColor: string;
  textSize: number;
  fontFamily: string;
  highlightColor: string;
  shapeColor: string;
  strokeWidth: number;
  selectedAnnotation: Annotation | null;
  onTextColorChange: (color: string) => void;
  onTextSizeChange: (size: number) => void;
  onFontFamilyChange: (family: string) => void;
  onHighlightColorChange: (color: string) => void;
  onShapeColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onPropertyChange: (property: string, value: any) => void;
}

const PRESET_COLORS = [
  { name: 'Black', value: '#000000' },
  { name: 'Red', value: '#FF0000' },
  { name: 'Blue', value: '#0000FF' },
  { name: 'Green', value: '#00FF00' },
  { name: 'Yellow', value: '#FFFF00' },
  { name: 'Orange', value: '#FFA500' },
  { name: 'Purple', value: '#800080' },
  { name: 'Pink', value: '#FFC0CB' },
];

export default function PdfPropertiesPanel({
  textColor,
  textSize,
  fontFamily,
  highlightColor,
  shapeColor,
  strokeWidth,
  selectedAnnotation,
  onTextColorChange,
  onTextSizeChange,
  onFontFamilyChange,
  onHighlightColorChange,
  onShapeColorChange,
  onStrokeWidthChange,
  onPropertyChange,
}: PdfPropertiesPanelProps) {
  // Mode detection
  const isSelectionMode = selectedAnnotation !== null;
  const annotType = selectedAnnotation?.type;

  // Get current values based on mode (selected annotation or global defaults)
  const getCurrentTextColor = () =>
    isSelectionMode ? (selectedAnnotation.color || textColor) : textColor;

  const getCurrentTextSize = () =>
    isSelectionMode ? (selectedAnnotation.fontSize || textSize) : textSize;

  const getCurrentFontFamily = () =>
    isSelectionMode ? (selectedAnnotation.fontFamily || fontFamily) : fontFamily;

  const getCurrentHighlightColor = () =>
    isSelectionMode && annotType === 'highlight'
      ? (selectedAnnotation.color || highlightColor)
      : highlightColor;

  const getCurrentShapeColor = () =>
    isSelectionMode && (annotType === 'rect' || annotType === 'circle')
      ? (selectedAnnotation.color || shapeColor)
      : shapeColor;

  const getCurrentStrokeWidth = () =>
    isSelectionMode && (annotType === 'rect' || annotType === 'circle')
      ? (selectedAnnotation.strokeWidth || strokeWidth)
      : strokeWidth;

  return (
    <div className="w-64 border-l border-white/10 p-4 bg-neutral-950 overflow-y-auto">
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
        <Palette size={16} />
        {isSelectionMode ? 'Edit Annotation' : 'Default Properties'}
      </h3>

      {isSelectionMode && (
        <div className="mb-3 p-2 bg-primary/10 border border-primary/20 rounded text-xs">
          Editing: {annotType} annotation
        </div>
      )}

      {/* Text Properties - show if no selection OR selected is text */}
      {(!isSelectionMode || annotType === 'text') && (
        <div className="mb-6">
          <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <Type size={12} />
            Text
          </h4>

          {/* Font Size */}
          <div className="mb-3">
            <label className="text-xs text-muted-foreground block mb-1">Font Size</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const currentSize = getCurrentTextSize();
                  const newSize = Math.max(8, currentSize - 2);
                  isSelectionMode ? onPropertyChange('fontSize', newSize) : onTextSizeChange(newSize);
                }}
                className="p-1 bg-white/5 hover:bg-white/10 rounded transition-colors"
              >
                <Minus size={14} />
              </button>
              <input
                type="number"
                value={getCurrentTextSize()}
                onChange={(e) => {
                  const newSize = Math.max(8, Math.min(72, parseInt(e.target.value) || 16));
                  isSelectionMode ? onPropertyChange('fontSize', newSize) : onTextSizeChange(newSize);
                }}
                className="w-16 px-2 py-1 bg-black/20 border border-white/10 rounded text-center text-sm"
                min="8"
                max="72"
              />
              <button
                onClick={() => {
                  const currentSize = getCurrentTextSize();
                  const newSize = Math.min(72, currentSize + 2);
                  isSelectionMode ? onPropertyChange('fontSize', newSize) : onTextSizeChange(newSize);
                }}
                className="p-1 bg-white/5 hover:bg-white/10 rounded transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Font Family */}
          <div className="mb-3">
            <label className="text-xs text-muted-foreground block mb-1">Font Family</label>
            <select
              value={getCurrentFontFamily()}
              onChange={(e) => {
                isSelectionMode ? onPropertyChange('fontFamily', e.target.value) : onFontFamilyChange(e.target.value);
              }}
              className="w-full px-2 py-1 bg-black/20 border border-white/10 rounded text-sm focus:border-primary outline-none"
            >
              {WEB_SAFE_FONTS.map(font => (
                <option key={font.value} value={font.value}>
                  {font.name}
                </option>
              ))}
            </select>
          </div>

          {/* Text Color */}
          <div className="mb-3">
            <label className="text-xs text-muted-foreground block mb-1">Text Color</label>
            <div className="grid grid-cols-4 gap-1 mb-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => {
                    isSelectionMode ? onPropertyChange('color', color.value) : onTextColorChange(color.value);
                  }}
                  className={`w-full h-8 rounded border-2 transition-all ${
                    getCurrentTextColor() === color.value ? 'border-primary' : 'border-white/20'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
            <input
              type="color"
              value={getCurrentTextColor()}
              onChange={(e) => {
                isSelectionMode ? onPropertyChange('color', e.target.value) : onTextColorChange(e.target.value);
              }}
              className="w-full h-8 rounded cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Highlight Properties - show if no selection OR selected is highlight */}
      {(!isSelectionMode || annotType === 'highlight') && (
        <div className="mb-6">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Highlight</h4>

          <div className="mb-3">
            <label className="text-xs text-muted-foreground block mb-1">Highlight Color</label>
            <div className="grid grid-cols-4 gap-1 mb-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => {
                    isSelectionMode ? onPropertyChange('color', color.value) : onHighlightColorChange(color.value);
                  }}
                  className={`w-full h-8 rounded border-2 transition-all ${
                    getCurrentHighlightColor() === color.value ? 'border-primary' : 'border-white/20'
                  }`}
                  style={{ backgroundColor: color.value, opacity: 0.3 }}
                  title={color.name}
                />
              ))}
            </div>
            <input
              type="color"
              value={getCurrentHighlightColor()}
              onChange={(e) => {
                isSelectionMode ? onPropertyChange('color', e.target.value) : onHighlightColorChange(e.target.value);
              }}
              className="w-full h-8 rounded cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Shape Properties - show if no selection OR selected is rect/circle */}
      {(!isSelectionMode || annotType === 'rect' || annotType === 'circle') && (
        <div className="mb-6">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Shapes</h4>

          {/* Shape Color */}
          <div className="mb-3">
            <label className="text-xs text-muted-foreground block mb-1">Shape Color</label>
            <div className="grid grid-cols-4 gap-1 mb-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => {
                    isSelectionMode ? onPropertyChange('color', color.value) : onShapeColorChange(color.value);
                  }}
                  className={`w-full h-8 rounded border-2 transition-all ${
                    getCurrentShapeColor() === color.value ? 'border-primary' : 'border-white/20'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
            <input
              type="color"
              value={getCurrentShapeColor()}
              onChange={(e) => {
                isSelectionMode ? onPropertyChange('color', e.target.value) : onShapeColorChange(e.target.value);
              }}
              className="w-full h-8 rounded cursor-pointer"
            />
          </div>

          {/* Stroke Width */}
          <div className="mb-3">
            <label className="text-xs text-muted-foreground block mb-1">Stroke Width</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const currentWidth = getCurrentStrokeWidth();
                  const newWidth = Math.max(1, currentWidth - 1);
                  isSelectionMode ? onPropertyChange('strokeWidth', newWidth) : onStrokeWidthChange(newWidth);
                }}
                className="p-1 bg-white/5 hover:bg-white/10 rounded transition-colors"
              >
                <Minus size={14} />
              </button>
              <input
                type="number"
                value={getCurrentStrokeWidth()}
                onChange={(e) => {
                  const newWidth = Math.max(1, Math.min(10, parseInt(e.target.value) || 2));
                  isSelectionMode ? onPropertyChange('strokeWidth', newWidth) : onStrokeWidthChange(newWidth);
                }}
                className="w-16 px-2 py-1 bg-black/20 border border-white/10 rounded text-center text-sm"
                min="1"
                max="10"
              />
              <button
                onClick={() => {
                  const currentWidth = getCurrentStrokeWidth();
                  const newWidth = Math.min(10, currentWidth + 1);
                  isSelectionMode ? onPropertyChange('strokeWidth', newWidth) : onStrokeWidthChange(newWidth);
                }}
                className="p-1 bg-white/5 hover:bg-white/10 rounded transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
