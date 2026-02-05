# Cloudflare R2 Setup for Desktop Downloads

This guide explains how to set up Cloudflare R2 for hosting your desktop app downloads.

## Why R2?

- **No egress fees** - Pay only for storage, not downloads
- **Global CDN** - Fast downloads worldwide via Cloudflare's network
- **S3-compatible** - Easy to use with existing tools
- **Free tier** - 10GB storage, 10M Class A ops, 1M Class B ops/month

## Step 1: Create Cloudflare Account & R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Create an account if you don't have one
3. Navigate to **R2 Object Storage** in the sidebar
4. Click **Create bucket**
5. Name: `local-tools-downloads` (or your preferred name)
6. Location: **Automatic** (recommended) or choose region

## Step 2: Enable Public Access

### Option A: R2.dev Subdomain (Quick Setup)

1. Go to your bucket → **Settings**
2. Find **R2.dev subdomain**
3. Click **Allow Access**
4. Your public URL will be: `https://pub-XXXXX.r2.dev/`

### Option B: Custom Domain (Recommended for Production)

1. Go to your bucket → **Settings** → **Custom Domains**
2. Add domain: `downloads.localtools.pro`
3. Cloudflare will automatically configure DNS
4. Your public URL will be: `https://downloads.localtools.pro/`

## Step 3: Create API Token for GitHub Actions

1. Go to Cloudflare Dashboard → **R2 Object Storage**
2. Click **Manage R2 API Tokens** (or go to My Profile → API Tokens)
3. Click **Create API Token**
4. Select **R2 Token** template or create custom:
   - **Permissions**: `Object Read & Write`
   - **Specify bucket(s)**: Select your bucket
5. Click **Create Token**
6. **Save these values** (shown only once):
   - Access Key ID
   - Secret Access Key

## Step 4: Add GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**

Add these secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `R2_ACCESS_KEY_ID` | Your access key | From Step 3 |
| `R2_SECRET_ACCESS_KEY` | Your secret key | From Step 3 |
| `R2_ACCOUNT_ID` | Your Cloudflare account ID | Found in dashboard URL or R2 overview |
| `R2_BUCKET_NAME` | `local-tools-downloads` | Your bucket name |

### Finding Your Account ID

Your Cloudflare Account ID is in the URL when you're in the dashboard:
```
https://dash.cloudflare.com/ACCOUNT_ID_HERE/...
```

Or go to **R2 Overview** and look for "Account ID" in the sidebar.

## Step 5: Configure Environment Variables

Add to your website's `.env.local` and production environment:

```bash
# For R2.dev subdomain
DOWNLOAD_URL_WINDOWS=https://pub-XXXXX.r2.dev/latest/Local-Tools-Setup.exe
DOWNLOAD_URL_MAC=https://pub-XXXXX.r2.dev/latest/Local-Tools.dmg
DOWNLOAD_URL_LINUX=https://pub-XXXXX.r2.dev/latest/Local-Tools.AppImage

# OR for custom domain
DOWNLOAD_URL_WINDOWS=https://downloads.localtools.pro/latest/Local-Tools-Setup.exe
DOWNLOAD_URL_MAC=https://downloads.localtools.pro/latest/Local-Tools.dmg
DOWNLOAD_URL_LINUX=https://downloads.localtools.pro/latest/Local-Tools.AppImage
```

## How It Works

### Automatic Upload Flow

```
Push to main or create tag (v1.0.0)
         ↓
GitHub Actions builds Windows, macOS, Linux
         ↓
upload-to-r2 job downloads artifacts
         ↓
rclone uploads to R2 bucket:
  - /latest/Local-Tools-Setup.exe
  - /latest/Local-Tools.dmg
  - /latest/Local-Tools.AppImage
         ↓
If version tag, also uploads to:
  - /v1.0.0/Local-Tools-Setup-v1.0.0.exe
  - /v1.0.0/Local-Tools-v1.0.0.dmg
  - /v1.0.0/Local-Tools-v1.0.0.AppImage
```

### User Download Flow

```
User visits /download page
         ↓
Clicks "Download for Windows"
         ↓
/api/download/windows redirects to:
https://downloads.localtools.pro/latest/Local-Tools-Setup.exe
         ↓
Browser downloads directly from Cloudflare CDN
```

## Folder Structure in R2

```
local-tools-downloads/
├── latest/                          # Always contains the latest version
│   ├── Local-Tools-Setup.exe
│   ├── Local-Tools.dmg
│   └── Local-Tools.AppImage
├── v1.0.0/                          # Versioned releases
│   ├── Local-Tools-Setup-v1.0.0.exe
│   ├── Local-Tools-v1.0.0.dmg
│   └── Local-Tools-v1.0.0.AppImage
├── v1.1.0/
│   └── ...
```

## Manual Upload (First Time)

If you need to upload files manually before the workflow runs:

### Using Cloudflare Dashboard

1. Go to your R2 bucket
2. Click **Upload**
3. Create `latest` folder
4. Upload your files

### Using rclone CLI

```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Configure (interactive)
rclone config

# Or create config manually
cat > ~/.config/rclone/rclone.conf << EOF
[r2]
type = s3
provider = Cloudflare
access_key_id = YOUR_ACCESS_KEY
secret_access_key = YOUR_SECRET_KEY
endpoint = https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
EOF

# Upload files
rclone copy ./Local-Tools-Setup.exe r2:local-tools-downloads/latest/
rclone copy ./Local-Tools.dmg r2:local-tools-downloads/latest/
rclone copy ./Local-Tools.AppImage r2:local-tools-downloads/latest/

# List files
rclone ls r2:local-tools-downloads/latest/
```

## Troubleshooting

### "Access Denied" when downloading

- Check that public access is enabled (R2.dev subdomain or custom domain)
- Verify the file path is correct

### GitHub Action fails

- Check that all 4 secrets are set correctly
- Verify Account ID format (should be alphanumeric)
- Check R2 API token has correct permissions

### Files not updating

- R2 has no caching by default, but your CDN might
- Try appending `?v=timestamp` to force refresh
- Check that the workflow actually ran and succeeded

## Cost Estimate

For a typical desktop app with moderate downloads:

| Usage | Free Tier | Cost if exceeded |
|-------|-----------|------------------|
| Storage | 10 GB | $0.015/GB/month |
| Class A (uploads) | 1M | $4.50/million |
| Class B (downloads) | 10M | $0.36/million |
| **Egress** | **Unlimited** | **$0** |

For 10,000 downloads/month of 150MB files = **$0** (within free tier)
