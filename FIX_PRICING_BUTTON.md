# Fix: Pricing Button Opens Homepage Instead of Checkout

## The Problem

The "Get Annual Desktop License" button opens the homepage (`#`) instead of the LemonSqueezy checkout URL.

## Root Cause

In Next.js, `NEXT_PUBLIC_*` environment variables are **embedded at build time**, not runtime. This means:

1. ✅ If you set the variable **before building** → It works
2. ❌ If you set the variable **after building** → It doesn't work (needs rebuild)

## Solutions

### Solution 1: For Production (Docker/Hetzner)

**The variable must be available during the Docker build!**

1. **Set the variable in root `.env` file** (same directory as `docker-compose.prod.yml`):
   ```env
   NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL=https://yourstore.lemonsqueezy.com/checkout/buy/1167418
   ```

2. **Rebuild the frontend container** (this is critical!):
   ```bash
   cd ~/local-tools
   docker compose -f docker-compose.prod.yml build --no-cache frontend
   docker compose -f docker-compose.prod.yml up -d frontend
   ```

   **Why `--no-cache`?** To ensure the build picks up the new environment variable.

3. **Verify the variable is set**:
   ```bash
   docker exec tools-frontend env | grep LEMONSQUEEZY
   ```

### Solution 2: For Local Development

1. **Set the variable in `website/.env.local`**:
   ```env
   NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL=https://yourstore.lemonsqueezy.com/checkout/buy/1167418
   ```

2. **Restart the dev server** (stop and start again):
   ```bash
   cd website
   # Stop the current server (Ctrl+C)
   npm run dev
   ```

   **Important**: Just setting the variable isn't enough - you must restart!

### Solution 3: Debug Current Value

I've added a console.log to the Pricing component. Check your browser console:

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for: `Checkout URL: ...`
4. If it shows `#`, the variable is not set or not embedded

## Common Issues

### Issue 1: Variable Set But Not Working
**Cause**: App was built before variable was set
**Fix**: Rebuild the app (see Solution 1 or 2)

### Issue 2: Variable Shows in `.env.local` But Not Working
**Cause**: Dev server wasn't restarted
**Fix**: Stop and restart `npm run dev`

### Issue 3: Variable Works Locally But Not in Production
**Cause**: Variable not passed to Docker build
**Fix**: 
- Ensure root `.env` has the variable
- Rebuild with `--no-cache` flag
- Verify in container: `docker exec tools-frontend env | grep LEMONSQUEEZY`

### Issue 4: URL Format Issue
Your current URL: `https://localtools.pro.lemonsqueezy.com/checkout/buy/1167418`

**Check if this is correct**:
- LemonSqueezy URLs are usually: `https://YOURSTORE.lemonsqueezy.com/checkout/buy/VARIANT_ID`
- Verify in LemonSqueezy Dashboard → Products → Variants → Checkout URL

## Quick Test

After fixing, test by:
1. Opening browser console (F12)
2. Clicking the pricing button
3. Check console for: `Checkout URL: https://...` (should NOT be `#`)
4. Button should open LemonSqueezy checkout page

## Next Steps for Production

1. ✅ Set `NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL` in root `.env`
2. ✅ Rebuild frontend: `docker compose -f docker-compose.prod.yml build --no-cache frontend`
3. ✅ Restart: `docker compose -f docker-compose.prod.yml up -d frontend`
4. ✅ Test the button - should open checkout page
5. ✅ Remove console.log from Pricing.tsx (optional, for production)

