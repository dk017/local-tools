# Extending the Test Suite

Complete guide for adding tests for new tools.

## 📋 Step-by-Step Guide

### Step 1: Identify Tool Details

1. **Tool slug**: Check `website/data/tools.ts` or `src/tools_config.json`
2. **API endpoint**: Check `website/app/[locale]/tools/[slug]/page.tsx` → `getApiEndpoint()`
3. **Input type**: PDF, Image, or both?
4. **Output type**: PDF, Image, ZIP, or JSON?

### Step 2: Create Test File

Create `tests/integration/web/your-tool.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { BaseTest } from '../../utils/base-test';
import { fileLoader } from '../../utils/file-loader';
// Import validators as needed
import { pdfInspector } from '../../utils/pdf-inspector';
import { imageValidator } from '../../utils/image-validator';

test.describe('Your Tool Name', () => {
  let baseTest: BaseTest;

  test.beforeEach(async ({ page }) => {
    baseTest = new BaseTest(page);
    await baseTest.navigateToTool('your-tool-slug');
  });

  test('should process file correctly', async ({ page }) => {
    // Your test here
  });
});
```

### Step 3: Write Test Cases

#### Basic Test Template

```typescript
test('should [expected behavior]', async ({ page }) => {
  // 1. Setup: Load input file
  const inputFile = fileLoader.getFixturePath('category/input-file.ext');
  
  // 2. Action: Upload and process
  await baseTest.uploadFile(inputFile);
  
  // 3. Optional: Set options/parameters
  await page.selectOption('select[name="option"]', 'value');
  
  // 4. Wait for processing
  await baseTest.waitForProcessing();
  
  // 5. Download result
  const outputPath = await baseTest.downloadFile();
  
  // 6. Validate output
  await baseTest.assertPDFValid(outputPath); // or assertImageFormat, etc.
});
```

#### Multi-file Test Template

```typescript
test('should process multiple files', async ({ page }) => {
  const files = [
    fileLoader.getFixturePath('files/file1.pdf'),
    fileLoader.getFixturePath('files/file2.pdf'),
  ];
  
  await baseTest.uploadFiles(files);
  await baseTest.waitForProcessing();
  const outputPath = await baseTest.downloadFile();
  
  // Validate based on expected output
});
```

#### Options/Parameters Test Template

```typescript
test('should apply [option] correctly', async ({ page }) => {
  await baseTest.uploadFile(inputFile);
  
  // Set options
  await page.selectOption('select[name="quality"]', 'high');
  await page.fill('input[name="custom"]', 'value');
  await page.click('button:has-text("Apply")');
  
  await baseTest.waitForProcessing();
  const outputPath = await baseTest.downloadFile();
  
  // Validate option was applied
});
```

### Step 4: Add Test Fixtures

1. **Create fixture files** in `tests/fixtures/`:
   - PDFs: `tests/fixtures/pdfs/your-test-file.pdf`
   - Images: `tests/fixtures/images/your-test-file.jpg`

2. **Use appropriate fixtures**:
   - Small files for quick tests
   - Representative samples (not too large)
   - Files that test edge cases

### Step 5: Choose Validation Methods

#### For PDF Tools:

```typescript
// Page count validation
await baseTest.assertPDFPageCount(outputPath, expectedPages);

// PDF validity
await baseTest.assertPDFValid(outputPath);

// File size comparison
await baseTest.assertFileSizeReduction(originalPath, outputPath, minReductionPercent);

// Metadata check
const metadata = await pdfInspector.getMetadata(outputPath);
expect(metadata.title).toBe('Expected Title');
```

#### For Image Tools:

```typescript
// Dimensions validation
await baseTest.assertImageDimensions(outputPath, width, height, tolerance);

// Format validation
await baseTest.assertImageFormat(outputPath, 'png');

// Transparency check
const hasAlpha = await imageValidator.hasTransparency(outputPath);
expect(hasAlpha).toBe(true);

// Pixel comparison
await baseTest.assertImagesSimilar(image1, image2, threshold);
```

### Step 6: Test Edge Cases

