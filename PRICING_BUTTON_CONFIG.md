# Pricing Button Configuration Guide

## How the "Get Annual Desktop License" Button Works

### Current Implementation

The pricing button in `website/components/Pricing.tsx` (line 40-47) uses:

```tsx
<a
  href={process.env.NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL || "#"}
  target="_blank"
  rel="noopener noreferrer"
  className="..."
>
  {t("cta")}  // "Get Annual Desktop License"
</a>
```

### What This Means

1. **Environment Variable**: `NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL`
   - This is a **public** environment variable (starts with `NEXT_PUBLIC_`)
   - It should contain your LemonSqueezy checkout URL
   - If **not set**, it defaults to `"#"` (just scrolls to top of page - does nothing)

2. **Current Behavior**:
   - ✅ **If variable is set**: Button opens LemonSqueezy checkout in new tab
   - ❌ **If variable is NOT set**: Button does nothing (just scrolls to top)

### Where to Configure

#### Option 1: Local Development (`.env.local`)

Create `website/.env.local`:
```env
NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL=https://yourstore.lemonsqueezy.com/checkout/buy/variant_id_here
```

#### Option 2: Production (Docker)

In `docker-compose.prod.yml` (line 36), it's already configured:
```yaml
environment:
  - NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL=${NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL}
```

Set it in your production environment:
```bash
export NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL="https://yourstore.lemonsqueezy.com/checkout/buy/variant_id_here"
```

Or in your `.env` file (if using docker-compose):
```env
NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL=https://yourstore.lemonsqueezy.com/checkout/buy/variant_id_here
```

### How to Get Your LemonSqueezy Checkout URL

1. **Go to LemonSqueezy Dashboard**: https://app.lemonsqueezy.com
2. **Navigate to**: Products → Your Product → Variants
3. **Click on your variant** (e.g., "Annual License - $59")
4. **Copy the Checkout URL** from the variant settings
   - Format: `https://yourstore.lemonsqueezy.com/checkout/buy/variant_id_here`
   - Or use the "Share" button to get the checkout link

### Related Configuration

#### Webhook Handler (for subscription management)

The app also has a webhook handler at `website/app/api/webhooks/lemonsqueezy/route.ts` that:
- Receives subscription events from LemonSqueezy
- Updates license status in the desktop app
- Requires: `LEMONSQUEEZY_WEBHOOK_SECRET` (server-side only)

**Webhook URL to configure in LemonSqueezy**:
```
https://localtools.pro/api/webhooks/lemonsqueezy
```

### Current Status Check

To check if the variable is set:

1. **In browser console** (on your site):
   ```javascript
   // This won't work - NEXT_PUBLIC_ vars are only available at build time
   ```

2. **Check the button behavior**:
   - If clicking does nothing → Variable is NOT set (defaults to "#")
   - If clicking opens checkout → Variable IS set ✅

3. **Check your environment**:
   ```bash
   # In production server
   docker exec tools-frontend env | grep LEMONSQUEEZY
   ```

### Quick Fix

If the button currently does nothing, you need to:

1. **Get your LemonSqueezy checkout URL** (see above)
2. **Set the environment variable**:
   ```bash
   # On your Hetzner server
   export NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL="https://yourstore.lemonsqueezy.com/checkout/buy/YOUR_VARIANT_ID"
   ```
3. **Restart the frontend container**:
   ```bash
   docker compose -f docker-compose.prod.yml restart frontend
   ```
   Or rebuild if needed:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build frontend
   ```

### Summary

| Variable | Type | Required | Purpose |
|----------|------|----------|---------|
| `NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL` | Public | ✅ Yes | Checkout URL for pricing button |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Private | Optional | Webhook signature verification |
| `LEMONSQUEEZY_API_KEY` | Private | Optional | API access for license validation |

**Current Issue**: If the button does nothing, `NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL` is likely not set.

