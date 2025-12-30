# PDF Editor - Desktop Implementation Plan

## 🎯 Project Goal
Build a production-ready desktop PDF editor with annotation capabilities (text, shapes, highlights, comments) using existing Tauri + PyMuPDF + Konva infrastructure.

## 📅 Timeline: 2-3 Weeks (15 working days)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│   React Frontend (PDF Editor)       │
│  - Konva Canvas for Annotations     │
│  - PDF Page Viewer                  │
│  - Toolbar & Navigation              │
└──────────────┬──────────────────────┘
               │ Tauri IPC
┌──────────────▼──────────────────────┐
│   Python Backend (PyMuPDF)          │
│  - Render PDF pages to images       │
│  - Load existing annotations        │
│  - Save annotations to PDF          │
└─────────────────────────────────────┘
```

---

## 📦 Components to Build

### Backend (Python - PyMuPDF)
1. ✅ `render_pdf_page()` - Convert PDF page → base64 image
2. ✅ `get_pdf_info()` - Get page count, dimensions
3. ✅ `load_annotations()` - Read existing PDF annotations
4. ✅ `save_annotations()` - Write annotations to PDF
5. ✅ `export_pdf()` - Export with flattened/editable annotations

### Frontend (React + Konva)
1. ✅ `PdfEditorPage.tsx` - Main editor page
2. ✅ `PdfCanvas.tsx` - Canvas with PDF background + annotations
3. ✅ `PdfToolbar.tsx` - Annotation tools UI
4. ✅ `PdfNavigator.tsx` - Page controls, zoom, thumbnails
5. ✅ `AnnotationLayer.tsx` - Manage annotation objects
6. ✅ `CoordinateMapper.ts` - Canvas ↔ PDF coordinate conversion

---

## 🔨 Development Phases

### PHASE 1: Foundation (Days 1-3)
**Goal:** PDF rendering and navigation

#### Day 1: Backend PDF Rendering
- [ ] Create `/api/pdf/editor/render` endpoint
- [ ] Implement page rendering with configurable DPI
- [ ] Return base64 encoded images
- [ ] Add page info endpoint (dimensions, count)

#### Day 2: Frontend PDF Viewer
- [ ] Create PdfEditorPage.tsx route
- [ ] Load PDF file via Tauri dialog
- [ ] Display PDF page as image
- [ ] Basic page navigation (next/prev)

#### Day 3: Navigation UI
- [ ] Page number display & input
- [ ] Zoom controls (fit, 50%, 100%, 150%, 200%)
- [ ] Keyboard shortcuts (arrows, +/-)
- [ ] Page thumbnails sidebar

---

### PHASE 2: Annotation Tools (Days 4-9)

#### Day 4: Canvas Foundation
- [ ] Adapt StudioCanvas for PDF editing
- [ ] Add PDF page as background layer
- [ ] Implement coordinate mapping utility
- [ ] Test canvas positioning

#### Day 5: Text Annotations
- [ ] Text tool button in toolbar
- [ ] Click to add text box (Konva Text)
- [ ] Editable text on double-click
- [ ] Font size, color, style controls
- [ ] Position, resize, rotate

#### Day 6: Highlight Tool
- [ ] Highlight tool button
- [ ] Click-drag to create highlight rectangle
- [ ] Semi-transparent yellow/green/red colors
- [ ] Opacity control
- [ ] Delete highlights

#### Day 7: Shape Tools
- [ ] Rectangle tool (border + fill)
- [ ] Circle/Ellipse tool
- [ ] Line tool with arrow options
- [ ] Color picker for stroke/fill
- [ ] Width controls

#### Day 8: Comments/Notes
- [ ] Comment tool (sticky note icon)
- [ ] Click to place comment marker
- [ ] Popup text input dialog
- [ ] Display comment count badge
- [ ] Click to view/edit comment

#### Day 9: Annotation Management
- [ ] Annotation list sidebar
- [ ] Select annotation from list
- [ ] Delete selected annotation
- [ ] Annotation properties panel
- [ ] Undo/Redo stack

---

### PHASE 3: Persistence (Days 10-12)

#### Day 10: Backend Save Logic
- [ ] Create `/api/pdf/editor/save` endpoint
- [ ] Convert canvas annotations → PyMuPDF annotations
  - FreeText for text boxes
  - Highlight for highlights
  - Square/Circle for shapes
  - Text for comments
- [ ] Save to new PDF file
- [ ] Return success/error

#### Day 11: Frontend Save/Export
- [ ] "Save" button in toolbar
- [ ] Convert Konva objects to annotation JSON
- [ ] Send to backend via API
- [ ] Download saved PDF
- [ ] "Save As" dialog

#### Day 12: Load Existing Annotations
- [ ] Backend: Read existing annotations from PDF
- [ ] Convert PyMuPDF annotations → JSON
- [ ] Frontend: Render loaded annotations on canvas
- [ ] Edit loaded annotations

---

### PHASE 4: Polish & Production (Days 13-15)

#### Day 13: UI/UX Polish
- [ ] Consistent styling with existing tools
- [ ] Loading states & progress indicators
- [ ] Error handling & user feedback
- [ ] Tooltips & keyboard shortcuts help
- [ ] Responsive layout

#### Day 14: Testing & Bug Fixes
- [ ] Test with various PDF files (small, large, complex)
- [ ] Test all annotation types
- [ ] Test save/load workflow
- [ ] Test multi-page PDFs (10+ pages)
- [ ] Edge cases (rotated pages, different sizes)

#### Day 15: Documentation & Release
- [ ] User guide for PDF editor
- [ ] Code comments & documentation
- [ ] Add to tools catalog
- [ ] Create demo video/screenshots
- [ ] Production build & test

---

## 🎨 UI Design (Wireframe)

```
┌────────────────────────────────────────────────────────────┐
│  PDF Editor                                    [- □ ✕]     │
├────────────────────────────────────────────────────────────┤
│  [📁 Open] [💾 Save] [↶ Undo] [↷ Redo]  │  Page 1 of 10   │
│  ────────────────────────────────────────────────────────  │
│  [T Text] [⬛ Rect] [⚫ Circle] [✏️ Highlight] [💬 Comment]│
├──────┬─────────────────────────────────────────────┬───────┤
│Pages │                                             │ Props │
│      │                                             │       │
│ [1]  │         ┌─────────────────┐                │ Type: │
│ [2]  │         │                 │                │ Text  │
│ [3]  │         │   PDF PAGE      │                │       │
│  .   │         │                 │                │ Font: │
│  .   │         │                 │                │ 12pt  │
│      │         └─────────────────┘                │       │
│      │                                             │ Color:│
│      │         [Zoom: 100%]  [Fit]                │ #000  │
└──────┴─────────────────────────────────────────────┴───────┘
```

---

## 🛠️ Technical Details

### Coordinate Mapping
```typescript
// Canvas uses pixels, PDF uses points (1/72 inch)
const canvasToPdfPoint = (canvasX: number, canvasY: number, pageRect: PDFRect) => {
  const scaleX = pageRect.width / canvasWidth;
  const scaleY = pageRect.height / canvasHeight;
  return {
    x: canvasX * scaleX,
    y: canvasY * scaleY
  };
};
```

### Annotation Data Structure
```typescript
interface Annotation {
  id: string;
  type: 'text' | 'highlight' | 'rect' | 'circle' | 'line' | 'comment';
  page: number;
  // Canvas coordinates
  x: number;
  y: number;
  width?: number;
  height?: number;
  // Properties
  text?: string;
  color?: string;
  opacity?: number;
  fontSize?: number;
  // PDF coordinates (calculated on save)
  pdfRect?: { x: number; y: number; width: number; height: number };
}
```

### PyMuPDF Annotation Mapping
```python
# Text box → FreeText annotation
page.add_freetext_annot(rect, text, fontsize=12, color=(0,0,0))

