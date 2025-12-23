# 🚀 Deployment Checklist - Go Live Today

## ✅ Quick Answer: Customer Management

### **NO DATABASE NEEDED!**

**How it works:**
- **LemonSqueezy** = Your customer database (stores all customer info, payments, subscriptions)
- **Desktop App** = Users enter subscription ID → stored locally
- **Web Version** = Free/demo (no login needed)
- **Webhooks** = Automatically update desktop licenses

**You can see all customers in:**
- LemonSqueezy Dashboard → Customers
- LemonSqueezy Dashboard → Subscriptions

---

## 📋 Pre-Deployment Checklist

### 1. LemonSqueezy Setup ✅
- [x] Product created (ID: 741618)
- [x] Variant created (ID: 1167418)
- [x] API Key obtained
- [ ] Store subdomain identified
- [ ] Webhook created and secret copied

### 2. Environment Variables Ready
- [ ] `NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL` (or store + variant)
- [ ] `LEMONSQUEEZY_WEBHOOK_SECRET`
- [ ] `LEMONSQUEEZY_API_KEY`

### 3. Hetzner Server
- [ ] Server created
- [ ] SSH access working
- [ ] IP address noted

### 4. Domain (Optional for Testing)
- [ ] Domain purchased/ready
- [ ] DNS access

---

## 🚀 Deployment Steps (30-60 min)

### Step 1: Create Hetzner Server (5 min)
1. Go to [Hetzner Cloud Console](https://console.hetzner.cloud/)
2. Create server: Ubuntu 22.04, CX21 (€4.75/month)
3. Note IP address

### Step 2: SSH & Install Docker (5 min)
```bash
ssh root@YOUR_SERVER_IP
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
apt install docker-compose-plugin -y
```

### Step 3: Deploy Code (10 min)
```bash
# Option A: Git clone
git clone YOUR_REPO_URL
cd offline-tools

# Option B: Upload files
# (On local machine)
tar -czf deploy.tar.gz --exclude='node_modules' --exclude='venv' --exclude='.git' .
scp deploy.tar.gz root@YOUR_SERVER_IP:/root/
# (On server)
cd /root && tar -xzf deploy.tar.gz -C /opt/offline-tools && cd /opt/offline-tools
```

### Step 4: Set Environment Variables (5 min)
```bash
nano .env
```

Add:
```bash
NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL=https://YOUR_STORE.lemonsqueezy.com/checkout/buy/1167418
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret
LEMONSQUEEZY_API_KEY=your_api_key
CORS_ORIGINS=https://yourdomain.com,http://yourdomain.com
```

### Step 5: Build & Start (5 min)
```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
docker compose -f docker-compose.prod.yml ps
```

### Step 6: Set Up Nginx (10 min)
```bash
apt install nginx -y
cp nginx.prod.conf /etc/nginx/sites-available/offline-tools
# Edit: nano /etc/nginx/sites-available/offline-tools (update domain)
ln -s /etc/nginx/sites-available/offline-tools /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx
```

### Step 7: SSL (10 min)
```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Step 8: Configure Webhook (5 min)
1. LemonSqueezy Dashboard → Settings → Webhooks
2. URL: `https://yourdomain.com/api/webhooks/lemonsqueezy`
3. Enable subscription events
4. Copy secret → Add to `.env` → Restart: `docker compose -f docker-compose.prod.yml restart`

### Step 9: Test (10 min)
- [ ] Website loads: `https://yourdomain.com`
- [ ] Checkout works: Click pricing button
- [ ] Backend works: `curl https://yourdomain.com/api/`
- [ ] Webhook works: Make test purchase, check logs

---

## 🎯 You're Live!

Once all steps complete:
- ✅ Website accessible
- ✅ Checkout working
- ✅ Webhooks receiving events
- ✅ Desktop app can activate subscriptions

---

## 📊 Customer Management

**All customers are in LemonSqueezy:**
- Dashboard → Customers (all customer info)
- Dashboard → Subscriptions (all subscriptions)
- Dashboard → Orders (payment history)

**No database needed because:**
- LemonSqueezy = Customer database
- Desktop = Local license files
- Web = Free (no tracking)

---

## 🔧 Quick Commands

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f

# Restart
docker compose -f docker-compose.prod.yml restart

# Update code
git pull && docker compose -f docker-compose.prod.yml up -d --build

# Check status
docker compose -f docker-compose.prod.yml ps
```

---

## 🆘 Need Help?

- Check logs: `docker compose -f docker-compose.prod.yml logs`
- Test backend: `curl http://localhost:8000/`
- Test frontend: `curl http://localhost:3000`
- Check Nginx: `systemctl status nginx`

