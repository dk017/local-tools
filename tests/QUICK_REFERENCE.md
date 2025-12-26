# Test Suite Quick Reference

## 🚀 Running Tests

### Automatic (Easiest)
```bash
cd tests
npm run test:web
```
Playwright automatically starts backend and frontend servers.

### Manual (For Debugging)
```bash
# Terminal 1: Backend
cd python-backend && python -m uvicorn api:app --port 8000

# Terminal 2: Frontend
cd website && npm run dev

# Terminal 3: Tests
cd tests && npm run test:web
```

## 📋 Common Commands

```bash
# All tests
npm run test:web

# Specific test
npm run test:web -- remove-background

# UI mode (interactive)
npm run test:ui

# Headed mode (see browser)
npm run test:headed

# Debug mode
npm run test:debug

# View report
npm run test:report
```

## 📁 Key Files

- **Tests**: `tests/integration/web/*.spec.ts`
- **Fixtures**: `tests/fixtures/images/`, `tests/fixtures/pdfs/`
- **Utils**: `tests/utils/`
- **Config**: `tests/playwright.config.ts`

## 🔧 Setup (First Time)

```bash
# 1. Install dependencies
cd tests
npm install
npx playwright install

# 2. Install backend deps
cd ../python-backend
pip install -r requirements.txt

# 3. Install frontend deps
cd ../website
npm install

# 4. Add test fixtures
# Place files in tests/fixtures/
```

## 📚 Documentation

- **Full Guide**: `README.md`
- **Local Setup**: `RUN_LOCALLY.md`
- **Adding Tests**: `EXTENDING_TESTS.md`
- **CI Setup**: `GITHUB_ACTIONS.md`

## ⚡ Quick Troubleshooting

**Servers not starting?**
- Check ports 8000 and 3000 are free
- Verify dependencies installed
- See `RUN_LOCALLY.md` for details

**Tests failing?**
- Check fixtures exist in `tests/fixtures/`
- Verify servers are running
- Check test output for errors

**Need help?**
- See `RUN_LOCALLY.md` troubleshooting section
- Check test examples in `tests/integration/web/`