# Highlight → Highlight annotation
page.add_highlight_annot(rect)

# Rectangle → Square annotation
page.add_rect_annot(rect)

# Circle → Circle annotation
page.add_circle_annot(rect)

# Comment → Text annotation (popup)
page.add_text_annot(point, text)
```

---

## 📋 File Structure

```
offline-tools/
├── src/
│   ├── pages/
│   │   └── PdfEditor.tsx          # Main editor page
│   ├── components/
│   │   ├── PdfEditor/
│   │   │   ├── PdfCanvas.tsx      # Canvas with annotations
│   │   │   ├── PdfToolbar.tsx     # Tool buttons
│   │   │   ├── PdfNavigator.tsx   # Page navigation
│   │   │   ├── PdfThumbnails.tsx  # Page thumbnails
│   │   │   ├── AnnotationPanel.tsx # Properties panel
│   │   │   └── types.ts           # TypeScript types
│   │   └── ...
│   └── lib/
│       └── pdf-coordinates.ts     # Coordinate conversion utils
│
├── python-backend/
│   ├── modules/
│   │   └── pdf_editor.py          # New module for editor
│   └── api.py                     # Add editor endpoints
│
└── src/tools_config.json          # Add PDF Editor tool
```

---

## 🔑 Key Features

### Must-Have (MVP)
- ✅ Add text annotations
- ✅ Add highlights (yellow/green/red)
- ✅ Add shapes (rectangle, circle)
- ✅ Multi-page support
- ✅ Save annotations to PDF
- ✅ Zoom & navigation
- ✅ Undo/Redo

### Nice-to-Have (Future)
- ⏸️ Sticky note comments with popups
- ⏸️ Free-hand drawing
- ⏸️ Stamp annotations
- ⏸️ Search text to highlight
- ⏸️ Collaboration (multiple users)

---

## 🧪 Testing Checklist

### Functionality
- [ ] Open various PDF files (1-page, multi-page, complex)
- [ ] Add text annotations (various fonts, sizes, colors)
- [ ] Add highlights (different colors, opacity)
- [ ] Add shapes (rectangles, circles, lines)
- [ ] Navigate between pages
- [ ] Zoom in/out without breaking annotations
- [ ] Save annotations to PDF
- [ ] Open saved PDF and verify annotations persist
- [ ] Edit existing annotations
- [ ] Delete annotations
- [ ] Undo/Redo operations

### Performance
- [ ] Large PDFs (100+ pages) load without freezing
- [ ] Page rendering is fast (<2 seconds per page)
- [ ] Smooth zooming and panning
- [ ] No memory leaks with many annotations

### Edge Cases
- [ ] Rotated pages (90°, 180°, 270°)
- [ ] Different page sizes in same PDF
- [ ] Encrypted/password-protected PDFs
- [ ] Corrupted PDFs (graceful error)
- [ ] Very large pages (A0 size)
- [ ] Very small pages (business card)

---

## 🚀 Deployment

### Desktop Build
```bash
# Build Python backend
pyinstaller python-backend/main.py --onefile

# Build Tauri app
npm run tauri build

# Output: installers in src-tauri/target/release/bundle/
```

### Tools Config
```json
{
  "id": "pdf-editor",
  "name": "PDF Editor",
  "description": "Edit PDFs by adding text, shapes, highlights, and comments. Secure offline editing.",
  "icon": "file-edit",
  "category": "pdf",
  "route": "/pdf-editor"
}
```

---

## 📚 Resources

- PyMuPDF Docs: https://pymupdf.readthedocs.io/
- Konva Docs: https://konvajs.org/docs/
- React-Konva: https://github.com/konvajs/react-konva
- Tauri IPC: https://tauri.app/v1/guides/features/command

---

## ✅ Success Criteria

1. ✅ User can open any PDF file
2. ✅ User can add text, highlights, shapes to any page
3. ✅ User can save edited PDF with annotations
4. ✅ Annotations persist when PDF is reopened
5. ✅ Works smoothly with 50+ page PDFs
6. ✅ No data loss or corruption
7. ✅ Intuitive UI matching existing tool design

---

**Let's start building! 🚀**
