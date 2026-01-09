#!/bin/bash
# Build Tauri App with Environment Variables
# This script loads .env file and builds the desktop app with license validation enabled

set -e  # Exit on error

SKIP_BUNDLE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-bundle)
            SKIP_BUNDLE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "🔧 Building Tauri Desktop App with License Configuration..."

# Load .env file if it exists
ENV_FILE="$(dirname "$0")/../.env"
if [ -f "$ENV_FILE" ]; then
    echo "✅ Loading environment variables from .env file..."

    # Export variables from .env
    set -a
    source "$ENV_FILE"
    set +a

    echo "  Environment variables loaded"
else
    echo "⚠️  Warning: .env file not found at $ENV_FILE"
    echo "   License validation will not work in the built app."
    echo "   Create a .env file based on .env.example to enable licensing."
fi

# Verify LEMONSQUEEZY_API_KEY is set
if [ -n "$LEMONSQUEEZY_API_KEY" ]; then
    MASKED_KEY="${LEMONSQUEEZY_API_KEY:0:8}..."
    echo "✅ LEMONSQUEEZY_API_KEY is configured ($MASKED_KEY)"
else
    echo "⚠️  Warning: LEMONSQUEEZY_API_KEY is not set!"
    echo "   License activation will not work in the built app."
fi

echo ""

# Bundle Tesseract unless skipped
if [ "$SKIP_BUNDLE" = false ]; then
    echo "📦 Bundling Tesseract OCR..."
    npm run bundle:tesseract:unix
    echo ""
fi

# Build Tauri app
echo "🏗️  Building Tauri application..."
npm run tauri build

echo ""
echo "✅ Build completed successfully!"
echo "   Installer location: src-tauri/target/release/bundle/"
