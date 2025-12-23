# Script to download and bundle Tesseract OCR for desktop app
# This script downloads Tesseract binaries and language data for Windows

$ErrorActionPreference = "Stop"

Write-Host "🔍 Downloading Tesseract OCR for Desktop Bundle..." -ForegroundColor Cyan

$binariesDir = "src-tauri\binaries"
$tesseractDir = "$binariesDir\tesseract"

# Create directories
New-Item -ItemType Directory -Force -Path $tesseractDir | Out-Null
New-Item -ItemType Directory -Force -Path "$tesseractDir\tessdata" | Out-Null

# Tesseract Windows installer URL (UB-Mannheim version)
$tesseractVersion = "5.5.0"
$tesseractUrl = "https://digi.bib.uni-mannheim.de/tesseract/tesseract-ocr-w64-setup-$tesseractVersion.exe"

Write-Host "📥 Downloading Tesseract installer..." -ForegroundColor Yellow
$installerPath = "$env:TEMP\tesseract-installer.exe"

try {
    Invoke-WebRequest -Uri $tesseractUrl -OutFile $installerPath -UseBasicParsing
    Write-Host "✅ Downloaded installer" -ForegroundColor Green
}
catch {
    Write-Host "❌ Failed to download Tesseract installer" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual Installation:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://github.com/UB-Mannheim/tesseract/wiki" -ForegroundColor Yellow
    Write-Host "2. Install to: $tesseractDir" -ForegroundColor Yellow
    Write-Host "3. Copy tesseract.exe and tessdata\eng.traineddata to: $tesseractDir" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "⚠️  Tesseract installer downloaded. Manual extraction required:" -ForegroundColor Yellow
Write-Host "1. Run the installer: $installerPath" -ForegroundColor Yellow
Write-Host "2. Install to: $tesseractDir" -ForegroundColor Yellow
Write-Host "3. Copy only these files:" -ForegroundColor Yellow
Write-Host "   - tesseract.exe -> $tesseractDir\tesseract.exe" -ForegroundColor Yellow
Write-Host "   - tessdata\eng.traineddata -> $tesseractDir\tessdata\eng.traineddata" -ForegroundColor Yellow
Write-Host ""
Write-Host "Alternative: Use pre-built binaries from:" -ForegroundColor Cyan
Write-Host "https://github.com/UB-Mannheim/tesseract/wiki" -ForegroundColor Cyan
Write-Host ""
Write-Host "After extraction, the structure should be:" -ForegroundColor Green
Write-Host "$tesseractDir\" -ForegroundColor Green
Write-Host "  ├── tesseract.exe" -ForegroundColor Green
Write-Host "  └── tessdata\" -ForegroundColor Green
Write-Host "      └── eng.traineddata" -ForegroundColor Green

