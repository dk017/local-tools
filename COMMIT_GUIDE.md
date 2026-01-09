# Commit Guide: Secure License Validation

**Goal**: Commit the secure license validation implementation to GitHub

---

## ✅ Files to Commit (Required for Secure Implementation)

### 1. New Backend Validation API (CRITICAL)

```bash
git add website/app/api/desktop/
```

**What it includes**:
- `website/app/api/desktop/validate-license/route.ts`
- `website/app/api/desktop/activate-license/route.ts`
- `website/app/api/desktop/deactivate-license/route.ts`

**Why**: These are the secure validation endpoints that protect your API key

### 2. Secure Desktop App Code (CRITICAL)

```bash
git add python-backend/modules/licensing_secure.py
git add src-tauri/src/python_bridge_secure.rs
```

**Why**: New secure code that uses validation service instead of embedded API key

### 3. Configuration Template (IMPORTANT)

```bash
git add .env.example.secure
```

**Why**: Template for users/developers showing how to configure validation URL

### 4. Documentation (HIGHLY RECOMMENDED)

```bash
git add SECURE_LICENSE_ARCHITECTURE.md
git add SECURE_LICENSE_IMPLEMENTATION_COMPLETE.md
git add SECURE_LICENSE_QUICK_START.md
git add MIGRATION_TO_SECURE_LICENSE.md
git add DEPLOYMENT_PIPELINE_EXPLAINED.md
git add SECURITY_AUDIT_SUMMARY.md
```

**Why**: Essential documentation for understanding and implementing the secure system

### 5. GitHub Actions Update (IMPORTANT - but needs revision)

```bash
# DON'T commit yet - see note below
# git add .github/workflows/build-desktop.yml
```

**Why**: Currently adds `LEMONSQUEEZY_API_KEY` (old insecure way). We need to update it to use `VALIDATION_SERVICE_URL` instead.

---

## ❌ Files NOT to Commit

### Python Cache Files (Never commit)

```bash
# DO NOT COMMIT:
python-backend/__pycache__/server.cpython-312.pyc
python-backend/modules/__pycache__/image_tools.cpython-312.pyc
python-backend/modules/__pycache__/licensing.cpython-312.pyc
python-backend/modules/__pycache__/pdf_tools.cpython-312.pyc
python-backend/modules/__pycache__/security.cpython-312.pyc
```

**Why**: These are compiled Python files, auto-generated, should be in `.gitignore`

### Modified Files (Need Review)

```bash
# Review before committing:
# scripts/build-with-env.ps1
# src/components/ActivationScreen.tsx
# src/components/ActivationWrapper.tsx
```

**Why**: Need to check what changes were made. These might be from previous work or testing.

---

## 📋 Step-by-Step Commit Process

### Step 1: Clean Up Cache Files

```bash
cd D:/DKPlayground/offline-tools

# Restore cache files (don't commit them)
git restore python-backend/__pycache__/*.pyc

# Or if you want to be thorough:
git clean -fd python-backend/__pycache__/
```

### Step 2: Add .gitignore Rule (if not already present)

Check if `.gitignore` has Python cache exclusion:

```bash
# Check current .gitignore
cat .gitignore | grep -i pycache

# If not present, add:
echo "" >> .gitignore
echo "# Python cache" >> .gitignore
echo "__pycache__/" >> .gitignore
echo "*.pyc" >> .gitignore
echo "*.pyo" >> .gitignore

# Commit the .gitignore update
git add .gitignore
```

### Step 3: Review Modified Files

Let me check what changed in those files:

```bash
# Check what changed in build script
git diff scripts/build-with-env.ps1

# Check ActivationScreen changes
git diff src/components/ActivationScreen.tsx

# Check ActivationWrapper changes
git diff src/components/ActivationWrapper.tsx
```

**Decision**:
- If changes are part of secure license work → Commit them
- If changes are unrelated testing → Restore them

### Step 4: Fix GitHub Actions Workflow

**IMPORTANT**: The workflow currently adds `LEMONSQUEEZY_API_KEY`, but we want `VALIDATION_SERVICE_URL` for secure version.

