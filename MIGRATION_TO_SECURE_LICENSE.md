# Migration Guide: Secure License Validation

**Date**: 2026-01-09
**Priority**: CRITICAL - Must complete before production release
**Estimated Time**: 1-2 days

---

## Overview

This guide walks you through migrating from the insecure embedded API key approach to the secure backend validation service.

### What's Changing

**BEFORE (INSECURE)**:
```
Desktop App → LemonSqueezy API
(API key embedded in binary - extractable!)
```

**AFTER (SECURE)**:
```
Desktop App → Your Validation Server → LemonSqueezy API
(No API key in desktop app!)
```

---

## Step 1: Deploy Validation Service (1-2 hours)

### A. Add API Routes to Your Website

The validation API routes have been created in `website/app/api/desktop/`:
- ✅ `validate-license/route.ts` - License validation
- ✅ `activate-license/route.ts` - License activation
- ✅ `deactivate-license/route.ts` - License deactivation

All routes include:
- Rate limiting (prevents brute force)
- Input validation
- Error handling
- Logging for monitoring

### B. Add Environment Variable to Hosting Platform

**If using Vercel:**

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add new variable:
   - **Name**: `LEMONSQUEEZY_API_KEY`
   - **Value**: Your actual LemonSqueezy API key
   - **Environment**: Production (and Preview if needed)
5. Redeploy your site

**If using Netlify:**

1. Go to Site settings → Environment variables
2. Add:
   - **Key**: `LEMONSQUEEZY_API_KEY`
   - **Value**: Your API key
3. Redeploy

**If using Railway/Render/Other:**

Similar process - add `LEMONSQUEEZY_API_KEY` as environment variable in your deployment platform.

### C. Test the Validation Service

**Method 1: Using curl (command line)**:
```bash
# Replace 'yourwebsite.com' with your actual domain

# Test validation
curl -X POST https://yourwebsite.com/api/desktop/validate-license \
  -H "Content-Type: application/json" \
  -d '{"license_key":"test-key","instance_id":"test-instance"}'

# Should return JSON response (might be error if test-key is invalid, but confirms endpoint works)
```

**Method 2: Using Postman or Insomnia**:
1. Create POST request to `https://yourwebsite.com/api/desktop/validate-license`
2. Set Content-Type to `application/json`
3. Body: `{"license_key":"your-test-key","instance_id":"test"}`
4. Send request
5. Should get JSON response

**Expected responses**:
- ✅ Valid license: `{"success": true, "valid": true, ...}`
- ✅ Invalid license: `{"success": false, "error": "..."}`
- ❌ 503 error: API key not configured (go back to step B)
- ❌ 500 error: Check server logs

---

## Step 2: Update Desktop App (30 minutes)

### A. Replace License Module

**Option 1: Rename existing file (safe backup)**:
```bash
cd python-backend/modules
mv licensing.py licensing_old.py
mv licensing_secure.py licensing.py
```

**Option 2: Direct replacement** (if confident):
Delete `licensing.py` and rename `licensing_secure.py` to `licensing.py`.

### B. Update Rust Bridge

Replace `src-tauri/src/python_bridge.rs` with `src-tauri/src/python_bridge_secure.rs`:

```bash
cd src-tauri/src
mv python_bridge.rs python_bridge_old.rs
mv python_bridge_secure.rs python_bridge.rs
```

**IMPORTANT**: Edit line 50 in `python_bridge.rs`:
```rust
// Change this line:
.unwrap_or_else(|_| "https://yourwebsite.com/api/desktop".to_string());

// To your actual domain:
.unwrap_or_else(|_| "https://your-actual-domain.com/api/desktop".to_string());
```

### C. Update Environment Configuration

Replace `.env.example` with `.env.example.secure`:
```bash
mv .env.example .env.example.old
mv .env.example.secure .env.example
```

Create your local `.env` file:
```bash
# Copy example
cp .env.example .env

# Edit .env with your actual values
# For local development:
VALIDATION_SERVICE_URL=http://localhost:3000/api/desktop

# For production builds:
# VALIDATION_SERVICE_URL=https://your-actual-domain.com/api/desktop
```

---

## Step 3: Update Build Scripts (15 minutes)

### A. Update build-with-env.ps1 (Windows)

Edit `scripts/build-with-env.ps1`:

**Find** (around lines 34-42):
```powershell
# Verify LEMONSQUEEZY_API_KEY is set
$apiKey = [System.Environment]::GetEnvironmentVariable("LEMONSQUEEZY_API_KEY", ...)
if ($apiKey) {
    $maskedKey = $apiKey.Substring(0, [Math]::Min(8, $apiKey.Length)) + "..."
    Write-Host "[+] LEMONSQUEEZY_API_KEY is configured ($maskedKey)" -ForegroundColor Green
} else {
    Write-Host "[!] Warning: LEMONSQUEEZY_API_KEY is not set!" -ForegroundColor Yellow
}
```

