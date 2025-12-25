# Tool Inventory - Comprehensive Analysis

## Executive Summary

This document provides a complete inventory of all tools available across the Desktop App, Website, and Backend implementation.

### Tool Count Summary

- **Backend Implementation**: 39 PDF tools + 14 Image tools = **53 total**
- **Desktop App**: 27 PDF tools + 13 Image tools = **40 total**
- **Website**: 42 tools listed in `tools.ts`

### Availability Breakdown

- **Tools available in all three**: ~35 tools
- **Backend only (not exposed)**: ~8 tools
- **Desktop only**: ~5 tools
- **Website only**: ~7 tools

---

## PDF Tools Inventory

| Tool Name               | Slug                      | Backend | Desktop | Website | Offline | Notes                                      |
| ----------------------- | ------------------------- | ------- | ------- | ------- | ------- | ------------------------------------------ |
| **ORGANIZE PDF**        |
| Merge PDF               | `merge-pdf`               | ✓       | ✓       | ✓       | ✓       | Available everywhere                       |
| Split PDF               | `split-pdf`               | ✓       | ✓       | ✓       | ✓       | Available everywhere                       |
| Organize PDF            | `organize-pdf`            | ✓       | ✓       | ✓       | ✓       | Reorder pages                              |
| Delete Pages            | `delete-pages`            | ✓       | ✓       | ✗       | ✓       | Missing from website tools.ts              |
| **EDIT PDF**            |
| Rotate PDF              | `rotate-pdf`              | ✓       | ✓       | ✓       | ✓       | Available everywhere                       |
| Crop PDF                | `crop-pdf`                | ✓       | ✓       | ✓       | ✓       | Available everywhere                       |
| Watermark PDF           | `watermark-pdf`           | ✓       | ✓       | ✓       | ✓       | Available everywhere                       |
| Add Page Numbers        | `page-numbers`            | ✓       | ✓       | ✗       | ✓       | Missing from website tools.ts              |
| **CONVERT PDF**         |
| PDF to Word             | `pdf-to-word`             | ✓       | ✓       | ✓       | ✓       | Available everywhere                       |
| PDF to Images           | `pdf-to-images`           | ✓       | ✓       | ✓       | ✓       | Available everywhere                       |
| Images to PDF           | `images-to-pdf`           | ✓       | ✓       | ✓       | ✓       | Available everywhere                       |
| Word to PDF             | `word-to-pdf`             | ✓       | ✓       | ✓       | ✓       | Available everywhere                       |
| PowerPoint to PDF       | `powerpoint-to-pdf`       | ✓       | ✓       | ✓       | ✓       | Available everywhere                       |
| Excel to PDF            | `excel-to-pdf`            | ✓       | ✓       | ✓       | ✓       | Available everywhere                       |
| HTML to PDF             | `html-to-pdf`             | ✓       | ✓       | ✓       | ✓       | Available everywhere                       |
| OCR PDF                 | `ocr-pdf`                 | ✓       | ✓       | ✓       | ✓       | Available everywhere                       |
| PDF to PDF/A            | `pdf-to-pdfa`             | ✓       | ✓       | ✓       | ✓       | Available everywhere                       |
| **OPTIMIZE PDF**        |
| Compress PDF            | `compress-pdf`            | ✓       | ✓       | ✓       | ✓       | Available everywhere                       |
| Repair PDF              | `repair-pdf`              | ✓       | ✓       | ✓       | ✓       | Available everywhere                       |
| Grayscale PDF           | `grayscale-pdf`           | ✓       | ✓       | ✓       | ✓       | Available everywhere                       |
| Web Optimize            | `pdf-web-optimize`        | ✓       | ✓       | ✓       | ✓       | Available everywhere                       |
| **SECURITY PDF**        |
| Protect PDF             | `protect-pdf`             | ✓       | ✓       | ✓       | ✓       | Available everywhere                       |
| Unlock PDF              | `unlock-pdf`              | ✓       | ✓       | ✓       | ✓       | Available everywhere                       |
| Remove Metadata         | `remove-metadata`         | ✓       | ✓       | ✗       | ✗       | Backend: `remove_metadata`, not in website |
| Privacy Scrubber        | `pdf-scrubber`            | ✓       | ✓       | ✓       | ✓       | Available everywhere                       |
| Secure Redactor         | `pdf-redactor`            | ✓       | ✓       | ✓       | ✓       | Available everywhere                       |
| Digital Signer          | `pdf-signer`              | ✓       | ✓       | ✓       | ✓       | Available everywhere                       |
| Flatten PDF             | `flatten-pdf`             | ✓       | ✓       | ✗       | ✗       | Backend only, not exposed                  |
| **EXTRACT PDF**         |
| Extract Text            | `extract-text`            | ✓       | ✓       | ✗       | ✓       | Missing from website                       |
| Extract Tables          | `extract-tables`          | ✓       | ✓       | ✓       | ✓       | Available everywhere                       |
| Extract Images from PDF | `extract-images-from-pdf` | ✓       | ✓       | ✓       | ✓       | Available everywhere                       |
| **ADVANCED PDF**        |
| Visual PDF Diff         | `pdf-diff`                | ✓       | ✓       | ✓       | ✓       | Available everywhere                       |
| Booklet Maker           | `booklet-maker`           | ✓       | ✓       | ✓       | ✓       | Available everywhere                       |
| Preview PDF             | `preview-pdf`             | ✓       | ✗       | ✗       | ✗       | Backend only, internal use                 |