**Option A: Commit Current State (Transitional)**
- Commits the workflow that passes API key
- Allows old desktop builds to work
- You'll update to `VALIDATION_SERVICE_URL` later

**Option B: Update to Secure Version Now (Recommended)**
- Update workflow to use `VALIDATION_SERVICE_URL`
- Commits fully secure version
- Requires adding GitHub secret immediately

Let me create the secure version of the workflow update.

### Step 5: Add Core Secure License Files

```bash
# Add the essential files
git add website/app/api/desktop/
git add python-backend/modules/licensing_secure.py
git add src-tauri/src/python_bridge_secure.rs
git add .env.example.secure
```

### Step 6: Add Documentation

```bash
# Add all documentation
git add SECURE_LICENSE_ARCHITECTURE.md
git add SECURE_LICENSE_IMPLEMENTATION_COMPLETE.md
git add SECURE_LICENSE_QUICK_START.md
git add MIGRATION_TO_SECURE_LICENSE.md
git add DEPLOYMENT_PIPELINE_EXPLAINED.md
git add SECURITY_AUDIT_SUMMARY.md
git add COMMIT_GUIDE.md
```

### Step 7: Review and Commit

```bash
# Check what will be committed
git status

# Create commit
git commit -m "Add secure license validation system

- Add backend validation API endpoints (validate/activate/deactivate)
- Add secure desktop license module (no API key embedded)
- Add secure Rust bridge (uses validation service URL)
- Add comprehensive security documentation
- Implement rate limiting and input validation
- Fix CRITICAL security issue: API key exposure in binary

This addresses the #1 CRITICAL security vulnerability identified in audit.
API key now stays on server only. Desktop app calls validation service.

See SECURE_LICENSE_IMPLEMENTATION_COMPLETE.md for deployment guide."
```

---

## 🎯 Recommended Commit Strategy

### Commit 1: Documentation Only (Safe)

```bash
git add SECURE_LICENSE_ARCHITECTURE.md
git add SECURE_LICENSE_IMPLEMENTATION_COMPLETE.md
git add SECURE_LICENSE_QUICK_START.md
git add MIGRATION_TO_SECURE_LICENSE.md
git add DEPLOYMENT_PIPELINE_EXPLAINED.md
git add SECURITY_AUDIT_SUMMARY.md
git add COMMIT_GUIDE.md

git commit -m "docs: Add secure license validation documentation and security audit"
```

**Why**: Safe to commit, doesn't change any code yet

### Commit 2: Backend Validation API (Deploy to Hetzner)

```bash
git add website/app/api/desktop/

git commit -m "feat: Add secure license validation API endpoints

- Add /api/desktop/validate-license endpoint
- Add /api/desktop/activate-license endpoint
- Add /api/desktop/deactivate-license endpoint
- Implement rate limiting (10 validations/min, 5 activations/min)
- Add input validation and error handling
- Add request logging for monitoring

This API allows desktop apps to validate licenses without embedding API keys."
```

**Why**: Deploys validation service to Hetzner, doesn't break existing desktop apps

### Commit 3: Secure Desktop Code (Future Use)

```bash
git add python-backend/modules/licensing_secure.py
git add src-tauri/src/python_bridge_secure.rs
git add .env.example.secure

git commit -m "feat: Add secure desktop license validation code

- Add licensing_secure.py (uses validation service, no API key)
- Add python_bridge_secure.rs (passes validation URL, not API key)
- Add .env.example.secure (configuration template)

These files replace the insecure versions that embed API keys.
Deployment: Rename *_secure files to replace current versions."
```

**Why**: Adds secure code without breaking current builds. You can test and deploy later.

### Commit 4: GitHub Actions Update (After Testing)

```bash
# Update workflow file to use VALIDATION_SERVICE_URL
# Then:
git add .github/workflows/build-desktop.yml

git commit -m "ci: Update desktop build to use validation service URL

Changes LEMONSQUEEZY_API_KEY to VALIDATION_SERVICE_URL in build.
Requires adding VALIDATION_SERVICE_URL to GitHub secrets before building."
```

**Why**: Only commit after you've tested secure desktop builds locally

---

## 🚀 Quick Commit (All at Once)

If you want to commit everything now:

