# Secure License Validation Architecture

**Date**: 2026-01-09
**Status**: Implementation Plan
**Priority**: P0 (CRITICAL - Blocks Production Release)

---

## Problem Statement

Currently, the `LEMONSQUEEZY_API_KEY` is embedded in the desktop application binary, making it extractable by anyone with basic tools:

```bash
# Anyone can do this:
strings "Local Tools.exe" | grep "lemon"
# Output: Your API key in plaintext
```

**Impact**: Attackers can:
- Make unlimited API calls on your account
- Activate fake licenses
- Cause financial damage
- Compromise your LemonSqueezy account

---

## Solution: Backend Validation Service

### Architecture Overview

```
┌─────────────────────┐
│   Desktop App       │
│   (No API Key)      │
│                     │
│   User enters key → │
└──────────┬──────────┘
           │ HTTPS
           │ POST /api/validate-license
           │ { "license_key": "xxxx", "instance_id": "..." }
           ▼
┌─────────────────────┐
│  Validation Server  │  ← Your Backend (Node.js/Python)
│  (Has API Key)      │
│                     │
│  - Validates format │
│  - Checks cache     │
│  - Rate limits      │
└──────────┬──────────┘
           │ HTTPS
           │ LemonSqueezy API
           ▼
┌─────────────────────┐
│   LemonSqueezy      │
│   API               │
└─────────────────────┘
```

**Benefits**:
- ✅ API key never leaves your server
- ✅ Rate limiting prevents brute force
- ✅ Caching reduces API calls
- ✅ Server-side revocation
- ✅ Usage analytics
- ✅ Can add business logic (trial extensions, grace periods, etc.)

---

## Implementation Options

### Option A: Deploy on Existing Next.js Website (RECOMMENDED)

**Advantages**:
- Uses existing infrastructure (website/app/)
- Already has Next.js API routes
- Easy to deploy (Vercel, Netlify, etc.)
- Can share database with website
- Minimal new infrastructure

**Implementation**:
```typescript
// website/app/api/desktop/validate-license/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { license_key, instance_id } = await request.json();

  // Validate with LemonSqueezy
  const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
    },
    body: JSON.stringify({ license_key, instance_id }),
  });

  const data = await response.json();
  return NextResponse.json(data);
}
```

### Option B: Standalone Validation Service

**Advantages**:
- Separate concerns (website vs desktop licensing)
- Can use different tech stack
- Easier to scale independently
- More control over security

**Implementation**: Create new Express.js or FastAPI service

---

## Recommended Approach: Option A (Next.js API Route)

Let's implement validation endpoints in your existing Next.js website.

### Step 1: Create API Endpoints

**File**: `website/app/api/desktop/validate-license/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Rate limiting (simple in-memory, use Redis for production)
const rateLimiter = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // 10 requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimiter.get(ip);

  if (!record || now > record.resetAt) {
    rateLimiter.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const headersList = headers();
    const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Validate input
    const body = await request.json();
    const { license_key, instance_id } = body;

    if (!license_key || typeof license_key !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid license key format' },
        { status: 400 }
      );
    }

    // Validate with LemonSqueezy
    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    if (!apiKey) {
      console.error('LEMONSQUEEZY_API_KEY not configured');
      return NextResponse.json(
        { success: false, error: 'License service temporarily unavailable' },
        { status: 503 }
      );
    }

    const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        license_key,
        instance_id: instance_id || undefined,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { success: false, error: errorData.error || 'License validation failed' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Return sanitized response (don't leak API key or sensitive info)
    return NextResponse.json({
      success: true,
      valid: data.valid,
      license_key: {
        status: data.license_key?.status,
        status_formatted: data.license_key?.status_formatted,
        activation_usage: data.license_key?.activation_usage,
        activation_limit: data.license_key?.activation_limit,
        expires_at: data.license_key?.expires_at,
      },
      instance: data.instance,
      meta: data.meta,
    });

  } catch (error) {
    console.error('License validation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**File**: `website/app/api/desktop/activate-license/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Reuse rate limiter from validate-license
