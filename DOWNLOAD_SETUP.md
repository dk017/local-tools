# Download & License Setup Guide

This guide explains how to set up the complete purchase-to-activation flow.

## ✅ What's Done

1. **Download Page** (`/download`) - Shows platform-specific downloads
2. **Thank You Page** (`/thank-you`) - Post-purchase success page with license key
3. **Download API Routes** (`/api/download/[platform]`) - Redirects to actual downloads

---

## 📋 Next Steps

### 1. Update LemonSqueezy Product Settings

Go to: **LemonSqueezy Dashboard → Products → Local Tools Desktop Suite**

#### Enable License Keys
```
☑️ Generate license keys
```

#### Confirmation Modal
- **Title:** `🎉 Thank you for your purchase!`
- **Message:**
  ```
  Your license key has been generated and sent to your email.

  License Key: {license_key}

  Please save this key - you'll need it to activate the desktop app.
  ```
- **Button text:** `Download Desktop App`
- **Button link:** `https://localtools.pro/download`

#### Email Receipt
- **Thank you note:**
  ```
  Welcome to Local Tools Desktop Suite! 🎉

  Your License Key: {license_key}

  ⚠️ IMPORTANT: Save this key in a safe place.

  ACTIVATION STEPS:
  1. Download the desktop app from the button below
  2. Install and open Local Tools
  3. Enter your license key when prompted
  4. Click "Activate" to unlock all features

  Need help? Reply to this email or visit localtools.pro/support
  ```
- **Button text:** `Download Desktop App`
- **Button link:** `https://localtools.pro/download`

---

### 2. Build & Publish Desktop App Installers

#### Option A: GitHub Releases (Recommended)

1. **Build installers:**
   ```bash
   npm run tauri:build
   ```

2. **Create GitHub Release:**
   - Go to: https://github.com/yourusername/local-tools/releases/new
   - Tag version: `v1.0.0`
   - Title: `Local Tools Desktop v1.0.0`
   - Upload these files:
     - `Local-Tools-Setup.exe` (Windows)
     - `Local-Tools.dmg` (macOS)
     - `Local-Tools.AppImage` (Linux)

3. **Update download URLs** in `.env`:
   ```bash
   DOWNLOAD_URL_WINDOWS=https://github.com/yourusername/local-tools/releases/latest/download/Local-Tools-Setup.exe
   DOWNLOAD_URL_MAC=https://github.com/yourusername/local-tools/releases/latest/download/Local-Tools.dmg
   DOWNLOAD_URL_LINUX=https://github.com/yourusername/local-tools/releases/latest/download/Local-Tools.AppImage
   ```

#### Option B: Self-Host on Hetzner

1. **Upload installers to server:**
   ```bash
   scp installers/* root@65.108.243.208:/var/www/downloads/
   ```

2. **Configure nginx** to serve `/downloads` directory

3. **Update .env:**
   ```bash
   DOWNLOAD_URL_WINDOWS=https://localtools.pro/downloads/Local-Tools-Setup.exe
   DOWNLOAD_URL_MAC=https://localtools.pro/downloads/Local-Tools.dmg
   DOWNLOAD_URL_LINUX=https://localtools.pro/downloads/Local-Tools.AppImage
   ```

---

### 3. Set Up Email (Later)

For now, LemonSqueezy sends receipt emails. Later you can add:

#### Option 1: Namecheap Email Forwarding (Free)
- Forward `support@localtools.pro` → your personal email
- Reply from personal email (appears as your address)

#### Option 2: Google Workspace ($6/month)
- Professional email: `support@localtools.pro`
- Full Gmail interface

#### Option 3: Resend (Free tier: 3k emails/month)
- Automated license key delivery
- Welcome sequences
- Support ticket system

---

## 🧪 Testing the Full Flow

1. **Make a test purchase** on LemonSqueezy
2. **Should see:**
   - Confirmation modal with license key
   - Redirect to `/thank-you?license_key=XXXXX`
   - Email with license key and download link
3. **Click "Download Desktop App"**
4. **Choose platform** (Windows/Mac/Linux)
5. **Download should start** (currently redirects to GitHub - update URLs first!)

---

## 🔧 Current Status

| Component | Status | Action Needed |
|-----------|--------|---------------|
| Download page | ✅ Created | Deploy to production |
| Thank you page | ✅ Created | Deploy to production |
| Download API routes | ✅ Created | Deploy to production |
| LemonSqueezy config | ❌ Pending | Update settings in dashboard |
| Desktop app builds | ❌ Pending | Build & publish installers |
| Download URLs | ❌ Pending | Update .env with real URLs |
| Email setup | ⏳ Optional | Use LemonSqueezy emails for now |

---

## 📦 Commit & Deploy

```bash
# Commit new pages
git add website/app/\[locale\]/download website/app/\[locale\]/thank-you website/app/api/download
git commit -m "Add download page, thank you page, and download routes"
git push origin main

# Deploy to production (auto-deploys via GitHub Actions)
```

---

## 📧 Email Setup Guide (Optional - Do Later)

### Quick Setup with Namecheap

1. **Namecheap Dashboard** → Your Domain → Advanced DNS
2. **Add Email Records:**
   ```
   Type: MX Record
   Host: @
   Value: mx1.privateemail.com
   Priority: 10
   ```
3. **Create Email:** `support@localtools.pro`
4. **Set up forwarding** to your personal email

### Professional Setup with Google Workspace

1. **Sign up:** https://workspace.google.com
2. **Verify domain ownership**
3. **Update DNS records** (Google provides)
4. **Create:** `support@localtools.pro`
5. **Cost:** $6/user/month

---

## 🚀 Priority Order

1. ✅ **Deploy pages** (download, thank-you) - Do this now
2. ⚠️ **Update LemonSqueezy settings** - Takes 5 minutes
3. ⚠️ **Build desktop installers** - Takes 30 minutes
4. ⚠️ **Publish to GitHub Releases** - Takes 10 minutes
5. 🔵 **Set up email** - Do later when needed

---

Need help with any of these steps? Let me know!
