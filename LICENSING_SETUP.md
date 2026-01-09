# Desktop App Licensing Setup Guide

This guide explains how to configure license validation for the desktop application.

## Overview

The desktop app uses **LemonSqueezy** for subscription-based licensing. License validation happens through the Python backend, which communicates with the LemonSqueezy API.

## Problem & Solution

### The Issue
When customers download the desktop app and try to activate their license, they get:
```
License service is not configured. Please contact support.
```

This happens because the app needs the `LEMONSQUEEZY_API_KEY` to validate licenses, but it wasn't being passed to the Python backend.

### The Fix
The fix involves:
1. **Modified `python_bridge.rs`** to pass the `LEMONSQUEEZY_API_KEY` environment variable to the Python sidecar
2. **Created build scripts** that load the API key from a `.env` file during the build process
3. **Embedded the API key** in the built application

## Setup Instructions

### For Development

1. **Create a `.env` file** in the project root:
   ```bash
   cp .env.example .env
   ```

2. **Add your LemonSqueezy API key** to `.env`:
   ```
   LEMONSQUEEZY_API_KEY=your_actual_api_key_here
   ```

   Get your API key from: https://app.lemonsqueezy.com/settings/api

3. **Run the app in development mode**:
   ```bash
   # Windows
   $env:LEMONSQUEEZY_API_KEY="your_key_here"
   npm run tauri dev

   # Or load from .env manually
   # PowerShell:
   Get-Content .env | ForEach-Object {
       if ($_ -match '^([^#][^=]+)=(.*)$') {
           [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim().Trim('"'), 'Process')
       }
   }
   npm run tauri dev
   ```

### For Production Build

**Windows:**
```bash
npm run tauri:build:production
```

**Linux/macOS:**
```bash
npm run tauri:build:production:unix
```

These scripts will:
- Load the `.env` file
- Verify the `LEMONSQUEEZY_API_KEY` is set
- Bundle Tesseract OCR
- Build the Tauri app with the API key embedded

### Manual Build (Alternative)

If you prefer to build manually:

**Windows PowerShell:**
```powershell
# Set the environment variable
$env:LEMONSQUEEZY_API_KEY="your_key_here"

# Bundle and build
npm run bundle:tesseract:win
npm run tauri build
```

**Linux/macOS:**
```bash
# Set the environment variable
export LEMONSQUEEZY_API_KEY="your_key_here"

# Bundle and build
npm run bundle:tesseract:unix
npm run tauri build
```

## How It Works

### Architecture

```
Desktop App (Frontend)
    ↓
Rust Bridge (python_bridge.rs)
    ↓ [passes LEMONSQUEEZY_API_KEY via env]
Python Sidecar (main.py)
    ↓
Licensing Module (licensing.py)
    ↓
LemonSqueezy API
```

### Code Changes

**`src-tauri/src/python_bridge.rs` (Lines 44-52):**
```rust
let mut sidecar_command = app_handle.shell().sidecar("python-backend").unwrap();

// Pass LEMONSQUEEZY_API_KEY to Python backend if available
if let Ok(api_key) = std::env::var("LEMONSQUEEZY_API_KEY") {
    sidecar_command = sidecar_command.env("LEMONSQUEEZY_API_KEY", api_key);
}
```

The Rust code now:
1. Reads `LEMONSQUEEZY_API_KEY` from the environment
2. Passes it to the Python sidecar process
3. Python backend can then validate licenses with the LemonSqueezy API

## Testing License Activation

### With Real API Key

1. Build the app with the production scripts
2. Run the built installer
3. Enter a real subscription ID from LemonSqueezy
4. The app should activate successfully

### With Mock/Test Mode (Development Only)

For development testing without a real API key:

1. Set environment variable:
   ```powershell
   $env:DEV_MOCK_LICENSE="true"
   ```

2. Run the app:
   ```bash
   npm run tauri dev
   ```

3. Enter a license key starting with `test_` (e.g., `test_12345`)
4. The app will activate in mock mode (expires in 1 year)

**Important:** Mock mode only works when `DEV_MOCK_LICENSE=true` is set. This prevents accidental mock activation in production.

## Troubleshooting

### Error: "License service is not configured"

**Cause:** The `LEMONSQUEEZY_API_KEY` environment variable is not set or not being passed to the Python backend.

**Solutions:**
- **Development:** Set the environment variable before running `npm run tauri dev`
- **Production:** Use the `npm run tauri:build:production` script to build with the `.env` file
- **Verify:** Check that `.env` file exists and contains the API key

### Error: "API Error: 401"

**Cause:** The API key is invalid or has been revoked.

**Solutions:**
- Verify the API key at https://app.lemonsqueezy.com/settings/api
- Regenerate the API key if necessary
- Update the `.env` file with the new key

### Error: "Subscription status: expired" or "cancelled"

**Cause:** The subscription is no longer active.

**Solutions:**
- Check the subscription status in the LemonSqueezy dashboard
- Customer needs to renew their subscription

## Security Considerations

### API Key Storage

⚠️ **Important Security Notes:**

1. **Never commit `.env` to Git** (already in `.gitignore`)
2. **The API key is embedded in the built binary** - this is intentional for desktop apps
3. **Desktop apps are client-side** - treat the API key as "public" once distributed
4. **Use LemonSqueezy's built-in security features**:
   - Rate limiting
   - Instance limits
   - Subscription validation

### Best Practices

1. **Separate API keys** for development and production
2. **Rotate API keys** periodically
3. **Monitor API usage** in LemonSqueezy dashboard
4. **Set appropriate instance limits** per subscription in LemonSqueezy

## Additional Notes

### Grace Period

The licensing system includes a **7-day grace period** for expired subscriptions:
- Allows users to continue using the app if their subscription expires
- Gives time for payment issues to be resolved
- Defined in `python-backend/modules/licensing.py:16`

### Offline Mode

License validation uses a **local cache**:
- First check: validates with LemonSqueezy API
- Subsequent checks: uses cached license (with periodic re-validation)
- Defined in `src/utils/licenseCache.ts`

### Subscription vs One-Time License

The system supports both:
- **Subscription-based** (recommended): Auto-renewing, expires after period
- **Legacy one-time licenses**: No expiration (backward compatibility)

## Support

For issues or questions:
- Check the LemonSqueezy documentation: https://docs.lemonsqueezy.com
- Review the code in `python-backend/modules/licensing.py`
- Contact LemonSqueezy support for API-related issues
