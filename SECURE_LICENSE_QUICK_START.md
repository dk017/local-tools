# Secure License Validation - Quick Start

**Status**: Implementation complete, ready for deployment
**Time to Deploy**: 1-2 hours
**Fixes**: CRITICAL security vulnerability (API key extraction)

---

## What Was Built

### ✅ Backend Validation Service (Next.js API Routes)

**Location**: `website/app/api/desktop/`

Three secure endpoints:
1. **validate-license** - Validates license keys
2. **activate-license** - Activates new licenses
3. **deactivate-license** - Deactivates licenses

**Security features**:
- ✅ Rate limiting (10 validations/min, 5 activations/min)
- ✅ Input validation
- ✅ No API key in responses
- ✅ Request logging
- ✅ Error handling

### ✅ Secure Desktop App Code

**New files**:
- `python-backend/modules/licensing_secure.py` - Secure license module
- `src-tauri/src/python_bridge_secure.rs` - Secure Rust bridge
- `.env.example.secure` - Updated environment config

**Security improvements**:
- ❌ NO `LEMONSQUEEZY_API_KEY` in code
- ✅ Uses `VALIDATION_SERVICE_URL` instead
- ✅ All API calls go through your server
- ✅ API key stays on server only

---

## Quick Deploy Steps

### 1. Deploy Website (30 min)

```bash
cd website

# Add API key to .env.local
echo "LEMONSQUEEZY_API_KEY=your_actual_api_key" > .env.local

# Test locally
npm run dev

# Test endpoint
curl -X POST http://localhost:3000/api/desktop/validate-license \
  -H "Content-Type: application/json" \
  -d '{"license_key":"test"}'

# Deploy to production (Vercel)
vercel --prod
```

**Add to Vercel Dashboard**:
- Go to Settings → Environment Variables
- Add: `LEMONSQUEEZY_API_KEY` = your key
- Redeploy

### 2. Update Desktop App (15 min)

```bash
# Backup old files
cd python-backend/modules
mv licensing.py licensing_old.py
mv licensing_secure.py licensing.py

cd ../../src-tauri/src
mv python_bridge.rs python_bridge_old.rs
mv python_bridge_secure.rs python_bridge.rs

# IMPORTANT: Edit python_bridge.rs line 50
# Change: "https://yourwebsite.com/api/desktop"
# To: "https://your-actual-domain.com/api/desktop"
```

### 3. Configure Environment (5 min)

```bash
# Create .env file
cat > .env << EOF
VALIDATION_SERVICE_URL=https://your-actual-domain.com/api/desktop

# For local testing:
# VALIDATION_SERVICE_URL=http://localhost:3000/api/desktop

# For mock testing (optional):
# DEV_MOCK_LICENSE=true
EOF
```

### 4. Test Locally (15 min)

Terminal 1 (Website):
```bash
cd website
npm run dev
```

Terminal 2 (Desktop):
```bash
# Use local validation service
echo "VALIDATION_SERVICE_URL=http://localhost:3000/api/desktop" > .env
npm run tauri dev

# Test license activation in app
```

### 5. Build Production (20 min)

```bash
# Update .env for production
echo "VALIDATION_SERVICE_URL=https://your-actual-domain.com/api/desktop" > .env

# Build
npm run tauri:build:production
```

### 6. Security Check (5 min)

**CRITICAL - Verify NO API key in binary**:

```bash
# Windows
cd src-tauri/target/release
strings "Local Tools.exe" | findstr /i "lmsk_"
# Expected: NO OUTPUT

# Mac/Linux
strings "Local Tools" | grep "lmsk_"
# Expected: NO OUTPUT
```

If you see `lmsk_...` (your API key): **STOP! DO NOT RELEASE!**

### 7. Update GitHub Actions (Optional)

Edit `.github/workflows/build-desktop.yml`:

```yaml
# Change all three build jobs (Windows, Linux, macOS):
- name: Build Tauri app
  env:
    VALIDATION_SERVICE_URL: ${{ secrets.VALIDATION_SERVICE_URL }}
  run: npm run tauri build
```

Add GitHub secret:
- Name: `VALIDATION_SERVICE_URL`
- Value: `https://your-actual-domain.com/api/desktop`

---

