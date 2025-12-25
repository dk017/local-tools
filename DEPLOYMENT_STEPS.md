# Production Deployment Steps for Hetzner

## Pre-Deployment Checklist

### ✅ Changes Ready for Production:

1. **Backend (Python)**
   - ✅ Added `poppler-utils` to Dockerfile (required for OCR PDF)
   - ✅ Improved OCR PDF implementation with better text layer positioning
   - ✅ Fixed rotate PDF angle type conversion issue

2. **Frontend (Next.js)**
   - ✅ Updated ToolsDropdown (iLovePDF-style, 3 columns)
   - ✅ Updated ToolShowcase (8 PDF + 4 image tools)
   - ✅ Updated Navbar (mobile Tools link)
   - ✅ Fixed TypeScript errors in PdfTools.tsx
   - ✅ Added missing translations for crop-pdf and organize-pdf

3. **Desktop App (Tauri)**
   - ✅ Created index.html entry point
   - ✅ Bundled Tesseract OCR
   - ✅ Fixed Tauri configuration

## Deployment Steps

### 1. Commit and Push Changes

```bash
# Review changes
git status

# Add all modified files
git add .

# Commit with descriptive message
git commit -m "Production ready: OCR PDF fixes, UI improvements, Tesseract bundling"

# Push to repository
git push origin main
```

### 2. SSH to Hetzner Server

```bash
ssh root@YOUR_SERVER_IP
```

### 3. Navigate to Project Directory

```bash
cd ~/local-tools
```

### 4. Pull Latest Changes

```bash
git pull origin main
```

### 5. Rebuild and Restart Docker Containers

**Important:** The backend Docker image needs to be rebuilt because we added `poppler-utils` package.

```bash
# Stop existing containers
docker compose -f docker-compose.prod.yml down

# Rebuild containers (this will rebuild backend with poppler-utils)
docker compose -f docker-compose.prod.yml build --no-cache backend

# Rebuild frontend (to get latest UI changes)
docker compose -f docker-compose.prod.yml build frontend

# Start containers
docker compose -f docker-compose.prod.yml up -d

# Check logs to ensure everything started correctly
docker compose -f docker-compose.prod.yml logs -f
```

### 6. Verify Deployment

```bash
# Check container status
docker compose -f docker-compose.prod.yml ps

# Test backend health
curl http://localhost:8000/health

# Test frontend
curl http://localhost:3000

# Check if OCR PDF works (test endpoint)
curl -X POST http://localhost:8000/api/pdf/ocr_pdf
```

### 7. Verify OCR PDF Tool

1. Visit: `https://localtools.pro/tools/ocr-pdf`
2. Upload a scanned PDF
3. Verify it processes correctly and returns a searchable PDF

## What's Fixed in This Deployment

1. **OCR PDF Tool**
   - ✅ Now works in production (poppler-utils installed)
   - ✅ Better text layer positioning
   - ✅ Improved error handling and logging

2. **Rotate PDF Tool**
   - ✅ Fixed angle type conversion issue
   - ✅ Properly handles string/float inputs

3. **UI Improvements**
   - ✅ Better tools dropdown (iLovePDF-style)
   - ✅ Improved homepage tool showcase
   - ✅ Mobile-friendly navigation

## Rollback Plan (if needed)

If something goes wrong:

```bash
# Stop containers
docker compose -f docker-compose.prod.yml down

# Checkout previous version
git checkout HEAD~1

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build
```

## Notes

- The backend rebuild is **required** because `poppler-utils` was added to Dockerfile
- Frontend rebuild is recommended to get all UI improvements
- No database migrations needed
- No environment variable changes required
- SSL certificate should already be configured