const rateLimiter = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5; // 5 activations per minute
const RATE_WINDOW = 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimiter.get(ip);

  if (!record || now > record.resetAt) {
    rateLimiter.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const headersList = headers();
    const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Validate input
    const body = await request.json();
    const { license_key, instance_name } = body;

    if (!license_key || typeof license_key !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid license key format' },
        { status: 400 }
      );
    }

    // Activate with LemonSqueezy
    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    if (!apiKey) {
      console.error('LEMONSQUEEZY_API_KEY not configured');
      return NextResponse.json(
        { success: false, error: 'License service temporarily unavailable' },
        { status: 503 }
      );
    }

    const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/activate', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        license_key,
        instance_name: instance_name || 'Desktop App',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { success: false, error: errorData.error || 'License activation failed' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Return sanitized response
    return NextResponse.json({
      success: true,
      activated: data.activated,
      license_key: {
        status: data.license_key?.status,
        activation_usage: data.license_key?.activation_usage,
        activation_limit: data.license_key?.activation_limit,
      },
      instance: data.instance,
      meta: data.meta,
    });

  } catch (error) {
    console.error('License activation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**File**: `website/app/api/desktop/deactivate-license/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { license_key, instance_id } = body;

    if (!license_key || !instance_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'License service temporarily unavailable' },
        { status: 503 }
      );
    }

    const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/deactivate', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ license_key, instance_id }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { success: false, error: errorData.error || 'License deactivation failed' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      deactivated: data.deactivated,
      license_key: {
        activation_usage: data.license_key?.activation_usage,
      },
    });

  } catch (error) {
    console.error('License deactivation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

### Step 2: Update Desktop App to Use Validation Service

**File**: `python-backend/modules/licensing.py`

Replace the direct LemonSqueezy API calls with calls to your validation service:

```python
import os
import requests
import logging
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)

# Configuration
VALIDATION_SERVICE_URL = os.environ.get(
    "VALIDATION_SERVICE_URL",
    "https://yourwebsite.com/api/desktop"  # Replace with your actual domain
)

# No more LEMONSQUEEZY_API_KEY needed in desktop app!

class LicenseManager:
    def __init__(self, license_file: str = "license.json"):
        self.license_file = license_file
        self.license_data = self._load_license()

    def validate_license(self, license_key: str = None, instance_id: str = None) -> dict:
        """Validate license via backend service"""
        try:
            key = license_key or self.license_data.get("license_key")
            instance = instance_id or self.license_data.get("instance_id")

            if not key:
                return {"valid": False, "error": "No license key provided"}

            # Call validation service instead of LemonSqueezy directly
            response = requests.post(
                f"{VALIDATION_SERVICE_URL}/validate-license",
                json={
                    "license_key": key,
                    "instance_id": instance,
                },
                timeout=10,
            )

            if response.status_code == 429:
                return {
                    "valid": False,
                    "error": "Too many validation requests. Please try again later.",
                }

            if response.status_code != 200:
                error_data = response.json()
                return {
                    "valid": False,
                    "error": error_data.get("error", "Validation failed"),
                }

            data = response.json()

            if data.get("success") and data.get("valid"):
                # Update local license file
                self.license_data.update({
                    "license_key": key,
                    "instance_id": data.get("instance", {}).get("id"),
                    "status": data.get("license_key", {}).get("status"),
                    "last_validated": datetime.now().isoformat(),
                })
                self._save_license()

                return {
                    "valid": True,
                    "status": data.get("license_key", {}).get("status"),
                    "expires_at": data.get("license_key", {}).get("expires_at"),
                }
            else:
                return {
                    "valid": False,
                    "error": data.get("error", "Invalid license"),
                }

        except requests.exceptions.Timeout:
            logger.error("License validation timeout")
            return {
                "valid": False,
                "error": "Validation service timeout. Please check your internet connection.",
            }
        except Exception as e:
            logger.error(f"License validation error: {str(e)}")
            return {
                "valid": False,
                "error": "Failed to validate license. Please try again.",
            }

    def activate_license(self, license_key: str, instance_name: str = "Desktop App") -> dict:
        """Activate license via backend service"""
        try:
            # Call activation service
            response = requests.post(
                f"{VALIDATION_SERVICE_URL}/activate-license",
                json={
                    "license_key": license_key,
                    "instance_name": instance_name,
                },
                timeout=15,
            )

            if response.status_code == 429:
                return {
                    "success": False,
                    "error": "Too many activation requests. Please try again later.",
                }

            if response.status_code != 200:
                error_data = response.json()
                return {
                    "success": False,
                    "error": error_data.get("error", "Activation failed"),
                }

            data = response.json()

            if data.get("success") and data.get("activated"):
                # Save license locally
                self.license_data = {
                    "license_key": license_key,
                    "instance_id": data.get("instance", {}).get("id"),
                    "instance_name": instance_name,
                    "status": data.get("license_key", {}).get("status"),
                    "activated_at": datetime.now().isoformat(),
                    "last_validated": datetime.now().isoformat(),
                }
                self._save_license()

                return {
                    "success": True,
                    "message": "License activated successfully",
                    "instance_id": data.get("instance", {}).get("id"),
                }
            else:
                return {
                    "success": False,
                    "error": data.get("error", "Activation failed"),
                }

        except requests.exceptions.Timeout:
            logger.error("License activation timeout")
            return {
                "success": False,
                "error": "Activation service timeout. Please check your internet connection.",
            }
        except Exception as e:
            logger.error(f"License activation error: {str(e)}")
            return {
                "success": False,
                "error": "Failed to activate license. Please try again.",
            }

    def deactivate_license(self) -> dict:
        """Deactivate current license via backend service"""
        try:
            key = self.license_data.get("license_key")
            instance_id = self.license_data.get("instance_id")

            if not key or not instance_id:
                return {"success": False, "error": "No active license found"}

            response = requests.post(
                f"{VALIDATION_SERVICE_URL}/deactivate-license",
                json={
                    "license_key": key,
                    "instance_id": instance_id,
                },
                timeout=10,
            )

            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.license_data = {}
                    self._save_license()
                    return {"success": True, "message": "License deactivated successfully"}

            return {"success": False, "error": "Deactivation failed"}

        except Exception as e:
            logger.error(f"License deactivation error: {str(e)}")
            return {"success": False, "error": str(e)}

    def _load_license(self) -> dict:
        """Load license from local file"""
        try:
            if os.path.exists(self.license_file):
                with open(self.license_file, 'r') as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load license file: {str(e)}")
        return {}

    def _save_license(self):
        """Save license to local file"""
        try:
            with open(self.license_file, 'w') as f:
                json.dump(self.license_data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save license file: {str(e)}")
```

---

### Step 3: Remove API Key from Desktop Build

**File**: `src-tauri/src/python_bridge.rs`

Remove the API key environment variable:

```rust
// BEFORE (INSECURE):
if let Ok(api_key) = std::env::var("LEMONSQUEEZY_API_KEY") {
    sidecar_command = sidecar_command.env("LEMONSQUEEZY_API_KEY", api_key);
}

// AFTER (SECURE):
// Pass validation service URL instead
let validation_url = std::env::var("VALIDATION_SERVICE_URL")
    .unwrap_or_else(|_| "https://yourwebsite.com/api/desktop".to_string());
sidecar_command = sidecar_command.env("VALIDATION_SERVICE_URL", validation_url);
```

**File**: `.env.example`

```bash
# Backend Validation Service URL
VALIDATION_SERVICE_URL=https://yourwebsite.com/api/desktop

# For local development, use:
# VALIDATION_SERVICE_URL=http://localhost:3000/api/desktop
```

**File**: `scripts/build-with-env.ps1`

Replace API key verification with validation URL:

```powershell
# Verify VALIDATION_SERVICE_URL is set
$validationUrl = [System.Environment]::GetEnvironmentVariable("VALIDATION_SERVICE_URL", [System.EnvironmentVariableTarget]::Process)
if ($validationUrl) {
    Write-Host "[+] VALIDATION_SERVICE_URL is configured ($validationUrl)" -ForegroundColor Green
} else {
    Write-Host "[!] Warning: VALIDATION_SERVICE_URL is not set!" -ForegroundColor Yellow
    Write-Host "    Using default: https://yourwebsite.com/api/desktop" -ForegroundColor Yellow
}
```

---

### Step 4: Update GitHub Actions Workflow

**File**: `.github/workflows/build-desktop.yml`

Replace `LEMONSQUEEZY_API_KEY` with `VALIDATION_SERVICE_URL`:

```yaml
- name: Build Tauri app
  env:
    VALIDATION_SERVICE_URL: ${{ secrets.VALIDATION_SERVICE_URL }}
  run: npm run tauri build
```

---

### Step 5: Deploy Validation Service

**For Vercel (Recommended for Next.js)**:

1. Add environment variable in Vercel dashboard:
   - Variable: `LEMONSQUEEZY_API_KEY`
   - Value: Your actual LemonSqueezy API key
   - Environment: Production

2. Deploy:
```bash
cd website
vercel --prod
```

**For other platforms (Netlify, Railway, etc.)**: Similar process - add `LEMONSQUEEZY_API_KEY` as environment variable.

---

## Security Checklist

After implementation, verify:

- [ ] `LEMONSQUEEZY_API_KEY` is NOT in desktop app code
- [ ] `LEMONSQUEEZY_API_KEY` is NOT in .env file (only in deployment platform)
- [ ] Desktop app only has `VALIDATION_SERVICE_URL`
- [ ] Cannot extract API key from built binary (`strings` test)
- [ ] Rate limiting is active (test multiple rapid requests)
- [ ] HTTPS is enforced (validation service uses SSL)
- [ ] Error messages don't leak sensitive info
- [ ] Validation service logs are monitored

---

## Testing Plan

### Local Testing

1. **Start website with validation service**:
```bash
cd website
echo "LEMONSQUEEZY_API_KEY=your_test_key" > .env.local
npm run dev
```

2. **Update desktop app .env**:
```bash
VALIDATION_SERVICE_URL=http://localhost:3000/api/desktop
```

3. **Test desktop app**:
```bash
npm run tauri dev
# Try activating a license
```

### Production Testing

1. Deploy validation service to production
2. Build desktop app with production `VALIDATION_SERVICE_URL`
3. Test license activation, validation, deactivation
4. Verify no API key in binary: `strings "Local Tools.exe" | grep -i "lemon"`

---

## Migration Path

### Phase 1: Deploy Validation Service (Week 1)
- [ ] Create API routes in website
- [ ] Add `LEMONSQUEEZY_API_KEY` to Vercel/hosting
- [ ] Test endpoints with Postman/curl
- [ ] Deploy to production

### Phase 2: Update Desktop App (Week 1)
- [ ] Update `licensing.py` to use validation service
- [ ] Remove API key from `python_bridge.rs`
- [ ] Update build scripts
- [ ] Test locally

### Phase 3: Production Release (Week 2)
- [ ] Update GitHub Actions
- [ ] Build production installers
- [ ] Verify security (strings test)
- [ ] Beta test with real license keys
- [ ] Monitor validation service logs

---

## Monitoring and Maintenance

### Metrics to Track
- License validation requests per day
- Activation success rate
- Rate limit hits
- Failed validation attempts (potential abuse)
- API response times

### Logging
```typescript
// Add to validation service
console.log({
  timestamp: new Date().toISOString(),
  action: 'validate',
  ip: ip,
  success: data.success,
  license_status: data.license_key?.status,
});
```

---

## Cost Analysis

### Before (Direct LemonSqueezy API)
- Risk: API key compromise = unlimited API calls
- Cost: Potential $1000s in fraudulent API usage

### After (Validation Service)
- Cost: ~$0 (covered by existing hosting)
- Rate limiting: Max 10 validations/min per IP
- Estimated monthly API calls: ~1000-5000 (well within LemonSqueezy free tier)

---

## Rollback Plan

If issues occur:

1. **Immediate**: Keep old desktop versions available
2. **Temporary fix**: Re-enable direct API key (1-2 days max)
3. **Debug**: Check validation service logs
4. **Fix**: Deploy corrected validation service
5. **Verify**: Test thoroughly before re-releasing

---

## Next Steps

1. **Immediate**: Review this architecture plan
2. **This week**: Implement validation service API routes
3. **This week**: Update desktop app licensing module
4. **Next week**: Deploy and test
5. **Before launch**: Complete security audit

---

## Questions to Resolve

1. **Domain**: What is your actual website domain? (Replace `yourwebsite.com`)
2. **Hosting**: Are you using Vercel, Netlify, or another platform?
3. **Testing**: Do you have test license keys from LemonSqueezy?
4. **Timeline**: When do you want to launch?

---

**Status**: Ready for implementation. Please confirm domain and hosting platform to proceed.
