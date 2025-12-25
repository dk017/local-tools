# Environment Variable Setup Guide

## Where to Put `.env` Files

### Two Different Use Cases:

#### 1. **Production/Docker** (Hetzner Server)
**Location**: Root folder `.env` (same directory as `docker-compose.prod.yml`)

**Why**: Docker Compose reads environment variables from:
- A `.env` file in the same directory as `docker-compose.prod.yml`
- Or from your shell environment

**File**: `.env` (in root folder)
```env
NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL=https://yourstore.lemonsqueezy.com/checkout/buy/YOUR_VARIANT_ID
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret_here
LEMONSQUEEZY_API_KEY=your_api_key_here
CORS_ORIGINS=https://localtools.pro
```

**How it works**:
- `docker-compose.prod.yml` line 36: `${NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL}` reads from root `.env`
- Docker passes it to the frontend container
- Next.js uses it at build/runtime

---

#### 2. **Local Development** (Running `npm run dev`)
**Location**: `/website/.env.local` (inside website folder)

**Why**: Next.js automatically loads `.env.local` when you run `npm run dev` from the website directory

**File**: `website/.env.local`
```env
NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL=https://yourstore.lemonsqueezy.com/checkout/buy/YOUR_VARIANT_ID
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**How it works**:
- Next.js looks for `.env.local` in the website folder
- Variables are available at build time and runtime
- `.env.local` is gitignored (safe for secrets)

---

## Summary

| Use Case | File Location | When to Use |
|----------|--------------|-------------|
| **Production/Docker** | Root `.env` | Deploying to Hetzner server |
| **Local Development** | `website/.env.local` | Running `npm run dev` locally |

## Quick Setup

### For Production (Hetzner):
```bash
# In root folder
echo "NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL=https://yourstore.lemonsqueezy.com/checkout/buy/YOUR_VARIANT_ID" >> .env
```

### For Local Development:
```bash
# In website folder
cd website
echo "NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL=https://yourstore.lemonsqueezy.com/checkout/buy/YOUR_VARIANT_ID" >> .env.local
```

## Important Notes

1. **Root `.env`**: 
   - ✅ Used by Docker Compose
   - ✅ Should be on your server (but can be gitignored if contains secrets)
   - ✅ Docker reads it automatically when you run `docker-compose up`

2. **`website/.env.local`**:
   - ✅ Used by Next.js during local development
   - ✅ Automatically gitignored (Next.js default)
   - ✅ Only needed if you're running `npm run dev` locally

3. **You DON'T need both**:
   - If you only deploy via Docker → Only need root `.env`
   - If you only develop locally → Only need `website/.env.local`
   - If you do both → You can have both (they serve different purposes)

## Current Status

Based on your setup, you're using Docker for production, so:
- ✅ **Create root `.env`** for production deployment
- ⚠️ **Optional**: Create `website/.env.local` only if you want to test locally

