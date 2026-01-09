# Deployment Pipeline Explained

**Your Current Setup**: You have TWO separate deployment workflows

---

## 📊 Overview: Two Independent Pipelines

```
When you push to GitHub main branch:
    │
    ├─> Workflow 1: Deploy Website to Hetzner (deploy.yml)
    │   └─> Updates your WEBSITE (localtools.pro)
    │
    └─> Workflow 2: Build Desktop Apps (build-desktop.yml)
        └─> Creates INSTALLERS (Windows/Mac/Linux)
```

**IMPORTANT**: These are **separate** processes. They do NOT interact with each other.

---

## 🌐 Workflow 1: Deploy Website to Hetzner

**File**: `.github/workflows/deploy.yml`

### What Happens When You Push to Main

```
1. GitHub Action Triggers
   └─> On push to main branch
   └─> Or manual trigger

2. Connects to Your Hetzner Server
   └─> Uses SSH key (HETZNER_SSH_KEY secret)
   └─> Connects to IP (HETZNER_SERVER_IP secret)

3. On Hetzner Server (Remote):
   ├─> cd ~/local-tools
   ├─> git pull origin main              (Gets latest code)
   ├─> docker compose down               (Stops old containers)
   ├─> docker compose build              (Rebuilds images)
   └─> docker compose up -d              (Starts new containers)

4. Your Website is Updated
   └─> https://localtools.pro now runs the new code
```

### What Gets Deployed to Hetzner

**Web Application Only**:
- ✅ Next.js website (`website/` folder)
- ✅ Python FastAPI backend (`python-backend/` folder)
- ✅ Docker containers running on Hetzner
- ✅ The validation API endpoints we just created

**NOT Deployed to Hetzner**:
- ❌ Desktop application (Tauri app)
- ❌ Desktop installers (MSI, DMG, AppImage)

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  GitHub Repository                                           │
│  (main branch)                                               │
└──────────────────┬──────────────────────────────────────────┘
                   │ Push triggers deploy.yml
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  GitHub Actions Runner                                       │
│  - Sets up SSH                                               │
│  - Connects to Hetzner server                                │
└──────────────────┬──────────────────────────────────────────┘
                   │ SSH connection
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  Hetzner Server (Your VPS)                                   │
│                                                              │
│  1. cd ~/local-tools                                         │
│  2. git pull origin main         ← Gets your code            │
│  3. docker compose down          ← Stops old version         │
│  4. docker compose build         ← Builds new containers     │
│  5. docker compose up -d         ← Starts new version        │
│                                                              │
│  Running Containers:                                         │
│  ├─> Frontend (Next.js)         Port 3000                   │
│  ├─> Backend (FastAPI)          Port 8000                   │
│  └─> Nginx (Reverse Proxy)      Port 80/443                 │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
              Your Website
          https://localtools.pro
```

---

## 💻 Workflow 2: Build Desktop Apps

**File**: `.github/workflows/build-desktop.yml`

### What Happens When You Push to Main

```
1. GitHub Action Triggers
   └─> On push to main branch
   └─> On version tags (v1.0.0, etc.)
   └─> Or manual trigger

2. Three Parallel Build Jobs Start:
   ├─> Windows (runs on windows-latest)
   ├─> Linux (runs on ubuntu-latest)
   └─> macOS (runs on macos-latest)

3. Each Job Builds Desktop Installer:
   ├─> Installs Node.js, Rust, Python
   ├─> Bundles Python backend (PyInstaller)
   ├─> Bundles Tesseract OCR
   ├─> Builds frontend (Vite)
   └─> Builds Tauri app (creates installer)

4. Uploads Artifacts to GitHub:
   ├─> Windows: .msi and .exe files
   ├─> Linux: .deb, .AppImage, .rpm files
   └─> macOS: .dmg and .app files

5. (Optional) Creates GitHub Release
   └─> Only if you pushed a version tag (v1.0.0)
