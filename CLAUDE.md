# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Local Tools** is a dual-platform PDF and image processing application:
- **Desktop App**: Tauri v2 desktop application (Windows/Mac/Linux) with bundled Python backend
- **Web App**: Next.js website with standalone Python FastAPI backend

Both platforms share the same Python processing modules but operate independently.

## Development Commands

### Desktop App (Tauri + React)

```bash
# Development
npm run dev                    # Start Vite dev server only
npm run tauri dev              # Start desktop app in dev mode (auto-starts Vite)

# Building
npm run build                  # Build frontend only (TypeScript + Vite)
npm run tauri build            # Build complete desktop installer
npm run tauri:build            # Bundle Tesseract + build (Windows full build)

# Bundling assets (before production build)
npm run bundle:tesseract:win   # Windows: Bundle Tesseract OCR
npm run bundle:tesseract:unix  # Unix: Bundle Tesseract OCR
```

### Web App (Next.js)

```bash
cd website

# Development
npm run dev                    # Start Next.js dev server on port 3000

# Building
npm run build                  # Production build
npm run start                  # Start production server

# Linting
npm run lint                   # Run ESLint
```

### Python Backend

```bash
cd python-backend

# Development (manual start for web version)
python server.py               # FastAPI server on port 8000 (auto-reload enabled)
python api.py                  # Alternative entry point

# Testing modules directly
python -c "from modules import pdf_tools; print(pdf_tools.__file__)"
```

**Note**: Desktop version auto-starts Python backend as sidecar. Web version requires manual start.

## Architecture

### Dual Platform System

```
┌─────────────────────────────────────────────────────────────────┐
│                     SHARED PYTHON BACKEND                       │
│                   (python-backend/modules/)                     │
│  - pdf_tools.py: PDF operations (merge, split, compress, etc.) │
│  - image_tools.py: Image operations (convert, crop, etc.)      │
│  - pdf_editor.py: PDF annotation (text, shapes, highlights)    │
│  - security.py: Input validation & sanitization                │
│  - licensing.py: Trial/activation management                   │
└─────────────────────────────────────────────────────────────────┘
                    ▲                           ▲
                    │                           │
        ┌───────────┴──────────┐   ┌───────────┴──────────┐
        │   DESKTOP (Tauri)    │   │   WEB (Next.js)      │
        │                      │   │                      │
        │  - Bundles Python    │   │  - Separate Python   │
        │    as sidecar        │   │    server required   │
        │  - No size limits    │   │  - 5MB PDF / 3MB img │
        │  - Offline-capable   │   │  - Online only       │
        │  - File system       │   │  - Upload-based      │
        │    access            │   │                      │
        └──────────────────────┘   └──────────────────────┘
```

### Desktop App Architecture

