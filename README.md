# Local Tools - Offline PDF & Image Processing

A dual-platform application for PDF and image processing with 100% offline capability.

- **Desktop App**: Tauri v2 (Windows/Mac/Linux) with bundled Python backend
- **Web App**: Next.js website with Python FastAPI backend

## Quick Start

### Desktop Development

```bash
npm install
npm run tauri dev
```

### Production Build

**⚠️ IMPORTANT**: Configure licensing before building for production!

```bash
# 1. Set up license configuration
cp .env.example .env
# Edit .env and add your LEMONSQUEEZY_API_KEY

# 2. Build with license validation
npm run tauri:build:production  # Windows
npm run tauri:build:production:unix  # Linux/macOS
```

See **[LICENSING_SETUP.md](LICENSING_SETUP.md)** for detailed instructions.

## Documentation

- **[CLAUDE.md](CLAUDE.md)**: Development guide and architecture
- **[LICENSING_SETUP.md](LICENSING_SETUP.md)**: License validation setup
- **[QUICK_WINS_SUMMARY.md](QUICK_WINS_SUMMARY.md)**: Size optimization guide (60-120 MB reduction)
- **[BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md)**: Backend architecture details

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
