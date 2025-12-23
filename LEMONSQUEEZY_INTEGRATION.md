# LemonSqueezy Annual Subscription Integration Guide

This guide walks you through integrating LemonSqueezy for annual subscriptions, replacing the current one-time purchase model.

## Overview

**Current State:**

- One-time lifetime license model
- Basic license activation via license keys
- Local license file storage

**Target State:**

- Annual subscription model via LemonSqueezy
- Automatic subscription management via webhooks
- Subscription status validation (active/cancelled/expired)
- Seamless checkout integration

---

## Step 1: LemonSqueezy Account Setup

### 1.1 Create LemonSqueezy Account

1. Go to [lemonsqueezy.com](https://lemonsqueezy.com) and sign up
2. Complete store setup (business details, tax info, etc.)
3. Verify your account

### 1.2 Get API Credentials

1. Navigate to **Settings → API**
2. Generate a new **API Key** (keep this secret!)
3. Copy the **Webhook Signing Secret** (you'll need this for webhook verification)

### 1.3 Create Annual Subscription Product

1. Go to **Products → Create Product**
2. Product Name: "Offline Tools Desktop Suite - Annual"
3. Description: "Full-featured desktop PDF and image tools suite"
4. Pricing:
   - **Price**: Set your annual price (e.g., $49/year)
   - **Billing Interval**: Yearly
   - **Trial Period**: Optional (e.g., 7 days free trial)
5. Save and note the **Product ID** and **Variant ID**

---

## Step 2: Environment Variables Setup

Add these to your environment variables:

### Next.js (website/.env.local or production environment):

```bash
# LemonSqueezy Checkout (Public - safe to expose)
NEXT_PUBLIC_LEMONSQUEEZY_STORE=yourstore
NEXT_PUBLIC_LEMONSQUEEZY_VARIANT_ID=your_variant_id_here
# OR use full checkout URL:
NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL=https://yourstore.lemonsqueezy.com/checkout/buy/your_variant_id

# LemonSqueezy Webhook (Server-side only)
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret_here
```

### Python Backend (python-backend/.env or production environment):

```bash
# LemonSqueezy API
LEMONSQUEEZY_API_KEY=your_api_key_here

# Backend URL (for webhook to update desktop licenses)
BACKEND_URL=http://127.0.0.1:8000  # or your production URL
```

### Docker Compose (if using Docker):

Add to `docker-compose.yml`:

```yaml
services:
  frontend:
    environment:
      - NEXT_PUBLIC_LEMONSQUEEZY_STORE=yourstore
      - NEXT_PUBLIC_LEMONSQUEEZY_VARIANT_ID=your_variant_id
      - LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret
  backend:
    environment:
      - LEMONSQUEEZY_API_KEY=your_api_key
```

**For Development:**

- Add to `.env.local` (Next.js)
- Add to `python-backend/.env` (Python backend)

**For Production:**

- Add to your hosting platform's environment variables
- Add to Docker Compose if using Docker

---

## Step 3: Update Backend Licensing Module

The existing `python-backend/modules/licensing.py` needs to be enhanced to:

1. Validate subscriptions (not just one-time licenses)
2. Check subscription expiry
3. Handle subscription status updates from webhooks

### Key Changes Needed:

1. **Add subscription validation** using LemonSqueezy API
2. **Store subscription metadata** (subscription_id, expires_at, status)
3. **Periodic validation** (check subscription status on app startup)
4. **Webhook handler** for subscription events

---

## Step 4: Create Webhook Endpoint

LemonSqueezy will send webhooks for:

- `subscription_created` - New subscription
- `subscription_updated` - Subscription changed (renewed, cancelled, etc.)
- `subscription_cancelled` - Subscription cancelled
- `subscription_payment_success` - Payment successful
- `subscription_payment_failed` - Payment failed
- `subscription_expired` - Subscription expired

### Implementation Location:

- **Next.js API Route**: `website/app/api/webhooks/lemonsqueezy/route.ts`
- **Python Backend**: `python-backend/api.py` (if handling webhooks in Python)

---

## Step 5: Update Frontend Pricing Component

Replace the placeholder checkout URL with LemonSqueezy checkout.

### Options:

1. **Direct Checkout Link** (Simplest)
   - Link to LemonSqueezy hosted checkout page
   - Format: `https://[STORE].lemonsqueezy.com/checkout/buy/[VARIANT_ID]`

2. **Embedded Checkout** (Better UX)
   - Use Lemon.js library
   - Embed checkout in your page

3. **Custom Checkout** (Most Control)
   - Use LemonSqueezy API to create checkout sessions
   - Full control over checkout flow

---

## Step 6: Update License Validation Logic

### Desktop App:

- Check subscription status on startup
- Validate subscription expiry
- Show renewal prompt if subscription expires soon
- Handle offline validation (grace period)

### Web Version:

- For demo/preview: Keep free (no license check)
- For premium features: Check subscription status

---

## Step 7: User Account Management

Consider adding:

- User dashboard to view subscription status
- Renewal management
- Cancellation flow
- Download license key for desktop activation

---

## Implementation Checklist

### Phase 1: Setup (Day 1)

- [ ] Create LemonSqueezy account
- [ ] Create annual subscription product
- [ ] Get API credentials
- [ ] Set environment variables

### Phase 2: Backend (Day 2-3)

- [ ] Update `licensing.py` for subscription validation
- [ ] Create webhook endpoint
- [ ] Add subscription status checking
- [ ] Test webhook locally (use ngrok or similar)

### Phase 3: Frontend (Day 3-4)

- [ ] Update Pricing component with LemonSqueezy checkout
- [ ] Add subscription status display
- [ ] Update activation screen for subscriptions
- [ ] Add renewal/cancellation UI

### Phase 4: Testing (Day 4-5)

- [ ] Test checkout flow
- [ ] Test webhook handling
- [ ] Test subscription validation
- [ ] Test renewal flow
- [ ] Test cancellation flow

### Phase 5: Deployment (Day 5)

- [ ] Deploy webhook endpoint
- [ ] Configure webhook URL in LemonSqueezy
- [ ] Test in production
- [ ] Monitor webhook logs

---

## Next Steps

1. **Review this guide** and confirm the approach
2. **I'll implement the code changes** based on your preferences:
   - Which checkout method? (Direct link, Embedded, or Custom)
   - Where to handle webhooks? (Next.js or Python backend)
   - Subscription validation frequency?
3. **Test thoroughly** before going live

Would you like me to start implementing the code changes now?
