# Backend Architecture Guide

## Overview

This project has **TWO separate backend servers** that share the same processing modules but serve different purposes.

## Backend Servers

### 1. Desktop App Backend (`main.py`)
- **Port**: 8000
- **Purpose**: Lightweight sidecar for Tauri desktop application
- **Endpoints**:
  - `/api/pdf-editor/*` (PDF annotation features)
  - Root health check: `{"status":"online","mode":"desktop-hybrid"}`
- **Communication**: Hybrid mode (stdin/stdout + HTTP)
- **Auto-started**: Yes, by Tauri when desktop app launches
- **Used by**: Desktop app only

### 2. Web App Backend (`server.py`)
- **Port**: 8001 (changed from 8000 to avoid conflict)
- **Purpose**: Full-featured REST API for Next.js web interface
- **Endpoints**:
  - `/api/image/{action}` - All image tools (convert, resize, compress, **remove_bg**, etc.)
  - `/api/pdf/{action}` - All PDF tools (merge, split, compress, etc.)
  - `/api/pdf-editor/*` - PDF annotation features
- **Communication**: REST API only
- **Auto-started**: No, must start manually for web development
- **Used by**: Web app (`website/` Next.js project)

## Shared Processing Modules

Both servers use the **same** Python modules:

```
python-backend/modules/
├── image_tools.py      # All image processing (PIL, rembg, etc.)
├── pdf_tools.py        # All PDF processing (PyMuPDF)
├── pdf_editor.py       # PDF annotation/editing
├── licensing.py        # Trial/activation system
└── security.py         # Input validation
```

## Development Workflow

### Running Desktop App Only
```bash
# Start desktop app (auto-starts main.py on port 8000)
npm run tauri dev
```

### Running Web App Only
```bash
# Terminal 1: Start web backend
cd python-backend
python server.py          # Runs on port 8001

# Terminal 2: Start Next.js dev server
cd website
npm run dev               # Runs on port 3000
```

### Running Both (Desktop + Web)
```bash
# Terminal 1: Start desktop app
npm run tauri dev         # Backend on port 8000

# Terminal 2: Start web backend
cd python-backend
python server.py          # Backend on port 8001

# Terminal 3: Start Next.js
cd website
npm run dev               # Frontend on port 3000
```

**No conflict!** Each uses different ports:
- Desktop backend: 8000
- Web backend: 8001
- Next.js dev: 3000
- Desktop UI: Tauri window

## Configuration

### Web App API Configuration
File: `website/lib/config.ts`

```typescript
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8001"  // Points to web backend (server.py)
```

### Desktop App API Configuration
File: `src/config.ts`

```typescript
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  "http://127.0.0.1:8000"  // Points to desktop backend (main.py)
```

## Port Assignment Summary

| Port | Server | Purpose | Endpoints |
|------|--------|---------|-----------|
| 8000 | `main.py` | Desktop sidecar | PDF Editor only |
| 8001 | `server.py` | Web API | **All tools** (PDF + Image + Editor) |
| 3000 | Next.js | Web frontend | Static/SSR pages |

## Common Issues

### "Not Found" on Web Tools
**Symptom**: Tools like `remove-image-background` return 404
**Cause**: Web app trying to use desktop backend (port 8000)
**Solution**: Ensure `server.py` is running on port 8001

### Port Already in Use
**Symptom**: `Address already in use` error
**Cause**: Both servers trying to use same port
**Solution**: Ports are now separated (8000 vs 8001)

### Endpoint Not Found
**Symptom**: Specific tool endpoint returns 404
**Cause**: Using wrong backend server
**Solution**:
- Web app → Must use `server.py` (port 8001)
- Desktop app → Uses `main.py` (port 8000)

## Testing Endpoints

```bash
# Test desktop backend (port 8000)
curl http://localhost:8000/
# Response: {"status":"online","mode":"desktop-hybrid"}

# Test web backend (port 8001)
curl -X POST http://localhost:8001/api/image/remove_bg
# Response: Error about missing files (endpoint exists ✓)

# Test web frontend
curl http://localhost:3000/
# Response: HTML page
```

## Production Deployment

### Desktop App
- Bundles `main.py` as PyInstaller executable
- Included in Tauri installer
- No external server needed

### Web App
- Deploy `server.py` as backend service
- Configure Nginx to proxy `/api/*` to backend
- Update `API_BASE_URL` for production domain
