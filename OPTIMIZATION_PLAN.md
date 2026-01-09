# Desktop App Size Optimization Plan

## Current Situation
- **Current Size**: ~400-500 MB (estimated)
- **Core Value**: 100% offline processing - no data leaves machine
- **Challenge**: Reduce installer size without breaking offline promise

## Size Breakdown Analysis

### Python Backend (~250-400 MB)
1. **OpenCV** (~70-80 MB) - Image upscaling
2. **ONNXRuntime + rembg** (~100-150 MB) - Background removal AI
3. **Tesseract** (~50-60 MB) - OCR
4. **PyMuPDF** (~40-50 MB) - PDF processing
5. **Other libraries** (~50-100 MB) - Pillow, pandas, etc.

### Frontend (~10-20 MB)
- Tauri + React build

## Recommended Strategy: Modular Installer with One-Time Downloads

### Phase 1: Core Installer (Immediate - Week 1)

**Goal**: Reduce base installer to ~150-200 MB

**Changes**:

1. **Remove heavy optional libraries from base bundle**:
   ```python
   # python-backend/requirements.txt
   # Move these to requirements-optional.txt:
   # rembg
   # onnxruntime
   # opencv-contrib-python
   # pytesseract (keep)
   # pdf2image (keep for OCR)
   ```

2. **Update PyInstaller excludes**:
   ```python
   # python-backend.spec line 22
   excludes=[
       'torch', 'torchvision', 'tensorflow', 'tensorboard',
       'matplotlib', 'av', 'moviepy', 'numba', 'llvmlite',
       'notebook', 'ipython', 'tkinter',
       'rembg',  # Add - lazy load instead
       'onnxruntime',  # Add - lazy load instead
       'cv2',  # Add - lazy load instead
   ]
   ```

