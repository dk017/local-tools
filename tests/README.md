# Integration Test Suite

Complete integration test suite for offline-tools project covering 40+ PDF and image tools.

## 📁 Structure

```
tests/
├── integration/
│   ├── web/              # Web app tests
│   │   ├── remove-background.spec.ts
│   │   ├── passport-photo.spec.ts
│   │   ├── split-pdf.spec.ts
│   │   ├── merge-pdf.spec.ts
│   │   ├── compress-pdf.spec.ts
│   │   ├── images-to-pdf.spec.ts
│   │   ├── pdf-to-images.spec.ts
│   │   └── upscale-image.spec.ts
│   └── desktop/           # Desktop app tests (same structure)
├── fixtures/
│   ├── images/           # Test images
│   │   ├── portrait.jpg
│   │   ├── portrait-with-bg.jpg
│   │   ├── product-with-bg.jpg
│   │   └── ...
│   └── pdfs/             # Test PDFs
│       ├── single-page.pdf
│       ├── multi-page.pdf
│       ├── large-document.pdf
│       └── ...
├── utils/                # Test utilities
│   ├── base-test.ts      # Base test class
│   ├── file-loader.ts   # File operations
│   ├── pdf-inspector.ts # PDF validation
│   ├── image-validator.ts # Image validation
│   └── pixel-diff.ts    # Image comparison
├── playwright.config.ts  # Web app config
├── playwright.desktop.config.ts # Desktop app config
└── package.json
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd tests
npm install
npx playwright install
```

### 2. Prepare Test Fixtures

Place test files in `tests/fixtures/`:
- **Images**: `images/portrait.jpg`, `images/portrait-with-bg.jpg`, etc.
- **PDFs**: `pdfs/single-page.pdf`, `pdfs/multi-page.pdf`, etc.

### 3. Run Tests

**Automatic (Recommended):** Playwright will start servers for you:
```bash
npm run test:web
```

**Manual:** Start servers yourself (see `RUN_LOCALLY.md` for details):
```bash
# Terminal 1: Backend
cd python-backend && python -m uvicorn api:app --port 8000

# Terminal 2: Frontend  
cd website && npm run dev

# Terminal 3: Tests
cd tests && npm run test:web
```

**Other commands:**
```bash
# Run specific test
npm run test:web -- remove-background

# Run in UI mode (interactive)
npm run test:ui

# Run in headed mode (see browser)
npm run test:headed
```

📖 **For detailed local setup, see [RUN_LOCALLY.md](./RUN_LOCALLY.md)**

## 📝 Writing New Tests

### Example: Adding a New Tool Test

1. **Create test file**: `tests/integration/web/my-tool.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { BaseTest } from '../../utils/base-test';

test.describe('My Tool', () => {
  let baseTest: BaseTest;

  test.beforeEach(async ({ page }) => {
    baseTest = new BaseTest(page);
    await baseTest.navigateToTool('my-tool-slug');
  });

  test('should process file correctly', async ({ page }) => {
    const testFile = baseTest.fileLoader.getFixturePath('files/test.pdf');
    await baseTest.uploadFile(testFile);
    await baseTest.waitForProcessing();
    const outputPath = await baseTest.downloadFile();
    
    // Validate output
    await baseTest.assertPDFValid(outputPath);
  });
});
```

2. **Add test fixtures** to `tests/fixtures/` if needed

3. **Run the test**: `npm run test:web -- my-tool`

## 🧪 Test Utilities

### BaseTest Class

Provides common functionality:
- `navigateToTool(slug)` - Navigate to tool page
- `uploadFile(path)` - Upload file
- `waitForProcessing()` - Wait for processing to complete
- `downloadFile()` - Download result
- `callAPI(endpoint, files)` - Direct API call (faster)

### PDF Inspector

```typescript
import { pdfInspector } from '../utils/pdf-inspector';

const pageCount = await pdfInspector.getPageCount(pdfPath);
const isValid = await pdfInspector.isValid(pdfPath);
const metadata = await pdfInspector.getMetadata(pdfPath);
```

### Image Validator

```typescript
import { imageValidator } from '../utils/image-validator';

const dims = await imageValidator.getDimensions(imagePath);
const format = await imageValidator.getFormat(imagePath);
const hasAlpha = await imageValidator.hasTransparency(imagePath);
```

### Pixel Diff

```typescript
import { pixelDiff } from '../utils/pixel-diff';

const result = await pixelDiff.compare(image1, image2, 0.01);
expect(result.different).toBe(false);
```

## 🔧 Configuration

### Web Tests (`playwright.config.ts`)

- Base URL: `http://localhost:3000`
- Backend: `http://localhost:8000`
- Auto-starts servers if not running

### Desktop Tests (`playwright.desktop.config.ts`)

- Requires desktop app to be built
- Set `DESKTOP_APP_PATH` environment variable

## 📊 Test Patterns

### Pattern 1: Basic Tool Test

```typescript
test('should process file', async ({ page }) => {
  const input = baseTest.fileLoader.getFixturePath('files/input.pdf');
  await baseTest.uploadFile(input);
  await baseTest.waitForProcessing();
  const output = await baseTest.downloadFile();
  await baseTest.assertPDFValid(output);
});
```

### Pattern 2: Multi-file Test

```typescript
test('should process multiple files', async ({ page }) => {
  const files = [
    baseTest.fileLoader.getFixturePath('files/file1.pdf'),
    baseTest.fileLoader.getFixturePath('files/file2.pdf'),
  ];
  await baseTest.uploadFiles(files);
  await baseTest.waitForProcessing();
  const output = await baseTest.downloadFile();
  // Validate...
});
```

### Pattern 3: Options/Parameters Test

```typescript
test('should apply options correctly', async ({ page }) => {
  await baseTest.uploadFile(input);
  await page.selectOption('select[name="quality"]', 'high');
  await page.fill('input[name="custom"]', 'value');
  await baseTest.waitForProcessing();
  // Validate options were applied...
});
```

## 🎯 Best Practices

1. **Use real fixtures**: Don't mock files, use actual test files
2. **Validate output quality**: Check dimensions, format, content
3. **Test edge cases**: Empty files, large files, invalid formats
4. **Keep tests independent**: Each test should be self-contained
5. **Use descriptive names**: Test names should explain what they test

## 🐛 Troubleshooting

### Tests fail with "Server not running"

Start servers manually:
```bash
# Terminal 1: Backend
cd python-backend && python -m uvicorn api:app --port 8000

# Terminal 2: Frontend
cd website && npm run dev
```

### Tests timeout

Increase timeout in test:
```typescript
test('slow test', async ({ page }) => {
  test.setTimeout(300000); // 5 minutes
  // ...
});
```

### Desktop tests fail

1. Build desktop app: `npm run tauri build`
2. Set `DESKTOP_APP_PATH` environment variable
3. Ensure app is not already running

## 📈 CI Integration

Add to `.github/workflows/tests.yml`:

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd tests && npm install && npx playwright install
      - run: cd tests && npm run test:web
```

## 📚 Extending the Test Suite

See `EXTENDING_TESTS.md` for detailed guide on adding new tools.

