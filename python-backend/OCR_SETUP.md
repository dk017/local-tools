# OCR PDF Setup Guide

The OCR PDF feature requires **Tesseract OCR** to be installed on your system. This is a system-level dependency (not just a Python package).

## Installation Instructions

### Windows

1. **Download Tesseract:**
   - Visit: https://github.com/UB-Mannheim/tesseract/wiki
   - Download the latest installer (e.g., `tesseract-ocr-w64-setup-5.x.x.exe`)

2. **Install:**
   - Run the installer
   - **Important:** During installation, check "Add to PATH" or note the installation path (usually `C:\Program Files\Tesseract-OCR`)

3. **Add to PATH (if not done during install):**
   - Open System Properties → Environment Variables
   - Add `C:\Program Files\Tesseract-OCR` to your PATH
   - Or set `TESSDATA_PREFIX` environment variable to `C:\Program Files\Tesseract-OCR\tessdata`

4. **Restart:**
   - Close and restart the application/terminal

5. **Verify:**
   ```bash
   tesseract --version
   ```

### macOS

1. **Install Homebrew** (if not already installed):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Install Tesseract:**
   ```bash
   brew install tesseract
   ```

3. **Verify:**
   ```bash
   tesseract --version
   ```

### Linux

#### Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install tesseract-ocr
```

#### Fedora:
```bash
sudo dnf install tesseract
```

#### Arch Linux:
```bash
sudo pacman -S tesseract
```

#### Verify:
```bash
tesseract --version
```

## Language Packs (Optional)

For OCR in languages other than English, install additional language packs:

### Windows:
- Download language packs from: https://github.com/tesseract-ocr/tessdata
- Place `.traineddata` files in `C:\Program Files\Tesseract-OCR\tessdata`

### macOS/Linux:
```bash
# Example: Install German, French, Spanish
brew install tesseract-lang  # macOS
# or
sudo apt-get install tesseract-ocr-deu tesseract-ocr-fra tesseract-ocr-spa  # Ubuntu
```

## Troubleshooting

### Error: "tesseract is not installed or it's not in your PATH"

1. **Verify Tesseract is installed:**
   - Open terminal/command prompt
   - Run: `tesseract --version`
   - If this fails, Tesseract is not installed or not in PATH

2. **Windows - Manual PATH setup:**
   - Find Tesseract installation (usually `C:\Program Files\Tesseract-OCR`)
   - Add to System PATH or set `TESSDATA_PREFIX` environment variable

3. **Set Tesseract path in code (temporary workaround):**
   ```python
   import pytesseract
   pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
   ```

### Error: "pytesseract and pdf2image required"

Install Python packages:
```bash
pip install pytesseract pdf2image
```

### OCR Quality Issues

- **Increase DPI:** The code uses 300 DPI by default. Higher DPI = better accuracy but slower processing.
- **Language selection:** Ensure the correct language code is selected (e.g., 'eng', 'deu', 'fra')
- **Image quality:** OCR works best on high-contrast, clear images. Pre-process images if needed.

## Testing

After installation, test OCR functionality:
1. Use a scanned PDF or image-based PDF
2. Run OCR PDF tool
3. Check if the output PDF is searchable (try Ctrl+F in a PDF viewer)

## Notes

- **Desktop App:** Tesseract should be bundled or installed separately for the desktop version
- **Web Version:** Tesseract must be installed on the server running the Python backend
- **Performance:** OCR is CPU-intensive. Large PDFs may take several minutes.