3. **Keep Tesseract bundled for now** (it's only 50MB and commonly used)

**Result**: Base installer ~150-200 MB (50% reduction!)

---

### Phase 2: Lazy Loading System (Week 2)

**Implement on-demand component downloads**:

#### A. Create Component Manager (Rust)

`src-tauri/src/component_manager.rs`:
```rust
pub struct ComponentManager {
    components_dir: PathBuf,
}

impl ComponentManager {
    pub async fn ensure_component(&self, component: &str) -> Result<(), Error> {
        match component {
            "rembg" => self.download_rembg().await,
            "opencv" => self.download_opencv().await,
            _ => Ok(()),
        }
    }

    async fn download_rembg(&self) -> Result<(), Error> {
        // Download from GitHub releases
        // Extract to components_dir
        // Verify integrity
    }
}
```

#### B. Update Image Tools (Python)

`python-backend/modules/image_tools.py`:
```python
def remove_background(payload):
    # Check if rembg is available
    component_dir = os.path.join(os.path.expanduser("~"), ".local-tools", "components")
    rembg_path = os.path.join(component_dir, "rembg")

    if not os.path.exists(rembg_path):
        return {
            "processed_files": [],
            "errors": [],
            "download_required": {
                "component": "AI Background Removal",
                "size": "180 MB",
                "description": "Required for background removal. Downloads once, works offline forever."
            }
        }

    # Add rembg to sys.path dynamically
    sys.path.insert(0, rembg_path)

    try:
        from rembg import remove, new_session
        # ... existing code
    except ImportError:
        return {"processed_files": [], "errors": ["Failed to load background removal engine."]}
```

#### C. Frontend Download Dialog

`src/components/ComponentDownloadDialog.tsx`:
```typescript
export function ComponentDownloadDialog({ component, size, onDownload }) {
  return (
    <Dialog>
      <h2>Download Required Component</h2>
      <p>{component.description}</p>
      <p>Size: {component.size}</p>
      <p>This is a one-time download. The feature will work offline after installation.</p>
      <Button onClick={onDownload}>Download & Install</Button>
      <Button>Cancel</Button>
    </Dialog>
  );
}
```

**User Flow**:
1. User clicks "Remove Background"
2. Python returns `download_required` in response
3. Frontend shows dialog
4. User confirms → Rust downloads component
5. Component cached forever
6. Feature works offline

---

### Phase 3: Optional Tesseract On-Demand (Week 3)

**Make OCR optional too** (saves another 50MB from base installer):

1. Remove Tesseract from `tauri.conf.json` bundle
2. Download on first OCR use
3. Same pattern as rembg/opencv

**Result**: Base installer now ~100-150 MB!

---

## Alternative: Two-Installer Approach

If lazy loading is too complex, create two installers:

### Local Tools Lite (~150 MB)
- PDF tools (merge, split, compress, convert)
- Image tools (convert, resize, compress, crop)
- PDF Editor (annotate, sign)

### Local Tools Pro (~450 MB)
Everything in Lite plus:
- Background Removal
- Image Upscaling
- OCR

Website shows both, Lite as default.

---

## Quick Wins (Do These Today)

### 1. Better PyInstaller Exclusions

Update `python-backend/python-backend.spec`:

```python
excludes=[
    # Existing
    'torch', 'torchvision', 'tensorflow', 'tensorboard',
    'matplotlib', 'av', 'onnxruntime', 'moviepy',
    'numba', 'llvmlite', 'notebook', 'ipython', 'tkinter',

    # Add these
    'test', 'tests', 'unittest',  # Test frameworks
    'setuptools', 'distutils', 'pip',  # Build tools
    'email', 'html', 'http.server',  # Unused stdlib
    'pydoc', 'doctest',  # Documentation
    'xml.dom', 'xml.sax',  # Unused XML parsers
    'sqlite3',  # If not using
    'asyncio',  # If not using async
]
```

**Potential savings: 20-50 MB**

### 2. UPX Compression

Your spec already has `upx=True` (line 38), but ensure UPX is installed:

```bash
# Windows
choco install upx

# Then rebuild
npm run tauri:build:production
```

**Potential savings: 30-50 MB (10-15% compression)**

### 3. Strip Debug Symbols

Update `python-backend.spec`:

```python
exe = EXE(
    ...
    strip=True,  # Change from False to True (line 37)
    ...
)
```

**Potential savings: 10-20 MB**

### 4. One-File Bundle (Optional)

Current build might be creating multiple files. Single-file is larger but simpler:

```python
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,  # Already included
    a.datas,     # Already included
    ...
    onefile=True,  # Add this
    ...
)
```

---

## Size Comparison

| Approach | Base Installer | After Components | Effort |
|----------|---------------|------------------|--------|
| **Current** | 400-500 MB | 400-500 MB | - |
| **Quick Wins** | 350-400 MB | 350-400 MB | 1 day |
| **Lazy Loading** | 150-200 MB | 400-450 MB | 1 week |
| **Lazy + Tesseract** | 100-150 MB | 400-450 MB | 2 weeks |
| **Two Installers** | 150 MB (Lite)<br>450 MB (Pro) | Same | 3 days |

---

## My Recommendation

**Start with Quick Wins (today), then implement Lazy Loading (next sprint)**:

1. **Today**: Implement Quick Wins → 350-400 MB
2. **Next Week**: Implement lazy loading for rembg/opencv → 150-200 MB base
3. **Later**: Consider making Tesseract optional → 100-150 MB base

**Benefits**:
- ✅ 60% smaller initial download (500MB → 200MB)
- ✅ Still 100% offline after setup
- ✅ Better user experience (faster download)
- ✅ Users only download what they need
- ✅ Maintains your "offline-first" positioning

---

## Implementation Checklist

### Quick Wins (1 day)
- [ ] Update PyInstaller excludes
- [ ] Enable strip=True in spec
- [ ] Install and verify UPX compression
- [ ] Test build size reduction
- [ ] Verify all features still work

### Lazy Loading (1 week)
- [ ] Create component manager in Rust
- [ ] Implement download logic with progress
- [ ] Update Python modules to check for components
- [ ] Create download dialog UI
- [ ] Add component verification/integrity checks
- [ ] Update documentation
- [ ] Test on Windows/Mac/Linux

### Optional: Tesseract On-Demand (3 days)
- [ ] Remove Tesseract from bundle
- [ ] Add to component manager
- [ ] Update OCR feature detection
- [ ] Test OCR download flow

---

## Security Considerations

For downloaded components:
1. **Verify checksums** (SHA256) before extraction
2. **Use HTTPS** for downloads
3. **Fallback mirrors** if GitHub is down
4. **Graceful failure** if download fails
5. **Local storage** in user's app data directory

---

## Next Steps

Let me know which approach you prefer:
1. Quick wins only (simple, 20% reduction)
2. Full lazy loading (complex, 60% reduction)
3. Two-installer approach (medium effort, clear choice for users)

I can implement any of these!
