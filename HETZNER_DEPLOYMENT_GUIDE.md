# Hetzner Deployment Guide - Go Live Today

## Quick Answer: Do You Need a Database?

**Short answer: Not immediately, but recommended for production.**

### Current Architecture (No DB Required)

- **Desktop App**: Users activate with subscription ID → stored in local file
- **Web Version**: Free/demo (no authentication)
- **LemonSqueezy**: Handles all customer data, payments, subscriptions

### Why You Might Want a DB Later

- Track which subscription IDs are active
- Link subscriptions to email addresses
- Analytics and reporting
- Better subscription management

**For going live today: You can deploy WITHOUT a database.** The current system works with:

- Local license files (desktop)
- LemonSqueezy webhooks (updates local files)
- No user accounts needed

---

## Deployment Steps for Hetzner

### Step 1: Set Up Hetzner Server

1. **Create a Hetzner Cloud Server:**
   - Go to Hetzner Cloud Console
   - Create new project
   - Click "Add Server"
   - Choose:
     - **Location**: Choose closest to your users
     - **Image**: Ubuntu 22.04
     - **Type**: CX21 (2 vCPU, 4GB RAM) or higher
     - **SSH Key**: Add your SSH key
   - Click "Create & Buy Now"

2. **SSH into Server:**
   ```bash
   ssh root@YOUR_SERVER_IP
   ```

### Step 2: Install Docker & Docker Compose

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y

# Verify installation
docker --version
docker-compose --version
```

### Step 3: Clone Your Repository

```bash
# Install Git
apt install git -y

# Clone your repo (or upload files)
git clone YOUR_REPO_URL
cd offline-tools

# OR upload files via SCP:
# scp -r . root@YOUR_SERVER_IP:/opt/offline-tools
```

### Step 4: Set Up Environment Variables

Create `.env` files on the server:

**For Frontend (`website/.env.production`):**

```bash
# LemonSqueezy
NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL=https://yourstore.lemonsqueezy.com/checkout/buy/1167418
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret

# Backend URL (internal Docker network)
BACKEND_URL=http://backend:8000

# Public URL (for webhooks)
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

**For Backend (`python-backend/.env`):**

```bash
LEMONSQUEEZY_API_KEY=your_api_key
CORS_ORIGINS=https://yourdomain.com
MAX_FILE_SIZE=52428800
MAX_TOTAL_SIZE=104857600
```

### Step 5: Update Docker Compose for Production

Create `docker-compose.prod.yml`:

```yaml
services:
  backend:
    build:
      context: ./python-backend
    container_name: tools-backend
    restart: unless-stopped
    environment:
      - PORT=8000
      - CORS_ORIGINS=${CORS_ORIGINS}
      - MAX_FILE_SIZE=${MAX_FILE_SIZE}
      - MAX_TOTAL_SIZE=${MAX_TOTAL_SIZE}
      - LEMONSQUEEZY_API_KEY=${LEMONSQUEEZY_API_KEY}
    env_file:
      - ./python-backend/.env
    tmpfs:
      - /tmp/offline_tools_api

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    container_name: tools-frontend
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443" # For HTTPS (after SSL setup)
    depends_on:
      - backend
    environment:
      - NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL=${NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL}
      - LEMONSQUEEZY_WEBHOOK_SECRET=${LEMONSQUEEZY_WEBHOOK_SECRET}
      - BACKEND_URL=http://backend:8000
    env_file:
      - ./website/.env.production
```

### Step 6: Build and Deploy

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d --build

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Check if services are running
docker-compose -f docker-compose.prod.yml ps
```

### Step 7: Set Up Domain & SSL (Optional but Recommended)

1. **Point Domain to Server:**
   - Add A record: `yourdomain.com` → `YOUR_SERVER_IP`
   - Add A record: `www.yourdomain.com` → `YOUR_SERVER_IP`

2. **Install Certbot for SSL:**

   ```bash
   apt install certbot python3-certbot-nginx -y
   ```

3. **Set Up Nginx Reverse Proxy:**

   ```bash
   apt install nginx -y

   # Create nginx config
   nano /etc/nginx/sites-available/offline-tools
   ```

   Add this config:

   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;

       location / {
           proxy_pass http://localhost:80;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

   ```bash
   # Enable site
   ln -s /etc/nginx/sites-available/offline-tools /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx

   # Get SSL certificate
   certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

### Step 8: Configure LemonSqueezy Webhook

1. Go to LemonSqueezy Dashboard → Settings → Webhooks
2. Create webhook:
   - **URL**: `https://yourdomain.com/api/webhooks/lemonsqueezy`
   - **Events**: Select the 7 essential events (see previous guide)
   - **Copy the Signing Secret** → Add to `.env.production`

### Step 9: Test Everything

1. **Test Website:**
   - Visit `https://yourdomain.com`
   - Check pricing page
   - Test checkout link

2. **Test Webhook:**
   - Make a test purchase
   - Check webhook logs: `docker-compose logs frontend | grep webhook`

3. **Test Backend:**
   - Check health: `curl http://localhost:8000/`
   - Check API: `curl http://localhost:8000/api/pdf/merge` (should return error, but confirms it's working)

---

## Customer Management - How It Works

### Without Database (Current Setup)

**Flow:**

1. User buys subscription on LemonSqueezy → Gets subscription ID
2. User downloads desktop app
3. User enters subscription ID in desktop app
4. Desktop app validates with LemonSqueezy API
5. License stored locally in `~/.offline-tools/license.json`
6. Webhooks update license when subscription changes

**Pros:**

- Simple, no database needed
- Works offline
- LemonSqueezy handles all customer data

**Cons:**

- Can't track which users have which subscriptions
- No analytics
- Harder to provide support

### With Database (Recommended for Scale)

If you want to add a database later:

**Simple SQLite (Easiest):**

```python
# python-backend/database.py
import sqlite3
from datetime import datetime

def init_db():
    conn = sqlite3.connect('subscriptions.db')
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS subscriptions (
            subscription_id TEXT PRIMARY KEY,
            customer_email TEXT,
            status TEXT,
            expires_at TEXT,
            created_at TEXT,
            updated_at TEXT
        )
    ''')
    conn.commit()
    conn.close()
```

**PostgreSQL (Better for production):**

- Add PostgreSQL service to docker-compose
- Track subscriptions, users, usage

**For now: You can go live without a database!**

---

## Quick Deployment Checklist

- [ ] Hetzner server created
- [ ] Docker installed
- [ ] Code deployed
- [ ] Environment variables set
- [ ] Domain pointed to server
- [ ] SSL certificate installed
- [ ] LemonSqueezy webhook configured
- [ ] Test purchase completed
- [ ] Webhook receiving events
- [ ] Desktop app activation tested

---

## Monitoring & Maintenance

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f backend
```

### Restart Services

```bash
docker-compose restart
```

### Update Code

```bash
git pull
docker-compose up -d --build
```

---

## Going Live Today - Priority Actions

1. **Deploy to Hetzner** (30-60 min)
2. **Set up domain & SSL** (15-30 min)
3. **Configure webhook** (5 min)
4. **Test purchase** (5 min)
5. **Go live!** 🚀

You can add a database later if needed. The current system works without it!
