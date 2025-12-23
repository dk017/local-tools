# LemonSqueezy Setup - Quick Reference

## Your Product Details

- **Product ID**: `741618`
- **Variant ID**: `1167418`
- **API Key**: ✅ (You have this)

## Environment Variables to Set

### Next.js (website/.env.local)

```bash
# LemonSqueezy Checkout
NEXT_PUBLIC_LEMONSQUEEZY_STORE=yourstore
NEXT_PUBLIC_LEMONSQUEEZY_VARIANT_ID=1167418

# OR use full checkout URL (recommended):
NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL=https://yourstore.lemonsqueezy.com/checkout/buy/1167418

# Webhook Secret (get from LemonSqueezy Dashboard → Settings → Webhooks)
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret_here
```

### Python Backend (python-backend/.env)

```bash
# LemonSqueezy API
LEMONSQUEEZY_API_KEY=your_api_key_here
```

## Checkout URL Format

Your checkout URL will be:
```
https://[YOUR_STORE].lemonsqueezy.com/checkout/buy/1167418
```

Replace `[YOUR_STORE]` with your actual LemonSqueezy store subdomain.

## Next Steps

1. **Get Your Store Subdomain:**
   - Go to LemonSqueezy Dashboard → Settings → Store
   - Find your store subdomain (e.g., "mystore", "offlinetools", etc.)

2. **Get Webhook Secret:**
   - Go to LemonSqueezy Dashboard → Settings → Webhooks
   - Create a new webhook or view existing one
   - Copy the "Signing Secret"

3. **Configure Webhook:**
   - Webhook URL: `https://yourdomain.com/api/webhooks/lemonsqueezy`
   - Enable these events:
     - `subscription_created`
     - `subscription_updated`
     - `subscription_cancelled`
     - `subscription_payment_success`
     - `subscription_payment_failed`
     - `subscription_expired`

4. **Set Environment Variables:**
   - Add to `website/.env.local` (for development)
   - Add to your production hosting platform (Vercel, etc.)
   - Add to `python-backend/.env` (for backend)

5. **Test:**
   - Visit your pricing page
   - Click the checkout button
   - Complete a test purchase
   - Verify webhook receives events

## Testing Checklist

- [ ] Checkout link works
- [ ] Purchase completes
- [ ] Webhook receives `subscription_created` event
- [ ] Desktop app can activate with subscription ID
- [ ] Subscription validation works

## Quick Test Command

To test if your checkout URL is correct, visit:
```
https://yourstore.lemonsqueezy.com/checkout/buy/1167418
```

You should see the LemonSqueezy checkout page.

