# 🚀 Deploy to Hetzner - Go Live Today!

## ✅ Quick Answer: Customer Management

### **You DON'T need a database to go live!**

**How it works:**

- **LemonSqueezy** = Your customer database (stores all customer info, payments, subscriptions)
- **Desktop App** = Users enter subscription ID → stored locally in `~/.offline-tools/license.json`
- **Web Version** = Free/demo (no login needed)
- **Webhooks** = Automatically update desktop licenses when subscriptions change

**You can see all customers in:**

- LemonSqueezy Dashboard → Customers
- LemonSqueezy Dashboard → Subscriptions

**Add a database later** if you want analytics or user accounts, but it's **NOT required** to go live!

---

## ⚡ Fast Deployment Steps (30-60 minutes)

### Step 1: Create Hetzner Server (5 min)

1. Go to [Hetzner Cloud Console](https://console.hetzner.cloud/)
2. Create new project → "Add Server"
3. Choose:
   - **Image**: Ubuntu 22.04
   - **Type**: CX21 (2 vCPU, 4GB RAM) - €4.75/month (or CX31 for more power)
   - **Location**: Choose closest to your users
   - **SSH Key**: Add your SSH key (or use password)
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
apt update && apt install docker-compose-plugin -y

# Verify
docker --version
docker compose version
```

### Step 3: Deploy Your Code (10 min)

**Option A: Git Clone (Recommended)**

```bash
# Install Git
apt install git -y

# Clone your repo (replace with your repo URL)
git clone https://github.com/YOUR_USERNAME/offline-tools.git
cd offline-tools
```

**Option B: Upload Files via SCP**

```bash
# On your local machine
cd /path/to/offline-tools
tar -czf deploy.tar.gz --exclude='node_modules' --exclude='venv' --exclude='.git' --exclude='dist' --exclude='.next' .
scp deploy.tar.gz root@YOUR_SERVER_IP:/root/

# On server
cd /root
tar -xzf deploy.tar.gz -C /opt/offline-tools
cd /opt/offline-tools
```

### Step 4: Set Environment Variables (5 min)

Create `.env` file in project root:

```bash
# On server
cd /opt/offline-tools  # or wherever you cloned/uploaded
nano .env
```

Add these variables (replace with your actual values):

```bash
# LemonSqueezy Configuration
NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL=https://YOUR_STORE.lemonsqueezy.com/checkout/buy/1167418
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret_here
LEMONSQUEEZY_API_KEY=your_api_key_here

# Backend Configuration
CORS_ORIGINS=https://yourdomain.com,http://yourdomain.com
MAX_FILE_SIZE=52428800
MAX_TOTAL_SIZE=104857600
BACKEND_URL=http://backend:8000
```

**Save:** `Ctrl+X`, then `Y`, then `Enter`

### Step 5: Update Docker Compose for Production (5 min)

The `docker-compose.prod.yml` file is already created in the project root. It's configured for:

- Next.js frontend on port 3000
- Python backend on port 8000
- All environment variables from `.env` file

**Note:** You'll need to set up Nginx as a reverse proxy (see Step 7) to:

- Handle SSL/HTTPS
- Route traffic to Next.js (port 3000)
- Proxy API requests to backend (port 8000)

For quick testing, you can access directly on port 3000.

### Step 6: Build & Start Services (5 min)

```bash
# Build and start
docker compose -f docker-compose.prod.yml --env-file .env up -d --build

# Check status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

### Step 7: Set Up Nginx Reverse Proxy (10 min)

**Install Nginx:**

```bash
apt install nginx -y
```

**Configure Nginx:**

```bash
# Copy production nginx config
cp nginx.prod.conf /etc/nginx/sites-available/offline-tools
ln -s /etc/nginx/sites-available/offline-tools /etc/nginx/sites-enabled/

# Edit config (replace yourdomain.com with your actual domain)
nano /etc/nginx/sites-available/offline-tools
# Update server_name with your domain

# Test config
nginx -t

# Restart Nginx
systemctl restart nginx
systemctl enable nginx
```

**Set Up SSL (Let's Encrypt):**

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get certificate (replace with your domain)
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
certbot renew --dry-run
```

**Or Use Cloudflare (Easier):**

1. Point domain to Hetzner server IP
2. Add Cloudflare DNS A record
3. Enable Cloudflare proxy (orange cloud)
4. SSL is automatic (but still set up Nginx for routing)

### Step 8: Configure LemonSqueezy Webhook (5 min)

1. Go to LemonSqueezy Dashboard → Settings → Webhooks
2. Create new webhook:
   - **URL**: `https://yourdomain.com/api/webhooks/lemonsqueezy`
   - **Events**: Select all subscription events (see list below)
   - **Copy the Signing Secret** → Add to `.env` file
3. Update `.env` with webhook secret
4. Restart services: `docker compose -f docker-compose.prod.yml restart`

**Webhook Events to Enable:**

- ✅ subscription_created
- ✅ subscription_updated
- ✅ subscription_cancelled
- ✅ subscription_expired
- ✅ subscription_payment_success
- ✅ subscription_payment_failed
- ✅ subscription_payment_recovered

### Step 9: Test Everything (10 min)

1. **Test Website:**

   ```bash
   curl http://localhost:3000
   # Should return HTML
   ```

2. **Test Backend:**

   ```bash
   curl http://localhost:8000/
   # Should return: {"status":"online","mode":"web-api"}
   ```

3. **Test Checkout:**
   - Visit `http://YOUR_SERVER_IP:3000` or `https://yourdomain.com`
   - Click pricing/checkout button
   - Should redirect to LemonSqueezy

4. **Test Webhook:**
   - Make a test purchase
   - Check logs: `docker compose -f docker-compose.prod.yml logs frontend | grep webhook`
   - Or test webhook endpoint: `curl https://yourdomain.com/api/webhooks/lemonsqueezy`

---

## 📋 Go Live Checklist

- [ ] Hetzner server created
- [ ] Docker installed
- [ ] Code deployed (git clone or upload)
- [ ] Environment variables set in `.env`
- [ ] Services running (`docker compose ps`)
- [ ] Domain pointed to server (or using IP)
- [ ] SSL certificate installed (optional for testing)
- [ ] LemonSqueezy webhook configured
- [ ] Webhook URL accessible: `https://yourdomain.com/api/webhooks/lemonsqueezy`
- [ ] Test purchase completed
- [ ] Webhook receiving events (check logs)

---

## 🔧 Useful Commands

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f

# Restart services
docker compose -f docker-compose.prod.yml restart

# Stop services
docker compose -f docker-compose.prod.yml down

# Update code
git pull
docker compose -f docker-compose.prod.yml up -d --build

# Check status
docker compose -f docker-compose.prod.yml ps

# View specific service logs
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f backend
```

---

## 🎯 Customer Management - How It Works

### Current Flow (No Database):

1. **User buys subscription** → LemonSqueezy checkout
2. **LemonSqueezy stores:**
   - Customer email, name, payment info
   - Subscription ID, status, expiry date
   - Payment history
3. **User gets subscription ID** → Email from LemonSqueezy
4. **User downloads desktop app** → Enters subscription ID
5. **Desktop app validates** → Stores locally in `~/.offline-tools/license.json`
6. **Webhooks update** → Desktop license automatically when subscription changes

### You Can See Customers In:

- **LemonSqueezy Dashboard** → Customers (all customer info)
- **LemonSqueezy Dashboard** → Subscriptions (all subscriptions)
- **LemonSqueezy Dashboard** → Orders (payment history)

### No Database Needed Because:

- ✅ LemonSqueezy = Your customer database
- ✅ Desktop app = Local license files
- ✅ Web version = Free (no tracking needed)
- ✅ Webhooks = Automatic updates

---

## 🚨 Troubleshooting

**Services won't start:**

```bash
docker compose -f docker-compose.prod.yml logs
```

**Port 80 already in use:**

```bash
# Check what's using port 80
lsof -i :80
# Kill it or change port in docker-compose.prod.yml
```

**Webhook not receiving events:**

- Check webhook URL is publicly accessible
- Verify webhook secret matches
- Check logs: `docker compose -f docker-compose.prod.yml logs frontend | grep webhook`

**Can't access website:**

- Check firewall: `ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 3000/tcp`
- Verify domain DNS points to server IP
- Check services are running: `docker compose -f docker-compose.prod.yml ps`
- Check Nginx is running: `systemctl status nginx`
- Test Next.js directly: `curl http://localhost:3000`

---

## 💡 Pro Tips

1. **Use Cloudflare** for free SSL and DDoS protection
2. **Set up monitoring** with Hetzner's built-in monitoring
3. **Backup your `.env` file** (contains secrets!)
4. **Use a reverse proxy** (Nginx) for better performance
5. **Set up auto-updates** for security patches

---

## 🎉 You're Live!

Once all steps are complete:

- Website is accessible
- Checkout works
- Webhooks are receiving events
- Desktop app can activate subscriptions

**Next Steps (Optional):**

- Add analytics (Google Analytics, Plausible)
- Set up monitoring (UptimeRobot, Pingdom)
- Add database later for analytics (if needed)
- Set up email notifications for new subscriptions