**Replace with**:
```powershell
# Verify VALIDATION_SERVICE_URL is set
$validationUrl = [System.Environment]::GetEnvironmentVariable("VALIDATION_SERVICE_URL", [System.EnvironmentVariableTarget]::Process)
if ($validationUrl) {
    Write-Host "[+] VALIDATION_SERVICE_URL is configured: $validationUrl" -ForegroundColor Green
} else {
    Write-Host "[!] Warning: VALIDATION_SERVICE_URL is not set!" -ForegroundColor Yellow
    Write-Host "    Using default: https://your-actual-domain.com/api/desktop" -ForegroundColor Yellow
}
```

### B. Update build-with-env.sh (Unix)

Similar changes for Unix build script if you have one.

---

## Step 4: Update GitHub Actions (10 minutes)

Edit `.github/workflows/build-desktop.yml`:

**Find** (lines 68-70, 150-153, 235-238):
```yaml
- name: Build Tauri app
  env:
    LEMONSQUEEZY_API_KEY: ${{ secrets.LEMONSQUEEZY_API_KEY }}
  run: npm run tauri build
```

**Replace ALL THREE OCCURRENCES with**:
```yaml
- name: Build Tauri app
  env:
    VALIDATION_SERVICE_URL: ${{ secrets.VALIDATION_SERVICE_URL }}
  run: npm run tauri build
```

### Add GitHub Secret

1. Go to your repository on GitHub
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add:
   - **Name**: `VALIDATION_SERVICE_URL`
   - **Value**: `https://your-actual-domain.com/api/desktop`
5. Save

**Remove old secret** (optional but recommended):
- Delete `LEMONSQUEEZY_API_KEY` from GitHub secrets

---

## Step 5: Test Locally (30 minutes)

### A. Start Website with Validation Service

```bash
cd website

# Create .env.local with your API key
echo "LEMONSQUEEZY_API_KEY=your_actual_key" > .env.local

# Start development server
npm run dev
```

The validation service will be available at `http://localhost:3000/api/desktop`.

### B. Test Desktop App

In a new terminal:

```bash
# Create/update .env
echo "VALIDATION_SERVICE_URL=http://localhost:3000/api/desktop" > .env

# For testing without real licenses
echo "DEV_MOCK_LICENSE=true" >> .env

# Start desktop app
npm run tauri dev
```

### C. Test License Activation

1. Open desktop app
2. Go to Settings
3. Try activating a license:
   - **With DEV_MOCK_LICENSE=true**: Use `test_123` as license key
   - **With real API key**: Use actual LemonSqueezy license key
4. Verify activation works
5. Check website terminal for validation logs

**Expected behavior**:
- License key entered → Desktop app sends request to `localhost:3000/api/desktop/activate-license`
- Website logs show: `{action: 'activate', ...}`
- Desktop app shows success message

---

## Step 6: Build and Verify (1 hour)

### A. Production Build

```bash
# Update .env for production
echo "VALIDATION_SERVICE_URL=https://your-actual-domain.com/api/desktop" > .env

# Build (this will take 10-20 minutes)
npm run tauri:build:production
```

### B. Security Verification

**CRITICAL: Verify API key is NOT in binary**

```bash
# Windows
cd src-tauri/target/release
strings "Local Tools.exe" | findstr /i "lemon"
# Expected: NO OUTPUT (or only "LemonSqueezy" in error messages)

# Mac/Linux
cd src-tauri/target/release/bundle
strings "Local Tools.app/Contents/MacOS/Local Tools" | grep -i "lemon"
# Expected: NO OUTPUT (or only "LemonSqueezy" in error messages)
```

**What you should NOT see**:
- `LEMONSQUEEZY_API_KEY=...`
- Your actual API key
- `Bearer lmsk_...`

**What you CAN see**:
- `License service is not configured`
- `LemonSqueezy` (as part of error messages)
- `https://api.lemonsqueezy.com` (URL reference is fine)

If you see your API key: **STOP! Something went wrong. Do not release this build!**

---

## Step 7: Deploy and Monitor (ongoing)

### A. Deploy Website

Deploy your website with the validation service:

```bash
cd website
vercel --prod
# or
git push origin main  # if auto-deploy is configured
```

### B. Monitor Validation Service

After deployment, check logs for:
- License validation requests
- Activation success rate
- Any 429 rate limit errors (might need to adjust limits)
- Any errors or failures