**Frontend (React + Tauri)**:
- `src/pages/`: Page components (Home, PdfTools, ImageConverter, PdfEditorPage, Settings)
- `src/components/`: Reusable components (Sidebar, ActivationWrapper, PdfEditor/*)
- `src/lib/`: Utilities (pdf-coordinates.ts, file-validation.ts)
- `src/config.ts`: Environment detection (IS_TAURI, API_BASE_URL)

**Backend Bridge (Rust)**:
- `src-tauri/src/lib.rs`: Main app setup, plugin initialization
- `src-tauri/src/python_bridge.rs`: **Critical**: Bidirectional Rust ↔ Python IPC
  - Spawns Python sidecar process on startup
  - Sends JSON commands via stdin
  - Receives JSON responses via stdout (progress + results)
  - Event-based: emits `python-event` to frontend

**Python Sidecar**:
- Bundled as `binaries/python-backend` (PyInstaller executable)
- Auto-started by Tauri, stopped on app exit
- Same codebase as web backend (server.py / api.py)

### Tool Configuration System

**`src/tools_config.json`**: Master configuration for all tools
- Maps URL slugs to tool types and modes
- Used by both desktop and web for routing
- Example: `{"slug": "merge-pdf", "tool": "pdf", "mode": "merge"}`

**Tool Type Detection** (`website/components/OnlineTool/ToolProcessor.tsx`):
- `isPdfTool`: Checks if tool accepts PDFs (exclude `images-to-pdf`)
- `isImageTool`: Checks if tool accepts images (include `images-to-pdf`)
- `getFileTypeName()`: Returns expected file type for validation errors

**Manual Process Tools**: Tools requiring user input before processing
- `watermark-pdf`, `watermark-image`, `reorder-pages`, `organize-pdf`
- Don't auto-process on file upload
- Show configuration UI → user clicks "Process" button

### PDF Editor (Desktop Only)

**Konva Canvas System**:
- `PdfCanvas.tsx`: Main canvas with drawing tools, transformer, event handlers
- `PdfToolbar.tsx`: Tool selection sidebar (select, text, highlight, rect, circle, comment)
- `PdfNavigator.tsx`: Page navigation controls

**Coordinate System**:
- Canvas uses pixels (Konva coordinates)
- PDF uses points (1/72 inch)
- `pdf-coordinates.ts`: Bidirectional conversion utilities
- **Critical**: Always convert before saving to PDF backend

**Backend Integration**:
- `python-backend/modules/pdf_editor.py`:
  - `get_pdf_info()`: Returns page count, dimensions
  - `render_pdf_page()`: Renders page to base64 PNG (150 DPI)
  - `load_annotations()`: Extracts existing PDF annotations
  - `save_annotations()`: Embeds annotations as real PDF objects (PyMuPDF)

### Web App Architecture

**Next.js App Router** (`website/app/[locale]/`):
- Internationalized routing with `next-intl`
- `[locale]/page.tsx`: Homepage
- `[locale]/tools/[slug]/page.tsx`: Individual tool pages
- `[locale]/[...rest]/page.tsx`: Catch-all for undefined routes

**Shared Components**:
- `website/components/OnlineTool/FileUploader.tsx`: Drag-drop file upload
- `website/components/OnlineTool/ToolProcessor.tsx`: **Critical** - Main processing logic
  - Handles all PDF/image tool operations
  - Client-side validation (file type, size, page order format)
  - API communication with Python backend
  - Progress tracking and error handling
  - Manual vs auto-process tool logic

**API Communication**:
- Sends files via `FormData` to `http://localhost:8000/api/{pdf|image}/{action}`
- Python backend returns processed files or ZIP archives
- No persistent storage - all processing is ephemeral

## Key Technical Patterns

### File Type Validation (Multi-Layer)

**Layer 1**: Page-level file acceptance (`website/app/[locale]/tools/[slug]/page.tsx`)
```typescript
// Explicit checks for edge cases like images-to-pdf
if (slug === "images-to-pdf") {
  acceptedTypes = { "image/*": [".png", ".jpg", ".jpeg", ".webp"] };
}
```

**Layer 2**: Component validation (`ToolProcessor.tsx`)
```typescript
const isPdfTool = (toolSlug.includes("pdf") && toolSlug !== "images-to-pdf") || ...;
const isImageTool = ... || toolSlug === "images-to-pdf";
```

**Layer 3**: Backend validation (`python-backend/modules/security.py`)
- Input sanitization (whitelist-based regex)
- File size limits (3MB images, 5MB PDFs for web)
- Page order validation (max 1000 specs, 500 pages per range)

### Input Sanitization Pattern

**Client-side** (before sending to backend):
```typescript
// Example: Reorder pages tool
const sanitized = input.replace(/[^0-9,\-\s]/g, ''); // Whitelist only
const valid = /^[\d\s,\-]+$/.test(sanitized);
```

**Server-side** (`security.py`):
```python
import re
if not re.match(r'^[\d\s,\-]+$', page_order):
    raise ValueError("Invalid format")
```

### Environment Detection

**`src/config.ts`**:
```typescript
export const IS_TAURI = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000';
```

Use `IS_TAURI` to conditionally import Tauri APIs:
```typescript
if (IS_TAURI) {
  const { open } = await import('@tauri-apps/plugin-dialog');
  // Use Tauri file dialog
} else {
  // Use HTML <input type="file">
}
```

### Tauri Sidecar Pattern

**Configuration** (`src-tauri/tauri.conf.json`):
```json
{
  "bundle": {
    "externalBin": ["binaries/python-backend", "binaries/tesseract/tesseract"],
    "resources": ["binaries/tesseract/tessdata/eng.traineddata"]
  }
}
```

**Communication** (JSON over stdin/stdout):
```rust
// Rust sends:
{"request_id": "123", "module": "pdf", "action": "merge", "payload": {...}}

// Python responds:
{"type": "progress", "request_id": "123", "progress": 50, "message": "Merging..."}
{"type": "result", "request_id": "123", "status": "success", "data": {...}}
```

## Common Development Workflows

### Adding a New PDF/Image Tool

1. **Add to `tools_config.json`**: Define slug, tool type, mode
2. **Backend**: Add action handler in `pdf_tools.py` or `image_tools.py`
3. **Frontend (Web)**: Update `ToolProcessor.tsx` if special validation needed
4. **Frontend (Desktop)**: Update `PdfTools.tsx` or `ImageConverter.tsx` mode switch
5. **Test**: Both web (`localhost:3000/tools/{slug}`) and desktop versions

### Modifying Validation Rules

**Always update both client and server**:
1. Client: `ToolProcessor.tsx` or page component
2. Server: `security.py` + specific tool module
3. Test: Valid inputs pass, invalid inputs rejected with clear errors

### Building Desktop Installer

**Full production build**:
```bash
# 1. Bundle Tesseract (required for OCR tools)
npm run bundle:tesseract:win

# 2. Build Tauri app
npm run tauri build

# Output:
# - src-tauri/target/release/bundle/msi/Local Tools_0.1.0_x64_en-US.msi
# - src-tauri/target/release/bundle/nsis/Local Tools_0.1.0_x64-setup.exe
```

**TypeScript errors**: Build fails on unused imports/variables
```typescript
// Fix by using underscore prefix for intentionally unused params
function example(used: string, _unused: number) { ... }
```

### Debugging Python Backend

**Desktop**: Python logs to stderr (visible in terminal running `npm run tauri dev`)

**Web**: Start manually with debug logging:
```bash
cd python-backend
python server.py  # Logs to console
```

Check `python-backend/server_debug.txt` for detailed operation logs.

## Critical Files Reference

**Desktop**:
- `src-tauri/src/python_bridge.rs`: Rust ↔ Python IPC (modify for new Python communication patterns)
- `src/config.ts`: Environment detection (IS_TAURI flag)
- `src/App.tsx`: Route definitions

**Web**:
- `website/components/OnlineTool/ToolProcessor.tsx`: Main processing logic (2700+ lines)
- `website/app/[locale]/tools/[slug]/page.tsx`: Dynamic tool routing

**Shared**:
- `src/tools_config.json`: Master tool configuration
- `python-backend/modules/security.py`: Input validation rules
- `python-backend/modules/pdf_tools.py`: PDF processing (3600+ lines)
- `python-backend/modules/image_tools.py`: Image processing (1800+ lines)

**PDF Editor**:
- `src/pages/PdfEditorPage.tsx`: Main orchestrator
- `src/components/PdfEditor/PdfCanvas.tsx`: Konva canvas + annotation tools
- `src/lib/pdf-coordinates.ts`: Coordinate system conversion
- `python-backend/modules/pdf_editor.py`: Backend annotation handler

## Special Considerations

### Tauri Plugin Imports

Use correct plugin names:
```typescript
import { open, save } from '@tauri-apps/plugin-dialog';
import { openUrl } from '@tauri-apps/plugin-opener';  // NOT 'open'
import { readFile } from '@tauri-apps/plugin-fs';
```

### Bundle Identifier Warning

`tauri.conf.json` has `"identifier": "com.offlinetools.app"` which conflicts with macOS `.app` extension. Consider changing to `com.offlinetools.localtools` for production.

### Large Bundle Size

Current build: 943 KB JavaScript bundle. Not critical for desktop app, but consider code-splitting if targeting web deployment.

### File Size Limits

- **Desktop**: No limits (validation disabled)
- **Web**: 5MB PDF, 3MB images (configurable via env vars)
- Backend enforces limits only for web requests

### Python Module Reloading

`server.py` has module reload logic for development (when `reload=True`). This allows hot-reloading Python modules without restarting Tauri app during development.
