# Gap Filling Implementation Checklist

## Pre-Implementation Verification ✅

- [x] Verified backend functions exist for all missing tools
- [x] Verified desktop ImageConverter has watermark and remove_bg modes
- [x] Verified API endpoint structure (`/api/pdf/{action}` and `/api/image/{action}`)
- [x] Verified translation file structure

## Phase 1: Add Missing Tools to Website (8 tools)

### 1.1 Delete Pages (`delete-pages`)
- [ ] Add to `website/data/tools.ts`
- [ ] Add route in `website/app/[locale]/tools/[slug]/page.tsx` → `getApiEndpoint()`
- [ ] Add to `website/lib/slugs.ts`
- [ ] Add translation keys in `website/messages/en.json`
- [ ] Verify API endpoint: `/api/pdf/delete_pages`
- [ ] Test tool functionality

### 1.2 Add Page Numbers (`page-numbers`)
- [ ] Add to `website/data/tools.ts`
- [ ] Add route in `getApiEndpoint()`
- [ ] Add to `website/lib/slugs.ts`
- [ ] Add translation keys
- [ ] Verify API endpoint: `/api/pdf/page_numbers`
- [ ] Test tool functionality

### 1.3 Extract Text (`extract-text`)
- [ ] Add to `website/data/tools.ts`
- [ ] Add route in `getApiEndpoint()`
- [ ] Add to `website/lib/slugs.ts`
- [ ] Add translation keys
- [ ] Verify API endpoint: `/api/pdf/extract_text`
- [ ] Test tool functionality

### 1.4 Remove Metadata - PDF (`remove-metadata`)
- [ ] Add to `website/data/tools.ts`
- [ ] Add route in `getApiEndpoint()`
- [ ] Add to `website/lib/slugs.ts`
- [ ] Add translation keys
- [ ] Verify API endpoint: `/api/pdf/remove_metadata`
- [ ] Test tool functionality

### 1.5 Flatten PDF (`flatten-pdf`)
- [ ] Add to `website/data/tools.ts`
- [ ] Add route in `getApiEndpoint()`
- [ ] Add to `website/lib/slugs.ts`
- [ ] Add translation keys
- [ ] Verify API endpoint: `/api/pdf/flatten`
- [ ] Test tool functionality

### 1.6 Photo Studio (`photo-studio`)
- [ ] Add to `website/data/tools.ts`
- [ ] Add route in `getApiEndpoint()` → `/api/image/design`
- [ ] Add to `website/lib/slugs.ts`
- [ ] Add translation keys
- [ ] Verify API endpoint: `/api/image/design`
- [ ] Test tool functionality

### 1.7 Grid Split (`grid-split`)
- [ ] Add to `website/data/tools.ts`
- [ ] Add route in `getApiEndpoint()` → `/api/image/grid_split`
- [ ] Add to `website/lib/slugs.ts`
- [ ] Add translation keys
- [ ] Verify API endpoint: `/api/image/grid_split`
- [ ] Test tool functionality

### 1.8 Remove Image Metadata (`remove-image-metadata`)
- [ ] Add to `website/data/tools.ts`
- [ ] Add route in `getApiEndpoint()` → `/api/image/remove_metadata`
- [ ] Add to `website/lib/slugs.ts`
- [ ] Add translation keys
- [ ] Verify API endpoint: `/api/image/remove_metadata`
- [ ] Test tool functionality

## Phase 2: Verify Desktop Tools (2 tools)

### 2.1 Watermark Image (`watermark-image`)
- [x] Verified: Mode exists in `ImageConverter.tsx` (line 392)
- [ ] Verify: Is in `src/tools_config.json`
- [ ] If missing, add to `src/tools_config.json`
- [ ] Verify routing works
- [ ] Test tool functionality

### 2.2 Remove Background (`remove-image-background`)
- [x] Verified: Mode exists in `ImageConverter.tsx` (line 395)
- [ ] Verify: Is in `src/tools_config.json`
- [ ] If missing, add to `src/tools_config.json`
- [ ] Verify routing works
- [ ] Test tool functionality

## Phase 3: Security & Performance

- [ ] Verify file size limits are enforced
- [ ] Verify input validation on all new endpoints
- [ ] Verify error handling and timeout handling
- [ ] Verify no path traversal vulnerabilities
- [ ] Verify proper cleanup of temp files
- [ ] Verify rate limiting (if applicable)

## Phase 4: Testing

- [ ] Test all 8 new website tools end-to-end
- [ ] Test desktop tools (watermark, remove_bg)
- [ ] Verify translations display correctly
- [ ] Verify error messages are user-friendly
- [ ] Verify large file handling
- [ ] Verify timeout handling
- [ ] Verify concurrent request handling

## Phase 5: Documentation

- [ ] Update TOOL_INVENTORY.md with completion status
- [ ] Update TOOL_AVAILABILITY_MATRIX.md
- [ ] Document any API changes
- [ ] Update README if needed