## Testing Checklist

### Local Testing

- [ ] Website running on `localhost:3000`
- [ ] Desktop app connects to `localhost:3000/api/desktop`
- [ ] License activation works
- [ ] Mock license works (`DEV_MOCK_LICENSE=true`, key=`test_123`)
- [ ] Validation service logs show requests

### Production Testing

- [ ] Built desktop app
- [ ] `strings` test passed (NO API key found)
- [ ] Installed on test machine
- [ ] License activation works
- [ ] Validation service logs show requests on production
- [ ] No errors in logs

---

## Architecture Overview

```
┌─────────────────────┐
│   Desktop App       │
│   (No API Key!)     │
│                     │
│   VALIDATION_       │
│   SERVICE_URL       │
└──────────┬──────────┘
           │ HTTPS
           │ POST /validate-license
           ▼
┌─────────────────────┐
│  Your Website       │
│  (Next.js)          │
│                     │
│  LEMONSQUEEZY_      │
│  API_KEY ← Secret!  │
└──────────┬──────────┘
           │ HTTPS
           │ LemonSqueezy API
           ▼
┌─────────────────────┐
│   LemonSqueezy      │
└─────────────────────┘
```

**Benefits**:
- ✅ API key never exposed
- ✅ Rate limiting prevents abuse
- ✅ Server-side control
- ✅ Easy to monitor
- ✅ Can add business logic

---

## Environment Variables

### Desktop App (.env)

```bash
# Production
VALIDATION_SERVICE_URL=https://your-domain.com/api/desktop

# Local development
VALIDATION_SERVICE_URL=http://localhost:3000/api/desktop

# Mock testing (optional)
DEV_MOCK_LICENSE=true
```

### Website (.env.local or hosting platform)

```bash
# CRITICAL: Never commit this!
LEMONSQUEEZY_API_KEY=lmsk_your_actual_api_key_here
```

---

## Common Issues

### "License service temporarily unavailable"

**Fix**: Add `LEMONSQUEEZY_API_KEY` to hosting platform (Vercel/Netlify)

### "Cannot reach validation service"

**Fix**: Check `VALIDATION_SERVICE_URL` in `.env` and verify website is accessible

### Build fails

**Fix**: Ensure `.env` exists with `VALIDATION_SERVICE_URL`

### API key still in binary

**Fix**: Make sure you replaced `python_bridge.rs` with secure version

---

## Files Changed

### New Files
- ✅ `website/app/api/desktop/validate-license/route.ts`
- ✅ `website/app/api/desktop/activate-license/route.ts`
- ✅ `website/app/api/desktop/deactivate-license/route.ts`
- ✅ `python-backend/modules/licensing_secure.py`
- ✅ `src-tauri/src/python_bridge_secure.rs`
- ✅ `.env.example.secure`
- ✅ `SECURE_LICENSE_ARCHITECTURE.md` (detailed docs)
- ✅ `MIGRATION_TO_SECURE_LICENSE.md` (full guide)

### Files to Replace
- `python-backend/modules/licensing.py` → `licensing_secure.py`
- `src-tauri/src/python_bridge.rs` → `python_bridge_secure.rs`
- `.env.example` → `.env.example.secure`

### Files to Update
- `.github/workflows/build-desktop.yml` (change env var)
- `scripts/build-with-env.ps1` (change env var check)

---

## Next Steps

1. **Deploy today**: Follow steps 1-6 above
2. **Fix remaining security issues**: See `SECURITY_AUDIT_SUMMARY.md`
   - CSP policy
   - Webhook verification
   - Path traversal
3. **Security audit**: Full testing
4. **Production release**: Go live!

---

## Documentation

- **Architecture**: `SECURE_LICENSE_ARCHITECTURE.md`
- **Migration Guide**: `MIGRATION_TO_SECURE_LICENSE.md`
- **Security Audit**: `SECURITY_AUDIT_SUMMARY.md`
- **This Guide**: Quick reference

---

## Success Criteria

Ready for production when:

1. ✅ Validation service deployed
2. ✅ Desktop app builds successfully
3. ✅ NO API key in binary (`strings` test)
4. ✅ License activation works
5. ✅ Logs show successful validations

**Time estimate**: 1-2 hours from start to production