---

## Image Tools Inventory

| Tool Name             | Slug                      | Backend | Desktop | Website | Offline | Notes                                                           |
| --------------------- | ------------------------- | ------- | ------- | ------- | ------- | --------------------------------------------------------------- |
| **CONVERT IMAGE**     |
| Convert Image         | `convert-image`           | ✓       | ✓       | ✓       | ✓       | Format conversion (JPG/PNG/WebP)                                |
| HEIC to JPG           | `heic-to-jpg`             | ✓       | ✓       | ✓       | ✓       | Available everywhere                                            |
| **EDIT IMAGE**        |
| Resize Image          | `resize-image`            | ✓       | ✓       | ✓       | ✓       | Available everywhere                                            |
| Crop Image            | `crop-image`              | ✓       | ✓       | ✓       | ✓       | Available everywhere                                            |
| Watermark Image       | `watermark-image`         | ✓       | ✗       | ✓       | ✗       | Missing from desktop                                            |
| **OPTIMIZE IMAGE**    |
| Compress Image        | `compress-image`          | ✓       | ✓       | ✓       | ✓       | Available everywhere                                            |
| **SPECIALIZED IMAGE** |
| Passport Photo        | `passport-photo`          | ✓       | ✓       | ✓       | ✓       | Available everywhere                                            |
| Remove Background     | `remove-image-background` | ✓       | ✗       | ✓       | ✗       | Backend: `remove_bg`, missing from desktop                      |
| Extract Palette       | `extract-palette`         | ✓       | ✓       | ✓       | ✓       | Available everywhere                                            |
| Generate Icons        | `generate-icons`          | ✓       | ✓       | ✓       | ✓       | Available everywhere                                            |
| **ADVANCED IMAGE**    |
| Photo Studio          | `photo-studio`            | ✓       | ✓       | ✗       | ✓       | Backend: `design`, desktop: `studio`, not in website            |
| Grid Split            | `grid-split`              | ✓       | ✓       | ✗       | ✓       | Backend: `grid_split`, desktop: `grid`, not in website          |
| Remove Metadata       | `remove-image-metadata`   | ✓       | ✓       | ✗       | ✓       | Backend: `remove_metadata`, desktop: `metadata`, not in website |

---

## Gap Analysis

### Tools in Backend but NOT in Website

1. **Delete Pages** (`delete-pages`) - Backend: ✓, Desktop: ✓, Website: ✗
2. **Add Page Numbers** (`page-numbers`) - Backend: ✓, Desktop: ✓, Website: ✗
3. **Extract Text** (`extract-text`) - Backend: ✓, Desktop: ✓, Website: ✗
4. **Remove Metadata (PDF)** (`remove-metadata`) - Backend: ✓, Desktop: ✓, Website: ✗
5. **Flatten PDF** (`flatten-pdf`) - Backend: ✓, Desktop: ✓, Website: ✗
6. **Photo Studio** (`photo-studio`) - Backend: ✓, Desktop: ✓, Website: ✗
7. **Grid Split** (`grid-split`) - Backend: ✓, Desktop: ✓, Website: ✗
8. **Remove Image Metadata** (`remove-image-metadata`) - Backend: ✓, Desktop: ✓, Website: ✗

### Tools in Backend but NOT in Desktop

1. **Watermark Image** (`watermark-image`) - Backend: ✓, Desktop: ✗, Website: ✓
2. **Remove Background** (`remove-image-background`) - Backend: ✓, Desktop: ✗, Website: ✓

### Tools in Website but NOT in Backend

None - All website tools have backend implementation.

### Slug Mismatches

1. **Photo Studio**:
   - Backend: `design`
   - Desktop: `studio`
   - Website: Not present

2. **Grid Split**:
   - Backend: `grid_split`
   - Desktop: `grid`
   - Website: Not present

3. **Remove Metadata (Image)**:
   - Backend: `remove_metadata`
   - Desktop: `metadata`
   - Website: Not present

4. **Remove Background**:
   - Backend: `remove_bg`
   - Website: `remove-image-background`
   - Desktop: `remove_bg`

---

## Recommendations

### High Priority

1. **Add missing tools to website** (`tools.ts`):
   - Delete Pages
   - Add Page Numbers
   - Extract Text
   - Remove Metadata (PDF)
   - Flatten PDF

2. **Add missing tools to desktop**:
   - Watermark Image
   - Remove Background

3. **Standardize slugs** across all platforms

### Medium Priority

1. Add Photo Studio and Grid Split to website
2. Add Remove Image Metadata to website
3. Create translation keys for all tools

### Low Priority

1. Add Preview PDF to desktop/website (currently backend-only)
2. Document internal tools separately

---

## Offline Capability

**All desktop tools work offline** - The desktop app bundles the Python backend and runs locally without internet connection.

**Website tools require internet** - They connect to the backend API server, though processing happens server-side.

---

## Notes

- **Backend actions** use snake_case (e.g., `pdf_to_word`, `remove_bg`)
- **Website slugs** use kebab-case (e.g., `pdf-to-word`, `remove-image-background`)
- **Desktop modes** use snake_case or camelCase depending on context
- Some tools have different names but same functionality across platforms
