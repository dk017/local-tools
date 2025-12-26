# Test Fixtures

This directory contains test files used by the integration test suite.

## 📁 Structure

```
fixtures/
├── images/
│   ├── portrait.jpg              # Standard portrait photo
│   ├── portrait-with-bg.jpg      # Portrait with background (for BG removal)
│   ├── product-with-bg.jpg       # Product photo with background
│   ├── small-image.jpg          # Small image (for upscaling)
│   ├── image1.jpg, image2.jpg, image3.jpg  # Multiple images (for batch tests)
│   └── ...
└── pdfs/
    ├── single-page.pdf           # Single page PDF
    ├── multi-page.pdf            # Multi-page PDF (3+ pages)
    ├── large-document.pdf        # Large PDF (for compression tests)
    ├── document-with-images.pdf  # PDF with embedded images
    ├── document1.pdf, document2.pdf, document3.pdf  # Multiple PDFs (for merge)
    └── ...
```

## 📝 Required Fixtures

### Images

- `portrait.jpg` - Standard portrait (for passport photo, crop, etc.)
- `portrait-with-bg.jpg` - Portrait with background (for background removal)
- `product-with-bg.jpg` - Product photo with background
- `small-image.jpg` - Small image (e.g., 200x200px) for upscaling tests
- `image1.jpg`, `image2.jpg`, `image3.jpg` - Multiple images for batch processing

### PDFs

- `single-page.pdf` - Single page PDF
- `multi-page.pdf` - Multi-page PDF (at least 3 pages)
- `large-document.pdf` - Large PDF (for compression tests, >1MB)
- `document-with-images.pdf` - PDF with embedded images
- `document1.pdf`, `document2.pdf`, `document3.pdf` - Multiple PDFs for merge tests

## 🎯 Guidelines

1. **Keep files small**: Tests should run quickly
   - Images: < 500KB each
   - PDFs: < 2MB each (except `large-document.pdf`)

2. **Use realistic samples**: Files should represent real use cases

3. **Name clearly**: File names should indicate their purpose

4. **Avoid sensitive data**: Don't use files with personal/sensitive information

## 📥 Adding New Fixtures

1. Place file in appropriate directory (`images/` or `pdfs/`)
2. Use descriptive name
3. Update this README if adding a new category
4. Ensure file is not too large (< 5MB recommended)

## ⚠️ Note

These fixtures are not included in the repository. You need to add your own test files.

For testing purposes, you can:
- Use sample files from your project
- Download free test images/PDFs
- Generate test files programmatically

