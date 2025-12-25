# Tool Availability Matrix

## Quick Reference: Tool Availability Across Platforms

This matrix provides a visual overview of tool availability. Use ✓ for available, ✗ for not available.

---

## PDF Tools Matrix

| Tool | Backend | Desktop | Website | Offline |
|------|---------|---------|---------|---------|
| **ORGANIZE PDF** |
| Merge PDF | ✓ | ✓ | ✓ | ✓ |
| Split PDF | ✓ | ✓ | ✓ | ✓ |
| Organize PDF | ✓ | ✓ | ✓ | ✓ |
| Delete Pages | ✓ | ✓ | ✗ | ✓ |
| **EDIT PDF** |
| Rotate PDF | ✓ | ✓ | ✓ | ✓ |
| Crop PDF | ✓ | ✓ | ✓ | ✓ |
| Watermark PDF | ✓ | ✓ | ✓ | ✓ |
| Add Page Numbers | ✓ | ✓ | ✗ | ✓ |
| **CONVERT PDF** |
| PDF to Word | ✓ | ✓ | ✓ | ✓ |
| PDF to Images | ✓ | ✓ | ✓ | ✓ |
| Images to PDF | ✓ | ✓ | ✓ | ✓ |
| Word to PDF | ✓ | ✓ | ✓ | ✓ |
| PowerPoint to PDF | ✓ | ✓ | ✓ | ✓ |
| Excel to PDF | ✓ | ✓ | ✓ | ✓ |
| HTML to PDF | ✓ | ✓ | ✓ | ✓ |
| OCR PDF | ✓ | ✓ | ✓ | ✓ |
| PDF to PDF/A | ✓ | ✓ | ✓ | ✓ |
| **OPTIMIZE PDF** |
| Compress PDF | ✓ | ✓ | ✓ | ✓ |
| Repair PDF | ✓ | ✓ | ✓ | ✓ |
| Grayscale PDF | ✓ | ✓ | ✓ | ✓ |
| Web Optimize | ✓ | ✓ | ✓ | ✓ |
| **SECURITY PDF** |
| Protect PDF | ✓ | ✓ | ✓ | ✓ |
| Unlock PDF | ✓ | ✓ | ✓ | ✓ |
| Remove Metadata | ✓ | ✓ | ✗ | ✓ |
| Privacy Scrubber | ✓ | ✓ | ✓ | ✓ |
| Secure Redactor | ✓ | ✓ | ✓ | ✓ |
| Digital Signer | ✓ | ✓ | ✓ | ✓ |
| Flatten PDF | ✓ | ✓ | ✗ | ✓ |
| **EXTRACT PDF** |
| Extract Text | ✓ | ✓ | ✗ | ✓ |
| Extract Tables | ✓ | ✓ | ✓ | ✓ |
| Extract Images | ✓ | ✓ | ✓ | ✓ |
| **ADVANCED PDF** |
| Visual PDF Diff | ✓ | ✓ | ✓ | ✓ |
| Booklet Maker | ✓ | ✓ | ✓ | ✓ |
| Preview PDF | ✓ | ✗ | ✗ | N/A |

---

## Image Tools Matrix

| Tool | Backend | Desktop | Website | Offline |
|------|---------|---------|---------|---------|
| **CONVERT IMAGE** |
| Convert Image | ✓ | ✓ | ✓ | ✓ |
| HEIC to JPG | ✓ | ✓ | ✓ | ✓ |
| **EDIT IMAGE** |
| Resize Image | ✓ | ✓ | ✓ | ✓ |
| Crop Image | ✓ | ✓ | ✓ | ✓ |
| Watermark Image | ✓ | ✗ | ✓ | N/A |
| **OPTIMIZE IMAGE** |
| Compress Image | ✓ | ✓ | ✓ | ✓ |
| **SPECIALIZED IMAGE** |
| Passport Photo | ✓ | ✓ | ✓ | ✓ |
| Remove Background | ✓ | ✗ | ✓ | N/A |
| Extract Palette | ✓ | ✓ | ✓ | ✓ |
| Generate Icons | ✓ | ✓ | ✓ | ✓ |
| **ADVANCED IMAGE** |
| Photo Studio | ✓ | ✓ | ✗ | ✓ |
| Grid Split | ✓ | ✓ | ✗ | ✓ |
| Remove Metadata | ✓ | ✓ | ✗ | ✓ |

---

## Legend

- **✓** = Available
- **✗** = Not Available
- **N/A** = Not Applicable (website-only tools cannot be offline)

---

## Summary Statistics

### PDF Tools
- **Total Backend**: 39
- **Total Desktop**: 27
- **Total Website**: 31
- **Available Everywhere**: 25
- **Desktop Only**: 2 (Delete Pages, Add Page Numbers, Extract Text, Remove Metadata, Flatten PDF)
- **Website Only**: 0
- **Backend Only**: 1 (Preview PDF - internal)

### Image Tools
- **Total Backend**: 14
- **Total Desktop**: 13
- **Total Website**: 10
- **Available Everywhere**: 8
- **Desktop Only**: 3 (Photo Studio, Grid Split, Remove Metadata)
- **Website Only**: 2 (Watermark Image, Remove Background)
- **Backend Only**: 0

### Overall
- **Total Tools**: 53 (39 PDF + 14 Image)
- **Available in All Platforms**: 33
- **Gaps to Fill**: 20 tools need to be added to at least one platform

---

## Color Coding Guide

For visual scanning:
- **Green (✓✓✓)**: Available in all three platforms
- **Yellow (✓✓✗)**: Available in backend + desktop, missing from website
- **Yellow (✓✗✓)**: Available in backend + website, missing from desktop
- **Red (✓✗✗)**: Backend only, not exposed in UI
- **Gray (✗✗✗)**: Not implemented

---

## Quick Action Items

### Add to Website (8 tools)
1. Delete Pages
2. Add Page Numbers
3. Extract Text
4. Remove Metadata (PDF)
5. Flatten PDF
6. Photo Studio
7. Grid Split
8. Remove Image Metadata

### Add to Desktop (2 tools)
1. Watermark Image
2. Remove Background

### Standardize Slugs (4 tools)
1. Photo Studio: `design` → `photo-studio`
2. Grid Split: `grid_split` → `grid-split`
3. Remove Metadata: `remove_metadata` → `remove-metadata`
4. Remove Background: `remove_bg` → `remove-image-background`

