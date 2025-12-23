# How to Run the Web Version

This guide covers both **development** and **production** setups.

## 🚀 Quick Start

### Option 1: Development Mode (Recommended for Testing)

Run both frontend and backend locally for development.

#### Prerequisites
- Node.js 18+ installed
- Python 3.12+ installed
- Tesseract OCR installed (for OCR features)

#### Step 1: Install Dependencies

**Backend:**
```bash
cd python-backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

**Frontend:**
```bash
cd website
npm install
```

#### Step 2: Start Backend Server

**Terminal 1:**
```bash
cd python-backend
python server.py
```

Backend will run on: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

#### Step 3: Start Frontend

**Terminal 2:**
```bash
cd website
npm run dev
```

Frontend will run on: `http://localhost:3000`

#### Step 4: Access the App

Open your browser: **http://localhost:3000**

---

### Option 2: Production Mode (Docker)

Run everything in Docker containers (includes Tesseract automatically).

#### Prerequisites
- Docker and Docker Compose installed

#### Step 1: Build and Start

```bash
# Build images (includes Tesseract installation)
docker compose build

# Start services
docker compose up -d

# View logs
docker compose logs -f
```

#### Step 2: Access the App

Open your browser: **http://localhost**

The app is now running with:
- Frontend (Nginx): Port 80
- Backend (FastAPI): Internal port 8000 (proxied by Nginx)

#### Step 3: Stop Services

```bash
docker compose down
```

---

## 📋 Detailed Instructions

### Development Mode Setup

#### Backend Configuration

The backend uses `server.py` for development:

```python
# python-backend/server.py
# Runs on http://localhost:8000
# Auto-reload enabled
```

**Features:**
- ✅ Auto-reload on code changes
- ✅ CORS enabled for localhost
- ✅ API documentation at `/docs`
- ⚠️ Requires Tesseract installed locally

**Install Tesseract for Development:**

**Windows:**
1. Download from: https://github.com/UB-Mannheim/tesseract/wiki
2. Install and add to PATH

**macOS:**
```bash
brew install tesseract
```

**Linux:**
```bash
sudo apt-get install tesseract-ocr tesseract-ocr-eng
```

#### Frontend Configuration

The frontend is a Next.js app:

```bash
cd website
npm run dev    # Development server
npm run build  # Production build
npm start      # Production server
```

**Environment Variables (Optional):**

Create `website/.env.local`:
```env
# API URL (defaults to relative paths)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

### Production Mode Setup

#### Docker Compose Configuration

The `docker-compose.yml` includes:

1. **Backend Service:**
   - Python 3.12 with Tesseract pre-installed
   - FastAPI on port 8000 (internal)
   - Auto-restart on failure

2. **Frontend Service:**
   - Next.js build served by Nginx
   - Port 80 exposed
   - Proxies API requests to backend

#### Environment Variables

Edit `docker-compose.yml` to configure:

```yaml
environment:
  - CORS_ORIGINS=http://yourdomain.com,https://yourdomain.com
  - MAX_FILE_SIZE=52428800      # 50MB
  - MAX_TOTAL_SIZE=104857600    # 100MB
```

#### Rebuild After Changes

```bash
# Rebuild specific service
docker compose build backend

# Rebuild all
docker compose build --no-cache

# Restart
docker compose up -d
```

---

## 🔍 Verification

### Check Backend

```bash
# Development
curl http://localhost:8000/health

# Docker
curl http://localhost/health
```

Expected response:
```json
{"status": "online", "mode": "web-api"}
```

### Check Tesseract (OCR)

```bash
# Development - verify Tesseract is installed
tesseract --version

# Docker - check inside container
docker exec tools-backend tesseract --version
```

### Test OCR PDF Tool

1. Go to: `http://localhost:3000/tools/ocr-pdf` (dev) or `http://localhost/tools/ocr-pdf` (Docker)
2. Upload a scanned PDF
3. Process it
4. Download the searchable PDF

---

## 🐛 Troubleshooting

### Issue: "Connection refused" or CORS errors

**Development:**
- Ensure backend is running on port 8000
- Check CORS settings in `server.py`
- Verify frontend is calling correct API URL

**Docker:**
- Check if containers are running: `docker compose ps`
- View logs: `docker compose logs backend`
- Verify nginx proxy config

### Issue: "Tesseract not found"

**Development:**
- Install Tesseract (see instructions above)
- Verify it's in PATH: `tesseract --version`

**Docker:**
- Rebuild backend: `docker compose build --no-cache backend`
- Tesseract should be installed automatically

### Issue: Frontend can't connect to backend

**Development:**
- Check backend is running: `http://localhost:8000/health`
- Verify API URL in frontend code
- Check browser console for errors

**Docker:**
- Check nginx config: `nginx.conf`
- Verify backend service name: `tools-backend`
- Check network: `docker network ls`

### Issue: Port already in use

**Change ports:**

**Backend (server.py):**
```python
uvicorn.run("server:app", host="0.0.0.0", port=8001, reload=True)
```

**Frontend (package.json):**
```json
"dev": "next dev -p 3001"
```

**Docker:**
```yaml
ports:
  - "8080:80"  # Change host port
```

---

## 📊 Port Summary

| Service | Development | Docker |
|---------|-------------|--------|
| Frontend | 3000 | 80 |
| Backend API | 8000 | 8000 (internal) |
| API Docs | 8000/docs | localhost/docs |

---

## 🚀 Quick Commands Reference

### Development
```bash
# Backend
cd python-backend && python server.py

# Frontend
cd website && npm run dev
```

### Docker
```bash
# Start
docker compose up -d

# Stop
docker compose down

# Rebuild
docker compose build --no-cache

# Logs
docker compose logs -f backend
docker compose logs -f frontend

# Restart
docker compose restart
```

---

## ✅ Next Steps

1. **Development**: Start both servers and test locally
2. **Production**: Build Docker images and deploy
3. **Test OCR**: Try the OCR PDF tool to verify Tesseract works
4. **Deploy**: Follow `DEPLOY_HETZNER.md` for VPS deployment

---

## 📝 Notes

- **Development mode** is best for testing and development
- **Docker mode** is best for production and includes Tesseract automatically
- Tesseract is **required** for OCR PDF functionality
- All other tools work without Tesseract