**Vercel**: Dashboard → Your Project → Functions → Logs
**Netlify**: Dashboard → Functions → Logs

### C. Test Production Build

1. Install production build on test machine
2. Try activating license
3. Verify it works
4. Check validation service logs
5. Confirm no errors

---

## Rollback Plan

If issues occur after deployment:

### Immediate Rollback (< 5 minutes)

1. **Website**: Revert to previous deployment
   ```bash
   vercel rollback  # or use dashboard
   ```

2. **Desktop**: Use old build (keep previous installers)

3. **GitHub Actions**: Revert `.github/workflows/build-desktop.yml`

### Temporary Fix (1 day)

Keep validation service running but allow old desktop apps to continue using embedded API key (if you kept `licensing_old.py` as fallback).

---

## Verification Checklist

Before going live, verify:

### Security
- [ ] API key NOT in desktop binary (`strings` test passed)
- [ ] Validation service requires HTTPS in production
- [ ] Rate limiting is active (test multiple rapid requests)
- [ ] Error messages don't leak API key
- [ ] GitHub secrets configured correctly

### Functionality
- [ ] License activation works (test with real key)
- [ ] License validation works
- [ ] License deactivation works
- [ ] Offline mode works (grace period respected)
- [ ] Error handling works (network errors, invalid keys, etc.)

### Monitoring
- [ ] Validation service logs are accessible
- [ ] Can see activation requests in logs
- [ ] Can see rate limit hits (if any)
- [ ] API error monitoring setup

### Documentation
- [ ] Updated README with new setup instructions
- [ ] Users know license validation requires internet (one-time)
- [ ] Support team knows how to debug license issues

---

## Troubleshooting

### "License service temporarily unavailable"

**Cause**: Validation service cannot reach LemonSqueezy API

**Fixes**:
1. Check if `LEMONSQUEEZY_API_KEY` is set in hosting platform
2. Check validation service logs for errors
3. Verify API key is valid (test in LemonSqueezy dashboard)
4. Check if LemonSqueezy API is down (status.lemonsqueezy.com)

### "Cannot reach validation service"

**Cause**: Desktop app cannot connect to validation URL

**Fixes**:
1. Verify URL in `.env`: `VALIDATION_SERVICE_URL=https://...`
2. Check if website is accessible (open URL in browser)
3. Check firewall settings
4. Test with curl: `curl https://your-domain.com/api/desktop/validate-license`

### "Rate limit exceeded"

**Cause**: Too many requests from same IP

**Fixes**:
1. Normal: User should wait 1 minute
2. If legitimate use case: Increase rate limits in `route.ts` files
3. If attack: Block IP address

### Build fails with "VALIDATION_SERVICE_URL not found"

**Cause**: Environment variable not set

**Fixes**:
1. Create `.env` file with `VALIDATION_SERVICE_URL=...`
2. Or set environment variable: `export VALIDATION_SERVICE_URL=...`
3. For GitHub Actions: Add to repository secrets

---

## Timeline Summary

**Day 1 (Morning)**:
- [ ] Deploy validation service (Steps 1-2)
- [ ] Test API endpoints

**Day 1 (Afternoon)**:
- [ ] Update desktop app code (Step 2)
- [ ] Update build scripts (Step 3)
- [ ] Test locally (Step 5)

**Day 2 (Morning)**:
- [ ] Production build (Step 6)
- [ ] Security verification
- [ ] Update GitHub Actions (Step 4)

**Day 2 (Afternoon)**:
- [ ] Deploy website
- [ ] Test production build
- [ ] Monitor logs
- [ ] Final verification

---

## Success Criteria

You're ready for production when:

1. ✅ Validation service deployed and accessible
2. ✅ Desktop build completes without errors
3. ✅ `strings` test shows NO API key in binary
4. ✅ License activation works with real key
5. ✅ Validation service logs show successful requests
6. ✅ Rate limiting is active
7. ✅ Error handling works correctly
8. ✅ GitHub Actions builds successfully

---

## Next Steps After Migration

Once secure license validation is working:

1. **Fix CSP** (see `SECURITY_AUDIT_SUMMARY.md`)
2. **Implement webhook signature verification**
3. **Add path traversal protection**
4. **Complete security audit**
5. **Production release!**

---

## Questions?

If you encounter issues:
1. Check this migration guide
2. Review `SECURE_LICENSE_ARCHITECTURE.md`
3. Check validation service logs
4. Test with `DEV_MOCK_LICENSE=true` first

**Remember**: The goal is **zero API keys in desktop binary**. Everything else can be debugged and fixed, but API key exposure cannot be undone once released.