```bash
cd D:/DKPlayground/offline-tools

# Clean up cache files
git restore python-backend/__pycache__/*.pyc

# Add all secure license files
git add website/app/api/desktop/
git add python-backend/modules/licensing_secure.py
git add src-tauri/src/python_bridge_secure.rs
git add .env.example.secure

# Add documentation
git add *.md

# Check status
git status

# Commit
git commit -m "feat: Implement secure license validation system

Core Changes:
- Add backend validation API (/api/desktop/* endpoints)
- Add secure desktop license module (licensing_secure.py)
- Add secure Rust bridge (python_bridge_secure.rs)
- Add rate limiting, input validation, error handling

Security:
- Fixes CRITICAL vulnerability: API key exposure in desktop binary
- API key now stays on server only
- Desktop apps call validation service instead of LemonSqueezy directly
- Implements server-side rate limiting and monitoring

Documentation:
- Complete architecture documentation
- Step-by-step migration guide
- Security audit summary
- Deployment pipeline explanation

This is Phase 1: Files are committed but not yet deployed.
See MIGRATION_TO_SECURE_LICENSE.md for deployment steps."

# Push to GitHub
git push origin main
```

---

## ⚠️ Important Notes

### About .github/workflows/build-desktop.yml

**Current state**: Adds `LEMONSQUEEZY_API_KEY` (the insecure method we're trying to replace)

**Options**:

**Option 1: Don't commit workflow changes yet** (RECOMMENDED)
```bash
# Restore the workflow file
git restore .github/workflows/build-desktop.yml

# Deploy secure version later after testing
```

**Option 2: Commit as transitional state**
```bash
# Commit current state (with API key)
git add .github/workflows/build-desktop.yml

# Later commit update to VALIDATION_SERVICE_URL
```

**Option 3: Update to secure version now**
```bash
# Edit the file to change LEMONSQUEEZY_API_KEY to VALIDATION_SERVICE_URL
# Then commit
```

I recommend **Option 1** - restore the workflow file and update it after you've tested the secure desktop builds locally.

### About Modified Component Files

Check what changed:

```bash
git diff scripts/build-with-env.ps1
git diff src/components/ActivationScreen.tsx
git diff src/components/ActivationWrapper.tsx
```

**If changes are unrelated to secure license validation**:
```bash
git restore scripts/build-with-env.ps1
git restore src/components/ActivationScreen.tsx
git restore src/components/ActivationWrapper.tsx
```

**If changes are related**:
```bash
git add scripts/build-with-env.ps1
git add src/components/ActivationScreen.tsx
git add src/components/ActivationWrapper.tsx
```

---

## 📝 Summary Commands

### Safe Commit (Documentation + Validation API)

```bash
# Clean up
git restore python-backend/__pycache__/*.pyc
git restore .github/workflows/build-desktop.yml

# Add files
git add website/app/api/desktop/
git add python-backend/modules/licensing_secure.py
git add src-tauri/src/python_bridge_secure.rs
git add .env.example.secure
git add *.md

# Commit
git commit -m "feat: Add secure license validation system"

# Push
git push origin main
```

**Result**:
- ✅ Validation API deploys to Hetzner automatically
- ✅ Secure desktop code is available in repo (not deployed yet)
- ✅ Documentation available
- ✅ No breaking changes to existing builds

---

## 🎯 Next Steps After Commit

1. **Wait for Hetzner deployment** (~5 min)
2. **Test validation API**:
   ```bash
   curl -X POST https://localtools.pro/api/desktop/validate-license \
     -H "Content-Type: application/json" \
     -d '{"license_key":"test"}'
   ```
3. **Add LEMONSQUEEZY_API_KEY to Hetzner** (see MIGRATION_TO_SECURE_LICENSE.md)
4. **Test locally** with secure desktop code
5. **Build and verify** (strings test)
6. **Update GitHub Actions** workflow
7. **Production release**

---

Need help with any of these steps? See the detailed guides:
- **MIGRATION_TO_SECURE_LICENSE.md** - Full deployment guide
- **SECURE_LICENSE_QUICK_START.md** - Quick reference
- **DEPLOYMENT_PIPELINE_EXPLAINED.md** - How deployment works
