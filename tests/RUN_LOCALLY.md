# Running Tests Locally

Complete guide for running integration tests on your local machine.

## 🚀 Quick Start

### Option 1: Automatic (Recommended)

The Playwright config automatically starts servers for you:

```bash
cd tests
npm install
npx playwright install
npm run test:web
```

Playwright will:
- ✅ Start backend server automatically
- ✅ Start frontend server automatically
- ✅ Run tests
- ✅ Stop servers when done

### Option 2: Manual (For Debugging)

If you want more control or need to debug:

#### Step 1: Start Backend Server

```bash
# Terminal 1: Backend
cd python-backend

# Option A: Using uvicorn directly
python -m uvicorn api:app --host 0.0.0.0 --port 8000

# Option B: Using FastAPI CLI (if installed)
fastapi dev api.py

# Option C: Using Python script
python api.py
```

**Verify backend is running:**
```bash
curl http://localhost:8000/health
# Should return: {"status":"online","mode":"web-api"}
```

#### Step 2: Start Frontend Server

```bash
# Terminal 2: Frontend
cd website
npm install  # First time only
npm run dev
```

**Verify frontend is running:**
- Open browser: http://localhost:3000
- Should see your website

#### Step 3: Run Tests

```bash
# Terminal 3: Tests
cd tests
npm install  # First time only
npx playwright install  # First time only

# Run all tests
npm run test:web

# Run specific test
npm run test:web -- remove-background

# Run in UI mode (interactive)
npm run test:ui

# Run in headed mode (see browser)
npm run test:headed

# Run in debug mode
npm run test:debug
```

## 📋 Prerequisites

### 1. Install Dependencies

```bash
# Install test dependencies
cd tests
npm install

# Install Playwright browsers
npx playwright install

# Install system dependencies (Linux)
npx playwright install-deps
```

### 2. Install Backend Dependencies

```bash
cd python-backend
pip install -r requirements.txt
```

### 3. Install Frontend Dependencies

```bash
cd website
npm install
```

### 4. Add Test Fixtures

Place test files in `tests/fixtures/`:
- **Images**: `tests/fixtures/images/*.jpg`, `*.png`
- **PDFs**: `tests/fixtures/pdfs/*.pdf`

See `tests/fixtures/README.md` for required files.

## 🎯 Common Commands

### Run Tests

```bash
# All web tests
npm run test:web

# All desktop tests (requires built desktop app)
npm run test:desktop

# Specific test file
npm run test:web -- remove-background

# Specific test by name
npm run test:web -- -g "should remove background"

# Run tests matching pattern
npm run test:web -- --grep "passport"
```

### Debug Tests

```bash
# UI mode (interactive, step through tests)
npm run test:ui

# Headed mode (see browser)
npm run test:headed

# Debug mode (pause on breakpoints)
npm run test:debug

# Debug specific test
npm run test:debug -- remove-background
```

### View Results

```bash
# Open HTML report
npm run test:report

# Or manually
npx playwright show-report test-results/html
```

## 🔧 Configuration

### Environment Variables

Tests use these defaults (can be overridden):

```bash
# Backend
CORS_ORIGINS="*"  # Allow all origins for testing
MAX_FILE_SIZE=52428800
MAX_TOTAL_SIZE=104857600

# Frontend
NODE_ENV=production  # or development
NEXT_PUBLIC_API_URL=http://localhost:8000

# Tests
WEB_BASE_URL=http://localhost:3000
CI=false  # Set to true in CI
```

### Custom Ports

If your servers run on different ports, update `playwright.config.ts`:

```typescript
use: {
  baseURL: 'http://localhost:YOUR_PORT',
},
webServer: [
  {
    url: 'http://localhost:YOUR_BACKEND_PORT/health',
  },
  {
    url: 'http://localhost:YOUR_FRONTEND_PORT',
  },
],
```

## 🐛 Troubleshooting

### Issue: "Backend server not running"

**Solution:**
```bash
# Check if backend is running
curl http://localhost:8000/health

# If not, start it manually
cd python-backend
python -m uvicorn api:app --port 8000
```

### Issue: "Frontend server not running"

**Solution:**
```bash
# Check if frontend is running
curl http://localhost:3000

# If not, start it manually
cd website
npm run dev
```

### Issue: "Tests timeout"

**Solution:**
1. Increase timeout in test:
   ```typescript
   test('slow test', async ({ page }) => {
     test.setTimeout(300000); // 5 minutes
   });
   ```

2. Or in `playwright.config.ts`:
   ```typescript
   use: {
     actionTimeout: 60000, // 60 seconds
   },
   ```

### Issue: "Playwright browsers not installed"

**Solution:**
```bash
cd tests
npx playwright install
npx playwright install-deps  # Linux only
```

### Issue: "Test fixtures not found"

**Solution:**
1. Check fixtures exist: `ls tests/fixtures/images/`
2. Add missing fixtures (see `tests/fixtures/README.md`)
3. Update test to use correct fixture path

### Issue: "Port already in use"

**Solution:**
```bash
# Find process using port
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8000 | xargs kill -9
```

### Issue: "Python dependencies missing"

**Solution:**
```bash
cd python-backend
pip install -r requirements.txt

# Or use virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

## 📊 Test Output

### Console Output

Tests show:
- ✅ Passed tests
- ❌ Failed tests with error messages
- ⏱️ Test duration
- 📊 Summary statistics

### Test Results

Results are saved to:
- `tests/test-results/` - Screenshots, videos, traces
- `tests/test-results/html/` - HTML report
- `tests/test-results/outputs/` - Downloaded files

### Viewing Reports

```bash
# Open HTML report
npm run test:report

# Or
npx playwright show-report test-results/html
```

## 🎓 Best Practices

1. **Run tests before committing:**
   ```bash
   npm run test:web
   ```

2. **Use UI mode for debugging:**
   ```bash
   npm run test:ui
   ```

3. **Keep fixtures small:**
   - Images: < 500KB
   - PDFs: < 2MB

4. **Clean up test outputs:**
   ```bash
   rm -rf tests/test-results/outputs/*
   ```

5. **Run specific tests during development:**
   ```bash
   npm run test:web -- your-tool
   ```

## 🔍 Debugging Tips

1. **Use headed mode** to see what's happening:
   ```bash
   npm run test:headed
   ```

2. **Add console.log** in tests:
   ```typescript
   console.log('Debug info:', await page.url());
   ```

3. **Take screenshots** on failure (automatic):
   - Check `test-results/` folder

4. **Use Playwright Inspector:**
   ```bash
   npm run test:debug
   ```

5. **Check server logs:**
   - Backend: Check terminal running uvicorn
   - Frontend: Check terminal running npm run dev

## 📚 Next Steps

- **Add more tests**: See `EXTENDING_TESTS.md`
- **Set up CI**: See `GITHUB_ACTIONS.md`
- **Read full guide**: See `README.md`

---

**Need help?** Check the troubleshooting section or review test examples in `tests/integration/web/`.