```

### What Gets Built

**Desktop Installers**:
- ✅ Windows installer (.msi, .exe)
- ✅ Linux packages (.deb, .AppImage, .rpm)
- ✅ macOS installer (.dmg)

**Stored on GitHub**:
- ✅ As workflow artifacts (400 days retention)
- ✅ As GitHub releases (permanent, if tagged)

**NOT Deployed Anywhere**:
- ❌ These installers are NOT automatically distributed
- ❌ NOT deployed to Hetzner
- ❌ NOT deployed to your website
- ❌ Users must download them manually

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  GitHub Repository (main branch)                             │
└──────────────────┬──────────────────────────────────────────┘
                   │ Push triggers build-desktop.yml
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  GitHub Actions (3 Parallel Runners)                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Windows      │  │ Linux        │  │ macOS        │     │
│  │ Runner       │  │ Runner       │  │ Runner       │     │
│  │              │  │              │  │              │     │
│  │ 1. Setup     │  │ 1. Setup     │  │ 1. Setup     │     │
│  │ 2. Install   │  │ 2. Install   │  │ 2. Install   │     │
│  │ 3. Build     │  │ 3. Build     │  │ 3. Build     │     │
│  │ 4. Package   │  │ 4. Package   │  │ 4. Package   │     │
│  │              │  │              │  │              │     │
│  │ Output:      │  │ Output:      │  │ Output:      │     │
│  │ .msi, .exe   │  │ .deb, .rpm   │  │ .dmg, .app   │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            ▼                                 │
│                   Upload as Artifacts                        │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  GitHub Artifacts / Releases                                 │
│                                                              │
│  Available for Download:                                     │
│  - Actions → Workflow Run → Artifacts                        │
│  - OR: Releases page (if version tagged)                     │
│                                                              │
│  ⚠️ NOT automatically deployed anywhere                      │
│  ⚠️ Users must manually download                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Complete Flow When You Push to Main

Here's what happens step-by-step:

```
You: git push origin main
│
├─> GitHub receives push
│   │
│   ├─> Trigger 1: deploy.yml starts
│   │   └─> SSH to Hetzner
│   │       └─> Pull code
│   │       └─> Rebuild Docker containers
│   │       └─> Restart website
│   │       └─> ✅ Website updated at localtools.pro
│   │
│   └─> Trigger 2: build-desktop.yml starts (in parallel)
│       └─> Build Windows installer (15-20 min)
│       └─> Build Linux installer (15-20 min)
│       └─> Build macOS installer (15-20 min)
│       └─> Upload artifacts to GitHub
│       └─> ✅ Installers available for download
│
└─> Both workflows complete independently
```

**Timeline**:
- Website deployment: ~5 minutes
- Desktop builds: ~20 minutes (all 3 platforms)

---

## 🎯 What Gets Updated Where

### Hetzner Server (Automatic)

**When**: Every push to main
**What**: Web application
**How**: Docker containers rebuilt and restarted

```
Components on Hetzner:
├─> Next.js Website (localtools.pro)
│   ├─> Homepage
│   ├─> Tool pages
│   └─> NEW: Validation API endpoints (/api/desktop/*)
│
└─> Python Backend
    ├─> PDF/Image processing endpoints
    ├─> Webhook handlers
    └─> File processing
```

**User Access**: Anyone visiting https://localtools.pro

### GitHub Artifacts (Automatic)

**When**: Every push to main
**What**: Desktop installers
**How**: Built by GitHub Actions, stored as artifacts

```
Desktop Installers (not deployed, just stored):
├─> Windows
│   ├─> Local Tools_0.1.0_x64_en-US.msi
│   └─> Local Tools_0.1.0_x64-setup.exe
│
├─> Linux
│   ├─> local-tools_0.1.0_amd64.deb
│   ├─> local-tools_0.1.0_amd64.AppImage
│   └─> local-tools-0.1.0-1.x86_64.rpm
│
└─> macOS
    ├─> Local Tools_0.1.0_x64.dmg
    └─> Local Tools_0.1.0_x64.app.tar.gz
```

**User Access**: Must download from GitHub Actions page or Releases

---

## 📦 How Users Get Desktop App

### Current Process (Manual)

1. **You build** → GitHub Actions creates installers
2. **You download** → From GitHub Actions artifacts
3. **You distribute** → Send to users via:
   - Email
   - Download link on your website
   - File hosting service
   - GitHub Releases page

### Recommended Process (GitHub Releases)

**To create a release with permanent download links:**

```bash
# Tag a version
git tag v1.0.0
git push origin v1.0.0

# This triggers:
# 1. Desktop build workflow
# 2. Creates GitHub Release automatically
# 3. Uploads all installers to the release
# 4. Users can download from:
#    https://github.com/your-user/offline-tools/releases/tag/v1.0.0
```

**GitHub Release provides**:
- ✅ Permanent download links
- ✅ Automatic changelog
- ✅ Download statistics
- ✅ Professional distribution

---

## 🔐 Secrets Required

### For Hetzner Deployment (deploy.yml)

In GitHub repository → Settings → Secrets:

```
HETZNER_SSH_KEY       = Your SSH private key
HETZNER_SERVER_IP     = Your server IP address
```

### For Desktop Build (build-desktop.yml)

**Current** (INSECURE - needs update):
```
LEMONSQUEEZY_API_KEY  = Your API key (❌ embeds in binary)
```

**NEW** (SECURE - after implementing secure validation):
```
VALIDATION_SERVICE_URL = https://localtools.pro/api/desktop
```

### For Website (Hetzner server)

**On your Hetzner server** in `.env` or `docker-compose.prod.yml`:
```
LEMONSQUEEZY_API_KEY     = Your API key (server-side only)
DATABASE_URL             = Your database connection
NEXTAUTH_SECRET          = Your auth secret
```

---

## 🚀 Deployment Scenarios

### Scenario 1: You Push Code Changes

```
git add .
git commit -m "Fix bug"
git push origin main
```

**Result**:
- ✅ Website auto-deploys to Hetzner (~5 min)
- ✅ Desktop installers built (~20 min)
- ❌ Desktop users still have old version
- 👉 You need to manually distribute new installers

### Scenario 2: You Create a Release

```
git tag v1.0.1
git push origin v1.0.1
```

**Result**:
- ✅ Website auto-deploys to Hetzner
- ✅ Desktop installers built
- ✅ GitHub Release created automatically
- ✅ Users can download from releases page
- 👉 You share the release URL with users

### Scenario 3: You Only Want Desktop Build

**Manual trigger** on GitHub:
1. Go to Actions tab
2. Select "Build Desktop App"
3. Click "Run workflow"
4. Select branch
5. Run

**Result**:
- ❌ Website NOT deployed
- ✅ Desktop installers built
- ✅ Available in artifacts

### Scenario 4: You Only Want Website Deploy

**Option 1**: Push to a different branch temporarily
**Option 2**: Disable desktop workflow temporarily
**Option 3**: Just let both run (website is fast ~5 min)

---

## 🔧 Current vs. Secure Architecture

### Current (Before Secure License Implementation)

```
Website on Hetzner:
├─> Next.js frontend
├─> Python backend
└─> No validation API yet

Desktop App:
├─> Has LEMONSQUEEZY_API_KEY embedded ❌
├─> Calls LemonSqueezy directly
└─> Security risk!

GitHub Actions:
└─> Passes LEMONSQUEEZY_API_KEY to build ❌
```

### After Secure License Implementation

```
Website on Hetzner:
├─> Next.js frontend
├─> Python backend
└─> NEW: Validation API (/api/desktop/*) ✅
    ├─> Has LEMONSQUEEZY_API_KEY (server-only) ✅
    ├─> Rate limiting
    └─> Secure endpoints

Desktop App:
├─> NO API key ✅
├─> Calls YOUR validation API ✅
└─> Secure! ✅

GitHub Actions:
└─> Passes VALIDATION_SERVICE_URL ✅
```

---

## 📋 What You Need to Do

### To Deploy Secure License Validation

**Step 1: Deploy Website (includes validation API)**

```bash
# The validation API code is already in your repo
# Just push to trigger deployment:

git add .
git commit -m "Add secure license validation API"
git push origin main

# Wait ~5 minutes
# Check: https://localtools.pro/api/desktop/validate-license
```

**Step 2: Add Environment Variable on Hetzner**

SSH to your server and add `LEMONSQUEEZY_API_KEY`:

```bash
ssh root@your-hetzner-ip

# Edit your environment file
cd ~/local-tools
nano .env.production  # or wherever you store env vars

# Add:
LEMONSQUEEZY_API_KEY=your_actual_api_key

# Restart containers
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

**Step 3: Update Desktop App Code**

```bash
# Replace files as documented
mv python-backend/modules/licensing.py licensing_old.py
mv python-backend/modules/licensing_secure.py licensing.py

mv src-tauri/src/python_bridge.rs python_bridge_old.rs
mv src-tauri/src/python_bridge_secure.rs python_bridge.rs

# Update your domain in python_bridge.rs line 50
# Change: "https://yourwebsite.com"
# To: "https://localtools.pro"
```

**Step 4: Update GitHub Secret**

1. Go to GitHub → Settings → Secrets
2. Delete `LEMONSQUEEZY_API_KEY` (or keep for now)
3. Add `VALIDATION_SERVICE_URL` = `https://localtools.pro/api/desktop`

**Step 5: Update Workflow**

Edit `.github/workflows/build-desktop.yml`:
- Change env variable from `LEMONSQUEEZY_API_KEY` to `VALIDATION_SERVICE_URL`

**Step 6: Push and Build**

```bash
git add .
git commit -m "Implement secure license validation"
git push origin main

# Wait for builds
# Download and test installers
# Verify NO API key in binary (strings test)
```

---

## 🎬 Summary

**Your Current Setup**:

1. **Website Deployment** (Hetzner)
   - Automatic on every push to main
   - ~5 minutes
   - Updates https://localtools.pro

2. **Desktop Build** (GitHub Actions)
   - Automatic on every push to main
   - ~20 minutes
   - Creates installers stored on GitHub
   - NOT automatically distributed

**They are independent**:
- Website updates don't affect desktop users
- Desktop builds don't affect website
- Both run in parallel when you push

**Next Step**: Implement secure license validation which updates BOTH:
- Website gets validation API endpoints
- Desktop app gets secure license code
- API key stays on server only

---

## ❓ Common Questions

**Q: If I push now, will desktop users get the new validation API?**
A: No. Website gets updated, but desktop users still have old installed version. They need to download and install new version.

**Q: How do I distribute new desktop versions?**
A: Create a GitHub Release (tag v1.0.0) and share the release URL, or download artifacts and host on your website.

**Q: Will the secure license validation work for existing desktop installs?**
A: No. Old desktop apps have old code. Users must install new version that uses validation service.

**Q: Do I need to rebuild desktop apps every time I update the website?**
A: No. Only if you change desktop app code. Website changes don't affect desktop.

**Q: Can I disable desktop builds temporarily?**
A: Yes. Add `if: false` to the build-desktop.yml jobs, or just let them run (they're in parallel).

---

For deployment, see: `MIGRATION_TO_SECURE_LICENSE.md`
