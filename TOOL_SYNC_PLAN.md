# Tool Synchronization Plan

## Overview

This document outlines the action plan to synchronize tools across Desktop App, Website, and Backend to ensure feature parity and consistent user experience.

---

## Phase 1: Add Missing Tools to Website

### Priority: HIGH

The following tools are implemented in backend and desktop but missing from the website.

#### 1. Delete Pages (`delete-pages`)

**Status**: Backend ✓ | Desktop ✓ | Website ✗

**Action Items**:
- [ ] Add to `website/data/tools.ts`:
  ```typescript
  {
    slug: "delete-pages",
    title: "Delete Pages",
    description: "Remove specific pages from PDF documents.",
    icon: "x-circle",
  }
  ```
- [ ] Add route in `website/app/[locale]/tools/[slug]/page.tsx` → `getApiEndpoint()`:
  ```typescript
  case "delete-pages":
    return "/api/pdf/delete_pages";
  ```
- [ ] Add translation keys in `website/messages/en.json`:
  ```json
  "delete-pages": {
    "title": "Delete Pages",
    "desc": "Remove specific pages from PDF documents.",
    "h1": "Delete Pages from PDF",
    "p1": "Remove unwanted pages from your PDF documents."
  }
  ```
- [ ] Add to `website/lib/slugs.ts`:
  ```typescript
  'delete-pages',
  ```

#### 2. Add Page Numbers (`page-numbers`)

**Status**: Backend ✓ | Desktop ✓ | Website ✗

**Action Items**:
- [ ] Add to `website/data/tools.ts`
- [ ] Add route in `getApiEndpoint()`
- [ ] Add translation keys
- [ ] Add to `website/lib/slugs.ts`

#### 3. Extract Text (`extract-text`)

**Status**: Backend ✓ | Desktop ✓ | Website ✗

**Action Items**:
- [ ] Add to `website/data/tools.ts`
- [ ] Add route in `getApiEndpoint()`
- [ ] Add translation keys
- [ ] Add to `website/lib/slugs.ts`

#### 4. Remove Metadata - PDF (`remove-metadata`)

**Status**: Backend ✓ | Desktop ✓ | Website ✗

**Action Items**:
- [ ] Add to `website/data/tools.ts`
- [ ] Add route in `getApiEndpoint()`:
  ```typescript
  case "remove-metadata":
    return "/api/pdf/remove_metadata";
  ```
- [ ] Add translation keys
- [ ] Add to `website/lib/slugs.ts`

#### 5. Flatten PDF (`flatten-pdf`)

**Status**: Backend ✓ | Desktop ✓ | Website ✗

**Action Items**:
- [ ] Add to `website/data/tools.ts`
- [ ] Add route in `getApiEndpoint()`
- [ ] Add translation keys
- [ ] Add to `website/lib/slugs.ts`

#### 6. Photo Studio (`photo-studio`)

**Status**: Backend ✓ (as `design`) | Desktop ✓ (as `studio`) | Website ✗

**Action Items**:
- [ ] Add to `website/data/tools.ts`:
  ```typescript
  {
    slug: "photo-studio",
    title: "Photo Studio",
    description: "Advanced photo editor with layers and text.",
    icon: "palette",
  }
  ```
- [ ] Add route in `getApiEndpoint()`:
  ```typescript
  case "photo-studio":
    return "/api/image/design";
  ```
- [ ] Add translation keys
- [ ] Add to `website/lib/slugs.ts`

#### 7. Grid Split (`grid-split`)

**Status**: Backend ✓ (as `grid_split`) | Desktop ✓ (as `grid`) | Website ✗

**Action Items**:
- [ ] Add to `website/data/tools.ts`
- [ ] Add route in `getApiEndpoint()`:
  ```typescript
  case "grid-split":
    return "/api/image/grid_split";
  ```
- [ ] Add translation keys
- [ ] Add to `website/lib/slugs.ts`

#### 8. Remove Image Metadata (`remove-image-metadata`)

**Status**: Backend ✓ (as `remove_metadata`) | Desktop ✓ (as `metadata`) | Website ✗

**Action Items**:
- [ ] Add to `website/data/tools.ts`
- [ ] Add route in `getApiEndpoint()`:
  ```typescript
  case "remove-image-metadata":
    return "/api/image/remove_metadata";
  ```
- [ ] Add translation keys
- [ ] Add to `website/lib/slugs.ts`

---

## Phase 2: Add Missing Tools to Desktop

### Priority: HIGH

#### 1. Watermark Image (`watermark-image`)

**Status**: Backend ✓ | Desktop ✗ | Website ✓

**Action Items**:
- [ ] Verify backend action: `watermark` in `handle_image_action()`
- [ ] Add mode to `src/pages/ImageConverter.tsx`:
  ```typescript
  type ToolMode = ... | 'watermark';
  ```
