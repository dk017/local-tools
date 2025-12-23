# 🚀 Deploy to Hetzner - Go Live Today!

## Quick Answer: Customer Management & Database

### ❌ **You DON'T need a database to go live!**

**How it works:**

1. **LemonSqueezy** = Your customer database
   - Stores all customer info (email, name, payment)
   - Manages subscriptions (active, cancelled, expired)
   - Handles all payments

2. **Your App:**
   - Desktop: Users enter subscription ID → stored locally
   - Web: Free/demo (no login needed)
   - Webhooks: Update desktop licenses automatically

3. **No Database Needed Because:**
   - LemonSqueezy is your database
   - Desktop app uses local files
   - Web version is free (no tracking needed)

**You can add a database later** if you want analytics or user accounts, but it's **NOT required** to go live!

---

## ⚡ Fast Deployment (30-60 minutes)

### Step 1: Create Hetzner Server (5 min)

1. Go to [Hetzner Cloud Console](https://console.hetzner.cloud/)
2. Create new project → "Add Server"
3. Choose:
   - **Image**: Ubuntu 22.04
   - **Type**: CX21 (2 vCPU, 4GB RAM) - €4.75/month
   - **Location**: Choose closest to users
   - **SSH Key**: Add your key
4. Click "Create & Buy Now"
5. **Note your server IP** (e.g., `123.45.67.89`)

### Step 2: SSH & Install Docker (5 min)

```bash
# SSH into server
ssh root@YOUR_SERVER_IP

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt update && apt install docker-compose -y

# Verify
docker --version
docker-compose --version
```

### Step 3: Deploy Your Code (10 min)

**Option A: Git Clone (if repo is public/private)**

```bash
# Install Git
apt install git -y

# Clone repo
git clone YOUR_REPO_URL
cd offline-tools
```

**Option B: Upload Files (if private repo)**

```bash
# On your local machine
cd /path/to/offline-tools
tar -czf deploy.tar.gz --exclude='node_modules' --exclude='venv' --exclude='.git' .
scp deploy.tar.gz root@YOUR_SERVER_IP:/root/

# On server
cd /root
tar -xzf deploy.tar.gz -C /opt/offline-tools
cd /opt/offline-tools
```

### Step 4: Set Environment Variables (5 min)

Create environment files on server:

**`/opt/offline-tools/website/.env.production`:**

```bash
# Replace YOUR_STORE with your actual LemonSqueezy store subdomain
NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL=https://YOUR_STORE.lemonsqueezy.com/checkout/buy/1167418

# Get from LemonSqueezy Dashboard → Settings → Webhooks
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret_here

# Your domain (for webhooks)
NEXT_PUBLIC_SITE_URL=https://yourdomain.com

# Backend API URL (internal Docker network)
NEXT_PUBLIC_API_URL=http://backend:8000
```

**`/opt/offline-tools/python-backend/.env`:**

```bash
# Get from LemonSqueezy Dashboard → Settings → API
LEMONSQUEEZY_API_KEY=your_api_key_here

# Your domain (for CORS)
CORS_ORIGINS=https://yourdomain.com
```

### Step 5: Build & Start (10 min)

```bash
cd /opt/offline-tools

# Build and start
docker-compose -f docker-compose.prod.yml up -d --build

# Watch logs
docker-compose -f docker-compose.prod.yml logs -f
```

**Wait for:** "Application startup complete" messages

### Step 6: Point Domain to Server (5 min)

1. Go to your domain registrar (Namecheap, GoDaddy, etc.)
2. Add DNS records:
   - **A Record**: `@` → `YOUR_SERVER_IP`
   - **A Record**: `www` → `YOUR_SERVER_IP`
3. Wait 5-10 minutes for DNS propagation

### Step 7: Set Up SSL (10 min)

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Install Nginx (for reverse proxy)
apt install nginx -y

# Create Nginx config
nano /etc/nginx/sites-available/offline-tools
```

**Add this config:**

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50M;
    }
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/offline-tools /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# Get SSL certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (already set up by certbot)
```

### Step 8: Configure LemonSqueezy Webhook (5 min)

1. Go to LemonSqueezy Dashboard → Settings → Webhooks
2. Create webhook:
   - **URL**: `https://yourdomain.com/api/webhooks/lemonsqueezy`
   - **Events**: Select these 7:
     - ✅ subscription_created
     - ✅ subscription_updated
     - ✅ subscription_cancelled
     - ✅ subscription_expired
     - ✅ subscription_payment_success
     - ✅ subscription_payment_failed
     - ✅ subscription_payment_recovered
   - **Copy the Signing Secret** → Add to `.env.production`
3. Restart frontend:
   ```bash
   docker-compose -f docker-compose.prod.yml restart frontend
   ```

### Step 9: Test Everything (5 min)

1. **Test Website:**

   ```bash
   curl https://yourdomain.com
   ```

   Should return HTML

2. **Test Checkout:**
   - Visit `https://yourdomain.com`
   - Click pricing/checkout button
   - Should redirect to LemonSqueezy

3. **Test Webhook:**
   - Make a test purchase
   - Check logs: `docker-compose -f docker-compose.prod.yml logs frontend | grep webhook`

4. **Test Backend:**
   ```bash
   curl http://localhost:8000/
   ```
   Should return: `{"status":"online","mode":"web-api"}`

---

## ✅ Go Live Checklist

- [ ] Hetzner server created
- [ ] Docker installed
- [ ] Code deployed
- [ ] Environment variables set
- [ ] Services running (`docker-compose ps`)
- [ ] Domain pointed to server
- [ ] SSL certificate installed
- [ ] LemonSqueezy webhook configured
- [ ] Test purchase completed
- [ ] Webhook receiving events

---

## 🎯 Customer Management - How It Works

### Current Flow (No Database):

1. **User buys subscription** → LemonSqueezy
2. **LemonSqueezy stores:**
   - Customer email, name, payment info
   - Subscription status, expiry date
   - Payment history

3. **User gets subscription ID** → Enters in desktop app
4. **Desktop app validates** → Stores locally
5. **Webhooks update** → Desktop license automatically

### You Can See Customers In:

- **LemonSqueezy Dashboard** → Customers
- **LemonSqueezy Dashboard** → Subscriptions

### No Database Needed Because:

- ✅ LemonSqueezy = Your customer database
- ✅ Desktop app = Local license files
- ✅ Web version = Free (no tracking)

---

## 🔧 Useful Commands

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Stop services
docker-compose -f docker-compose.prod.yml down

# Update code
git pull
docker-compose -f docker-compose.prod.yml up -d --build

# Check status
docker-compose -f docker-compose.prod.yml ps
```

---

## 🚨 Troubleshooting

**Services won't start:**

```bash
docker-compose -f docker-compose.prod.yml logs
```

**Webhook not working:**

- Check webhook URL is accessible: `curl https://yourdomain.com/api/webhooks/lemonsqueezy`
- Verify webhook secret matches
- Check logs: `docker-compose logs frontend | grep webhook`

**Checkout link broken:**

- Verify `NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL` is set
- Check store subdomain is correct
- Test URL directly in browser

---

## 🎉 You're Live!

Once all checks pass, you're live! Share your domain and start selling! 🚀
