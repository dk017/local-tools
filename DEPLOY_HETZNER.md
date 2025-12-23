# Deploying to Hetzner (VPS) with Docker

You can host both the Frontend (UI) and Backend (Python) on a single $5/mo VPS using Docker Compose.

## 1. Get a VPS
1. Sign up for [Hetzner Cloud](https://console.hetzner.cloud/) (or DigitalOcean).
2. Create a Server:
   - **Location**: Your choice (Ashburn, VA or Falkenstein, DE).
   - **Image**: Ubuntu 24.04 (or latest).
   - **Type**: CPX11 (2 vCPU, 4GB RAM) - ~€4 / month.

## 2. Prepare the Server
SSH into your server:
```bash
ssh root@<your-server-ip>
```

Install Docker & Docker Compose:
```bash
# Update
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Cleanup
rm get-docker.sh
```

## 3. Deploy the App
Since this is a full-stack project, the easiest way is to clone your repo (if private, use an access token) or copy files.

**Option A: Clone Git Repo (Recommended)**
```bash
git clone <your-github-repo-url> app
cd app
```

**Option B: Copy Files Manually (If no git)**
(Using SCP from your local machine)
```bash
scp -r * root@<your-server-ip>:~/app/
```

## 4. Run!
Inside the `app` folder on the server:
```bash
docker compose up -d --build
```

That's it!
- Open `http://<your-server-ip>` in your browser.
- The UI will load.
- "Select Files" -> "Process" will work because Nginx proxies `/image_tools` to the internal API automatically.

## 5. (Optional) Custom Domain & SSL
To get a nice domain (e.g., `tools.yourdomain.com`) with HTTPS:
1. Point your domain A record to the Server IP.
2. Use **Caddy** instead of Nginx (Automatic SSL) OR run Certbot on the host.

_Enjoy your private, self-hosted offline tools!_
