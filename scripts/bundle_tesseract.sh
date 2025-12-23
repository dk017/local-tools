#!/bin/bash
# Script to download and bundle Tesseract OCR for desktop app (macOS/Linux)

set -e

echo "🔍 Downloading Tesseract OCR for Desktop Bundle..."

BINARIES_DIR="src-tauri/binaries"
TESSERACT_DIR="$BINARIES_DIR/tesseract"

# Create directories
mkdir -p "$TESSERACT_DIR/tessdata"

# Detect OS
OS=$(uname -s)
ARCH=$(uname -m)

if [ "$OS" = "Darwin" ]; then
    echo "🍎 macOS detected"
    
    # Check if Homebrew is installed
    if ! command -v brew &> /dev/null; then
        echo "❌ Homebrew not found. Install from: https://brew.sh"
        exit 1
    fi
    
    # Install Tesseract via Homebrew
    echo "📥 Installing Tesseract via Homebrew..."
    brew install tesseract
    
    # Copy Tesseract binary and English language data
    TESSERACT_PATH=$(which tesseract)
    TESSDATA_PATH=$(brew --prefix)/share/tessdata
    
    if [ -f "$TESSERACT_PATH" ]; then
        cp "$TESSERACT_PATH" "$TESSERACT_DIR/tesseract"
        chmod +x "$TESSERACT_DIR/tesseract"
        echo "✅ Copied tesseract binary"
    else
        echo "❌ Tesseract binary not found at $TESSERACT_PATH"
        exit 1
    fi
    
    if [ -f "$TESSDATA_PATH/eng.traineddata" ]; then
        cp "$TESSDATA_PATH/eng.traineddata" "$TESSERACT_DIR/tessdata/eng.traineddata"
        echo "✅ Copied English language data"
    else
        echo "⚠️  English language data not found. Downloading..."
        curl -L "https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata" \
            -o "$TESSERACT_DIR/tessdata/eng.traineddata"
        echo "✅ Downloaded English language data"
    fi
    
elif [ "$OS" = "Linux" ]; then
    echo "🐧 Linux detected"
    
    # Check if Tesseract is installed
    if ! command -v tesseract &> /dev/null; then
        echo "❌ Tesseract not found. Install with:"
        echo "   Ubuntu/Debian: sudo apt-get install tesseract-ocr tesseract-ocr-eng"
        echo "   Fedora: sudo dnf install tesseract tesseract-langpack-eng"
        exit 1
    fi
    
    # Find Tesseract binary
    TESSERACT_PATH=$(which tesseract)
    
    if [ -f "$TESSERACT_PATH" ]; then
        cp "$TESSERACT_PATH" "$TESSERACT_DIR/tesseract"
        chmod +x "$TESSERACT_DIR/tesseract"
        echo "✅ Copied tesseract binary"
    else
        echo "❌ Tesseract binary not found"
        exit 1
    fi
    
    # Find tessdata directory
    TESSDATA_PATH="/usr/share/tesseract-ocr/5/tessdata"
    if [ ! -d "$TESSDATA_PATH" ]; then
        TESSDATA_PATH="/usr/share/tesseract-ocr/4.00/tessdata"
    fi
    if [ ! -d "$TESSDATA_PATH" ]; then
        TESSDATA_PATH="/usr/local/share/tessdata"
    fi
    
    if [ -f "$TESSDATA_PATH/eng.traineddata" ]; then
        cp "$TESSDATA_PATH/eng.traineddata" "$TESSERACT_DIR/tessdata/eng.traineddata"
        echo "✅ Copied English language data"
    else
        echo "⚠️  English language data not found. Downloading..."
        curl -L "https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata" \
            -o "$TESSERACT_DIR/tessdata/eng.traineddata"
        echo "✅ Downloaded English language data"
    fi
else
    echo "❌ Unsupported OS: $OS"
    exit 1
fi

echo ""
echo "✅ Tesseract bundling complete!"
echo "Structure:"
echo "$TESSERACT_DIR/"
echo "  ├── tesseract"
echo "  └── tessdata/"
echo "      └── eng.traineddata"

