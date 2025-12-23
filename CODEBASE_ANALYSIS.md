# Codebase Analysis & Implementation Plan

## Architecture Overview

### Dual-Mode System
The application supports **two modes**:
1. **Desktop Mode (Tauri)**: Uses sidecar Python process via stdin/stdout
2. **Web Mode**: Uses HTTP API (FastAPI) on port 8000

### Communication Flow

#### Desktop Mode (Tauri)
```
Frontend (React) 
  → invoke('invoke_python', {...}) 
  → Rust Bridge (python_bridge.rs)
  → Python Sidecar (main.py via stdin)
  → Python Module (pdf_tools.py/image_tools.py)
  → Response via stdout → Event → Frontend
```

#### Web Mode
```
Frontend (React)
  → fetch('/api/py-invoke', {...})
  → FastAPI (api.py)
  → Python Module (pdf_tools.py/image_tools.py)
  → JSON Response → Frontend
```

---

## 🐛 Critical Bugs & Issues Found

### 1. **API Endpoint Mismatch** ⚠️ CRITICAL
**Location:** `src/hooks/usePython.ts:131`
**Issue:** Frontend calls `/api/py-invoke` but backend doesn't have this endpoint
- `api.py` has: `/pdf_tools/{action}` and `/image_tools/{action}`
- `server.py` has: `/api/pdf/{action}` and `/api/image/{action}`
- Frontend expects: `/api/py-invoke`

**Impact:** Web mode will fail for all operations

**Fix Required:** Add `/api/py-invoke` endpoint to `api.py` OR update frontend to use correct endpoints

---

### 2. **Duplicate API Files** ⚠️ CONFUSION
**Location:** `python-backend/`
**Issue:** Two different API implementations exist:
- `api.py` - Unified API with `/pdf_tools/{action}`
- `server.py` - Legacy API with `/api/pdf/{action}`

**Impact:** Unclear which one is used, potential conflicts

**Fix Required:** Consolidate to one API file or document which is active

---

### 3. **Incomplete Preview Logic** ⚠️ MINOR
**Location:** `python-backend/modules/pdf_tools.py:104-108`
**Issue:** Preview action has incomplete condition check:
```python
if payload.get("watermark_type") or payload.get("text") or payload.get("watermark_file"):
```
Missing proper condition structure (likely should be `if ...:`)

**Impact:** May cause errors in preview mode

---

### 4. **File Path Handling Inconsistency** ⚠️ MEDIUM
**Location:** Multiple files
**Issue:** 
- Desktop mode uses file paths (strings)
- Web mode uses File objects
- Some functions expect paths, others expect files

**Impact:** Potential runtime errors when switching modes

**Fix Required:** Ensure consistent handling in `usePython.ts` and backend modules

---

### 5. **Missing Error Handling in Sign PDF** ⚠️ MEDIUM
**Location:** `python-backend/modules/pdf_tools.py:1218-1283`
**Issue:** `load_p12_certificate` function has incorrect import/usage of `P12Signer`
- Commented code suggests uncertainty about API
- May fail at runtime

**Impact:** PDF signing may not work correctly

---

### 6. **Web API FormData Structure Mismatch** ⚠️ MEDIUM
**Location:** `src/hooks/usePython.ts:112-125` vs `python-backend/api.py:39-93`
**Issue:** 
- Frontend sends: `module`, `action` as separate FormData fields + payload as JSON strings
- Backend expects: `__payload_json` field OR JSON body

**Impact:** Web mode requests may fail to parse correctly

---

### 7. **Timeout Too Short for Large Files** ⚠️ LOW
**Location:** `src/hooks/usePython.ts:96`
**Issue:** 60 second timeout may be insufficient for:
- Large PDF conversions
- OCR operations
- Multiple file processing

**Impact:** Legitimate operations may timeout

---

## 📋 Implementation Plan for Missing Features

### Phase 1: Fix Critical Bugs
1. ✅ Fix API endpoint mismatch
2. ✅ Consolidate API files
3. ✅ Fix preview logic
4. ✅ Standardize file handling

### Phase 2: Implement High-Priority Conversions
1. ✅ WORD to PDF
2. ✅ POWERPOINT to PDF  
3. ✅ EXCEL to PDF
4. ✅ HTML to PDF

### Phase 3: Implement Advanced Features
1. ✅ OCR PDF
2. ✅ PDF to PDF/A

### Phase 4: Frontend Integration
1. ✅ Add UI for new tools
2. ✅ Update tools_config.json
3. ✅ Add translations

---

## 🛠️ Technical Decisions Needed

