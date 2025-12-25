# Redeploy to Hetzner - Step by Step Guide

## Pre-Deployment Checklist

- [x] All code changes completed
- [x] Translations added for all locales
- [x] OCR PDF fix applied (web mode detection)
- [x] 8 new tools added to website
- [ ] Test locally (optional but recommended)

## Deployment Steps

### Step 1: Commit and Push Changes (Local Machine)

```bash
# Review all changes
git status

# Add all modified files
git add .

# Commit with descriptive message
git commit -m "Add 8 missing tools to website, fix OCR PDF web mode, add translations"

# Push to repository
git push origin main
```

**Files Changed:**
- `website/data/tools.ts` - Added 8 new tools
- `website/app/[locale]/tools/[slug]/page.tsx` - Added API routes
- `website/lib/slugs.ts` - Added slugs
- `website/messages/*.json` - Added translations (6 locales)
- `src/tools_config.json` - Added remove-image-background
- `python-backend/modules/tesseract_helper.py` - Fixed web mode detection

### Step 2: SSH to Hetzner Server

```bash
ssh root@YOUR_SERVER_IP
```

Replace `YOUR_SERVER_IP` with your actual Hetzner server IP address.

### Step 3: Navigate to Project Directory

```bash
cd ~/local-tools
```

### Step 4: Pull Latest Changes

```bash
git pull origin main
```

Verify the pull was successful:
```bash
git log --oneline -5
```

### Step 5: Rebuild Docker Containers

**IMPORTANT:** The backend needs to be rebuilt because:
- `tesseract_helper.py` was modified (OCR PDF fix)
- Backend code changes require rebuild

```bash
# Stop existing containers
docker compose -f docker-compose.prod.yml down

# Rebuild backend (with no cache to ensure latest code)
docker compose -f docker-compose.prod.yml build --no-cache backend

# Rebuild frontend (to get new tools and translations)
docker compose -f docker-compose.prod.yml build frontend

# Start containers
docker compose -f docker-compose.prod.yml up -d

# Check container status
docker compose -f docker-compose.prod.yml ps
```

### Step 6: Verify Deployment

```bash
# Check backend logs
docker compose -f docker-compose.prod.yml logs backend --tail=50

# Check frontend logs
docker compose -f docker-compose.prod.yml logs frontend --tail=50

# Test backend health
curl http://localhost:8000/health

# Test frontend
curl -I http://localhost:3000
```

### Step 7: Test New Tools (Optional but Recommended)

Test the new tools via browser:
1. Visit: `https://localtools.pro/tools/delete-pages`
2. Visit: `https://localtools.pro/tools/page-numbers`
3. Visit: `https://localtools.pro/tools/extract-text`
4. Visit: `https://localtools.pro/tools/remove-metadata`
5. Visit: `https://localtools.pro/tools/flatten-pdf`
6. Visit: `https://localtools.pro/tools/photo-studio`
7. Visit: `https://localtools.pro/tools/grid-split`
8. Visit: `https://localtools.pro/tools/remove-image-metadata`

Test OCR PDF fix:
- Visit: `https://localtools.pro/tools/ocr-pdf`
- Upload a scanned PDF
- Should work without Tesseract errors

### Step 8: Monitor for Errors

```bash
# Watch logs in real-time
docker compose -f docker-compose.prod.yml logs -f

# Press Ctrl+C to stop watching
```

## Quick Deployment (One-Liner)

If you're confident and want to do it quickly:

```bash
ssh root@YOUR_SERVER_IP "cd ~/local-tools && git pull origin main && docker compose -f docker-compose.prod.yml down && docker compose -f docker-compose.prod.yml build --no-cache backend frontend && docker compose -f docker-compose.prod.yml up -d && docker compose -f docker-compose.prod.yml ps"
```

## Rollback Plan (If Something Goes Wrong)

If deployment fails or issues occur:

```bash
# SSH to server
ssh root@YOUR_SERVER_IP

# Navigate to project
cd ~/local-tools

# Stop containers
docker compose -f docker-compose.prod.yml down

# Checkout previous version
git checkout HEAD~1

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build

# Or restore from backup (if you have one)
# git checkout main
# git reset --hard <previous-commit-hash>
```

## What's Being Deployed

### New Features
- ✅ 8 new tools added to website
- ✅ OCR PDF fix (web mode detection)
- ✅ Translations for 6 locales (jp, kr, fr, es, it, en)
- ✅ Desktop tool config updated

### Files Modified
- Website: 5 files
- Backend: 1 file (tesseract_helper.py)
- Desktop: 1 file (tools_config.json)
- Translations: 6 files

## Expected Deployment Time

- Git pull: ~10 seconds
- Backend rebuild: ~2-5 minutes
- Frontend rebuild: ~3-5 minutes
- Container restart: ~10 seconds
- **Total: ~5-10 minutes**

## Post-Deployment Verification

1. ✅ All containers running
2. ✅ Backend health check passes
3. ✅ Frontend accessible
4. ✅ New tools accessible
5. ✅ OCR PDF works
6. ✅ Translations display correctly

## Notes

- The backend rebuild is **required** due to `tesseract_helper.py` changes
- Frontend rebuild is recommended to get all new tools and translations
- No database migrations needed
- No environment variable changes required
- SSL certificate should already be configured

---

**Ready to deploy?** Follow steps 1-8 above.




