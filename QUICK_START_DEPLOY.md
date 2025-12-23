# ⚡ Quick Start - Deploy to Hetzner in 30 Minutes

## 🎯 Customer Management - NO DATABASE NEEDED!

**LemonSqueezy = Your Customer Database**
- All customers stored in LemonSqueezy
- All subscriptions managed by LemonSqueezy
- You can see everything in LemonSqueezy Dashboard

**Your App:**
- Desktop: Users enter subscription ID → stored locally
- Web: Free/demo (no login needed)
- Webhooks: Auto-update desktop licenses

---

## 🚀 Deployment Steps

### 1. Create Hetzner Server (5 min)

1. [Hetzner Cloud Console](https://console.hetzner.cloud/)
2. Create Server:
   - Ubuntu 22.04
   - CX21 (€4.75/month)
   - Add SSH key
3. Note IP address

### 2. SSH & Install Docker (5 min)

```bash
ssh root@YOUR_SERVER_IP

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
apt install docker-compose-plugin -y
```

### 3. Deploy Code (10 min)

```bash
# Clone or upload your code
git clone YOUR_REPO_URL
cd offline-tools

# OR upload via SCP:
# scp -r . root@YOUR_SERVER_IP:/opt/offline-tools
# ssh root@YOUR_SERVER_IP
# cd /opt/offline-tools
```

### 4. Set Environment Variables (5 min)

```bash
nano .env
```

Paste (replace with your values):
```bash
NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL=https://YOUR_STORE.lemonsqueezy.com/checkout/buy/1167418
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret
LEMONSQUEEZY_API_KEY=your_api_key
CORS_ORIGINS=https://yourdomain.com,http://yourdomain.com
```

### 5. Build & Start (5 min)

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
docker compose -f docker-compose.prod.yml ps
```

### 6. Set Up Nginx (10 min)

```bash
apt install nginx -y
cp nginx.prod.conf /etc/nginx/sites-available/offline-tools
nano /etc/nginx/sites-available/offline-tools  # Update domain
ln -s /etc/nginx/sites-available/offline-tools /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx
```

### 7. SSL Certificate (10 min)

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 8. Configure Webhook (5 min)

1. LemonSqueezy Dashboard → Settings → Webhooks
2. URL: `https://yourdomain.com/api/webhooks/lemonsqueezy`
3. Enable subscription events
4. Copy secret → Update `.env` → Restart: `docker compose -f docker-compose.prod.yml restart`

### 9. Test (5 min)

- Visit: `https://yourdomain.com`
- Click pricing button → Should redirect to LemonSqueezy
- Test purchase → Check webhook logs

---

## ✅ You're Live!

**Checklist:**
- [ ] Server running
- [ ] Services up (`docker compose ps`)
- [ ] Website accessible
- [ ] Checkout works
- [ ] Webhook configured
- [ ] SSL installed

---

## 📊 View Customers

**All in LemonSqueezy Dashboard:**
- Customers → All customer info
- Subscriptions → All subscriptions
- Orders → Payment history

**No database needed!**

---

## 🔧 Useful Commands

```bash
# Logs
docker compose -f docker-compose.prod.yml logs -f

# Restart
docker compose -f docker-compose.prod.yml restart

# Update
git pull && docker compose -f docker-compose.prod.yml up -d --build
```

---

**Need help?** Check `HETZNER_DEPLOY_NOW.md` for detailed instructions.