### Question 1: LibreOffice vs Python Libraries
**For Office conversions (Word/PPT/Excel to PDF):**
- **Option A:** Use LibreOffice headless (best quality, requires installation)
- **Option B:** Use Python libraries (python-docx, python-pptx, openpyxl + reportlab) - limited formatting
- **Option C:** Hybrid - try Python first, fallback to LibreOffice

**Recommendation:** Option C (Hybrid) - Check for LibreOffice, use if available, otherwise use Python libraries with warning

---

### Question 2: OCR Library Choice
**For OCR PDF:**
- **Option A:** Tesseract OCR (pytesseract) - most common, requires binary
- **Option B:** EasyOCR - better accuracy, larger model files
- **Option C:** PaddleOCR - good balance

**Recommendation:** Option A (Tesseract) - Most stable, well-documented, can bundle with app

---

### Question 3: HTML to PDF Library
**For HTML to PDF:**
- **Option A:** WeasyPrint - Pure Python, good CSS support
- **Option B:** Playwright - Better rendering, requires browser binary
- **Option C:** pdfkit + wkhtmltopdf - Requires binary

**Recommendation:** Option A (WeasyPrint) - Pure Python, offline-first, good enough for most cases

---

### Question 4: PDF/A Implementation
**For PDF to PDF/A:**
- **Option A:** pikepdf (already in use) - Can convert to PDF/A-2b
- **Option B:** pypdf + validation - More control
- **Option C:** veraPDF for validation

**Recommendation:** Option A (pikepdf) - Already in dependencies, simpler

---

## 📁 File Structure for New Features

### Backend Changes
```
python-backend/
├── modules/
│   ├── pdf_tools.py          # Add new conversion functions
│   └── office_converter.py   # NEW: Office file conversions
├── api.py                    # Add /api/py-invoke endpoint
└── requirements.txt          # Add new dependencies
```

### Frontend Changes
```
src/
├── pages/
│   └── PdfTools.tsx          # Add new tool modes
├── tools_config.json         # Add new tool entries
└── hooks/
    └── usePython.ts          # Fix API endpoint
```

---

## 🔧 Dependencies to Add

```txt
# OCR
pytesseract>=0.3.10
pdf2image>=1.16.3

# Office Conversions (Python fallback)
python-docx>=1.1.0
python-pptx>=0.6.23
openpyxl>=3.1.2
reportlab>=4.0.0

# HTML to PDF
weasyprint>=60.0

# PDF/A (already have pikepdf)
# No new dependency needed
```

---

## ⚠️ Platform Considerations

### Desktop Mode (Tauri)
- ✅ Can bundle LibreOffice (large ~200MB)
- ✅ Can bundle Tesseract OCR
- ✅ File system access available
- ✅ Can use subprocess for LibreOffice

### Web Mode
- ⚠️ Cannot bundle LibreOffice (too large)
- ⚠️ Cannot bundle Tesseract (requires binary)
- ✅ Can use Python libraries (limited quality)
- ⚠️ May need to warn users about limitations

**Solution:** 
- Desktop: Full features with bundled tools
- Web: Fallback to Python libraries with quality warnings

---

## 🧪 Testing Strategy

### For Each New Feature:
1. ✅ Test in Desktop mode (Tauri)
2. ✅ Test in Web mode (FastAPI)
3. ✅ Test with small files (< 1MB)
4. ✅ Test with large files (> 10MB)
5. ✅ Test error handling (invalid files, missing dependencies)
6. ✅ Test edge cases (empty files, corrupted files)

---

## 📝 Next Steps

1. **Fix API endpoint mismatch** (Critical)
2. **Implement WORD to PDF** (High priority)
3. **Implement POWERPOINT to PDF** (High priority)
4. **Implement EXCEL to PDF** (High priority)
5. **Implement HTML to PDF** (Medium priority)
6. **Implement OCR PDF** (High priority)
7. **Implement PDF to PDF/A** (Medium priority)
8. **Add frontend UI** for all new tools
9. **Test thoroughly** in both modes
10. **Document** any limitations

---

## ❓ Questions for User

1. **LibreOffice Bundle:** Should we bundle LibreOffice with desktop app? (Adds ~200MB but better quality)

2. **OCR Languages:** Which languages should we support for OCR? (English is default, others add size)

3. **Web Limitations:** Should we disable some features in web mode or show warnings?

4. **Error Messages:** How detailed should error messages be? (Technical vs user-friendly)

5. **File Size Limits:** What maximum file size should we support? (Currently seems unlimited)