- [ ] Add UI controls for watermark image (text/image watermark, position, opacity)
- [ ] Add to `src/tools_config.json`:
  ```json
  {
    "slug": "watermark-image",
    "tool": "image",
    "mode": "watermark",
    "title": "Add Watermark to Images",
    "description": "Stamp text or logo watermarks on your photos."
  }
  ```
- [ ] Add translation keys in desktop i18n files

#### 2. Remove Background (`remove-image-background`)

**Status**: Backend ✓ (as `remove_bg`) | Desktop ✗ | Website ✓

**Action Items**:
- [ ] Verify backend action: `remove_bg` in `handle_image_action()`
- [ ] Add mode to `src/pages/ImageConverter.tsx`:
  ```typescript
  type ToolMode = ... | 'remove_bg';
  ```
- [ ] Add UI for remove background tool
- [ ] Add to `src/tools_config.json`:
  ```json
  {
    "slug": "remove-image-background",
    "tool": "image",
    "mode": "remove_bg",
    "title": "Remove Background",
    "description": "AI-powered background removal for images."
  }
  ```
- [ ] Add translation keys

---

## Phase 3: Slug Standardization

### Priority: MEDIUM

Standardize slug naming across all platforms to use kebab-case consistently.

#### Current Inconsistencies

1. **Photo Studio**
   - Backend: `design`
   - Desktop: `studio`
   - Website: Not present
   - **Standard**: `photo-studio`

2. **Grid Split**
   - Backend: `grid_split`
   - Desktop: `grid`
   - Website: Not present
   - **Standard**: `grid-split`

3. **Remove Metadata (Image)**
   - Backend: `remove_metadata`
   - Desktop: `metadata`
   - Website: Not present
   - **Standard**: `remove-image-metadata`

4. **Remove Background**
   - Backend: `remove_bg`
   - Website: `remove-image-background`
   - Desktop: `remove_bg`
   - **Standard**: `remove-image-background` (already correct in website)

#### Action Items

- [ ] Update backend action handlers to accept both old and new slugs (backward compatibility)
- [ ] Update desktop app to use standardized slugs
- [ ] Update website to use standardized slugs
- [ ] Document slug mapping in backend API

---

## Phase 4: Translation Keys

### Priority: MEDIUM

Ensure all tools have complete translation keys in all supported languages.

#### Languages to Update
- English (en)
- Japanese (jp)
- Korean (kr)
- French (fr)
- Spanish (es)
- Italian (it)

#### Action Items

For each missing tool:
- [ ] Add translation keys to `website/messages/{locale}.json`
- [ ] Add translation keys to desktop app i18n files
- [ ] Verify all tool names, descriptions, and UI text are translated

---

## Phase 5: Testing & Validation

### Priority: HIGH

After implementing changes, validate:

- [ ] All tools work correctly in desktop app
- [ ] All tools work correctly on website
- [ ] All backend endpoints are accessible
- [ ] Slug routing works correctly
- [ ] Translation keys are present and correct
- [ ] Tool pages render correctly
- [ ] API endpoints return expected results
- [ ] File uploads/downloads work correctly

---

## Implementation Order

1. **Week 1**: Add missing tools to website (Phase 1)
2. **Week 2**: Add missing tools to desktop (Phase 2)
3. **Week 3**: Slug standardization (Phase 3)
4. **Week 4**: Translation keys and testing (Phase 4 & 5)

---

## Files to Modify

### Website Files
- `website/data/tools.ts` - Add tool definitions
- `website/app/[locale]/tools/[slug]/page.tsx` - Add API routes
- `website/lib/slugs.ts` - Add slug constants
- `website/messages/{locale}.json` - Add translations
- `website/components/ToolCatalog.tsx` - Verify tool display
- `website/components/ToolsDropdown.tsx` - Add to dropdown if needed

### Desktop Files
- `src/pages/ImageConverter.tsx` - Add new modes
- `src/tools_config.json` - Add tool configs
- `src/lib/i18n.ts` - Add translations
- `src/pages/PdfTools.tsx` - Verify all tools present

### Backend Files
- `python-backend/api.py` - Verify all routes exist
- `python-backend/modules/pdf_tools.py` - Verify handlers
- `python-backend/modules/image_tools.py` - Verify handlers

---

## Success Criteria

- [ ] All 53 backend tools are accessible via website
- [ ] All 53 backend tools are accessible via desktop
- [ ] All slugs are standardized (kebab-case)
- [ ] All translation keys are present
- [ ] No broken links or 404 errors
- [ ] All tools tested and working

---

## Notes

- Maintain backward compatibility when changing slugs
- Test thoroughly after each phase
- Update documentation as tools are added
- Consider user feedback for tool prioritization

