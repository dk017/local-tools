# LemonSqueezy Quick Setup - Your Configuration

## ✅ What You Have

- **Product ID**: `741618`
- **Variant ID**: `1167418` ✅
- **API Key**: ✅ (You have this)

## 🔍 What You Still Need

1. **Store Subdomain** - Your LemonSqueezy store name
   - Find it in: Dashboard → Settings → Store
   - Example: `mystore`, `offlinetools`, `yourcompany`
   - Your checkout URL will be: `https://[YOUR_STORE].lemonsqueezy.com/checkout/buy/1167418`

2. **Webhook Secret** - For webhook security
   - Get it from: Dashboard → Settings → Webhooks
   - Create a webhook first, then copy the "Signing Secret"

## 📝 Environment Variables to Set

### For Next.js (website/.env.local)

Create or edit `website/.env.local`:

```bash
# Option 1: Use full checkout URL (recommended - replace YOUR_STORE)
NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL=https://YOUR_STORE.lemonsqueezy.com/checkout/buy/1167418

# Option 2: Use store + variant ID separately
NEXT_PUBLIC_LEMONSQUEEZY_STORE=YOUR_STORE
NEXT_PUBLIC_LEMONSQUEEZY_VARIANT_ID=1167418

# Webhook Secret (get from LemonSqueezy Dashboard → Settings → Webhooks)
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret_here
```

### For Python Backend (python-backend/.env)

Create or edit `python-backend/.env`:

```bash
LEMONSQUEEZY_API_KEY=your_api_key_here
```

## 🔗 Your Checkout URL

Once you know your store subdomain, your checkout URL will be:
```
https://[YOUR_STORE].lemonsqueezy.com/checkout/buy/1167418
```

**Example:** If your store is `offlinetools`, the URL would be:
```
https://offlinetools.lemonsqueezy.com/checkout/buy/1167418
```

## 🎯 Next Steps

1. **Find Your Store Subdomain:**
   - Login to LemonSqueezy Dashboard
   - Go to Settings → Store
   - Look for "Store URL" or "Subdomain"
   - It's the part before `.lemonsqueezy.com`

2. **Set Up Webhook:**
   - Go to Dashboard → Settings → Webhooks
   - Click "Create Webhook"
   - Webhook URL: `https://yourdomain.com/api/webhooks/lemonsqueezy`
   - Enable these events:
     - ✅ subscription_created
     - ✅ subscription_updated
     - ✅ subscription_cancelled
     - ✅ subscription_payment_success
     - ✅ subscription_payment_failed
     - ✅ subscription_expired
   - Copy the "Signing Secret" and add it to your `.env.local`

3. **Set Environment Variables:**
   - Add the values above to `website/.env.local`
   - Add API key to `python-backend/.env`
   - Restart your development server

4. **Test:**
   - Visit your pricing page
   - Click the checkout button
   - It should redirect to LemonSqueezy checkout with your product

## 🧪 Quick Test

After setting environment variables, test the checkout URL:
1. Visit your pricing page
2. Click "Subscribe" or "Get Started"
3. Should redirect to: `https://[YOUR_STORE].lemonsqueezy.com/checkout/buy/1167418`

## 📋 Checklist

- [ ] Found store subdomain
- [ ] Created webhook in LemonSqueezy
- [ ] Got webhook secret
- [ ] Set `NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL` in `.env.local`
- [ ] Set `LEMONSQUEEZY_WEBHOOK_SECRET` in `.env.local`
- [ ] Set `LEMONSQUEEZY_API_KEY` in `python-backend/.env`
- [ ] Tested checkout link
- [ ] Configured webhook URL in LemonSqueezy dashboard

## 💡 Pro Tip

You can test the checkout URL directly in your browser before setting environment variables:
```
https://[YOUR_STORE].lemonsqueezy.com/checkout/buy/1167418
```

If it shows the checkout page, you're good to go!