Add tests for:
- Empty files
- Large files
- Invalid formats
- Single file vs multiple files
- Different parameter combinations

Example:

```typescript
test('should handle invalid file format gracefully', async ({ page }) => {
  const invalidFile = fileLoader.getFixturePath('files/invalid.txt');
  await baseTest.uploadFile(invalidFile);
  
  // Should show error message
  await expect(page.locator('text=/error|invalid/i')).toBeVisible();
});
```

### Step 7: Copy to Desktop Tests

1. **Copy test file** to `tests/integration/desktop/your-tool.spec.ts`
2. **Adjust navigation** if desktop app uses different routes
3. **Test desktop-specific features** (if any)

### Step 8: Run and Verify

```bash
# Run your new test
npm run test:web -- your-tool

# Run in UI mode to debug
npm run test:ui -- your-tool

# Run in headed mode to see browser
npm run test:headed -- your-tool
```

## 📝 Common Patterns

### Pattern 1: Compression Tool

```typescript
test('should compress and reduce size', async ({ page }) => {
  const original = fileLoader.getFixturePath('files/large.pdf');
  const originalSize = fileLoader.getFileSize(original);
  
  await baseTest.uploadFile(original);
  await baseTest.waitForProcessing();
  const output = await baseTest.downloadFile();
  
  await baseTest.assertFileSizeReduction(original, output, 10);
  await baseTest.assertPDFValid(output);
});
```

### Pattern 2: Conversion Tool

```typescript
test('should convert format correctly', async ({ page }) => {
  const input = fileLoader.getFixturePath('images/image.jpg');
  const originalFormat = await imageValidator.getFormat(input);
  
  await baseTest.uploadFile(input);
  await page.selectOption('select[name="format"]', 'png');
  await baseTest.waitForProcessing();
  const output = await baseTest.downloadFile();
  
  await baseTest.assertImageFormat(output, 'png');
  expect(await imageValidator.getFormat(output)).not.toBe(originalFormat);
});
```

### Pattern 3: Multi-page Tool

```typescript
test('should process all pages', async ({ page }) => {
  const input = fileLoader.getFixturePath('pdfs/multi-page.pdf');
  const originalPageCount = await pdfInspector.getPageCount(input);
  
  await baseTest.uploadFile(input);
  await baseTest.waitForProcessing();
  const output = await baseTest.downloadFile();
  
  // Verify all pages processed
  await baseTest.assertPDFPageCount(output, originalPageCount);
});
```

### Pattern 4: ZIP Output Tool

```typescript
test('should create ZIP with multiple files', async ({ page }) => {
  const files = [/* multiple files */];
  await baseTest.uploadFiles(files);
  await baseTest.waitForProcessing();
  const output = await baseTest.downloadFile();
  
  // Extract and verify ZIP contents
  const zip = new AdmZip(output);
  const entries = zip.getEntries();
  expect(entries.length).toBe(expectedCount);
});
```

## 🎯 Validation Checklist

For each tool, verify:

- [ ] Input is processed successfully
- [ ] Output format is correct
- [ ] Output is valid (can be opened)
- [ ] Dimensions/size are as expected
- [ ] Quality is maintained (if applicable)
- [ ] Options/parameters are applied correctly
- [ ] Multiple files are handled correctly
- [ ] Error handling works for invalid inputs
- [ ] Edge cases are covered

## 🔍 Debugging Tips

1. **Use UI mode**: `npm run test:ui` to step through tests
2. **Add screenshots**: Tests auto-screenshot on failure
3. **Check logs**: Backend logs show processing details
4. **Inspect output**: Check `test-results/outputs/` for downloaded files
5. **Use headed mode**: `npm run test:headed` to see browser

## 📚 Example: Complete Tool Test

See `tests/integration/web/compress-pdf.spec.ts` for a complete example covering:
- Basic functionality
- Different options
- Edge cases
- Validation

## 🚀 Next Steps

1. Write test for your tool
2. Add test fixtures
3. Run and verify
4. Add to CI pipeline
5. Document any tool-specific requirements

---

**Questions?** Check existing tests in `tests/integration/web/` for more examples.

