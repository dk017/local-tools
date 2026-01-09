# Build Tauri App with Environment Variables
# This script loads .env file and builds the desktop app with license validation enabled

param(
    [switch]$SkipBundle = $false
)

Write-Host "[*] Building Tauri Desktop App with License Configuration..." -ForegroundColor Cyan

# Check if .env file exists
$envFile = Join-Path -Path $PSScriptRoot -ChildPath ".." | Join-Path -ChildPath ".env"
if (Test-Path $envFile) {
    Write-Host "[+] Loading environment variables from .env file..." -ForegroundColor Green

    # Read .env file and set environment variables
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()

            # Remove quotes if present
            $value = $value -replace '^["\x27]|["\x27]$', ''

            [System.Environment]::SetEnvironmentVariable($key, $value, [System.EnvironmentVariableTarget]::Process)
            Write-Host "  -> Set $key" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "[!] Warning: .env file not found at $envFile" -ForegroundColor Yellow
    Write-Host "    License validation will not work in the built app." -ForegroundColor Yellow
    Write-Host "    Create a .env file based on .env.example to enable licensing." -ForegroundColor Yellow
}

# Verify LEMONSQUEEZY_API_KEY is set
$apiKey = [System.Environment]::GetEnvironmentVariable("LEMONSQUEEZY_API_KEY", [System.EnvironmentVariableTarget]::Process)
if ($apiKey) {
    $maskedKey = $apiKey.Substring(0, [Math]::Min(8, $apiKey.Length)) + "..."
    Write-Host "[+] LEMONSQUEEZY_API_KEY is configured ($maskedKey)" -ForegroundColor Green
} else {
    Write-Host "[!] Warning: LEMONSQUEEZY_API_KEY is not set!" -ForegroundColor Yellow
    Write-Host "    License activation will not work in the built app." -ForegroundColor Yellow
}

Write-Host ""

# Bundle Tesseract unless skipped
if (-not $SkipBundle) {
    Write-Host "[*] Bundling Tesseract OCR..." -ForegroundColor Cyan
    npm run bundle:tesseract:win
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[-] Failed to bundle Tesseract" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
}

# Build Tauri app
Write-Host "[*] Building Tauri application..." -ForegroundColor Cyan
npm run tauri build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[-] Build failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[+] Build completed successfully!" -ForegroundColor Green
Write-Host "    Installer location: src-tauri/target/release/bundle/" -ForegroundColor Gray
