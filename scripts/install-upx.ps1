# Install UPX (Ultimate Packer for eXecutables)
# This compression tool reduces the size of compiled binaries by 30-50%

$ErrorActionPreference = "Stop"

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Installing UPX Compression Tool" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Check if already installed
Write-Host "[*] Checking if UPX is already installed..." -ForegroundColor Yellow
try {
    $upxVersion = & upx --version 2>&1 | Select-Object -First 1
    Write-Host "[+] UPX is already installed: $upxVersion" -ForegroundColor Green
    Write-Host "[*] No action needed!" -ForegroundColor Cyan
    exit 0
} catch {
    Write-Host "[*] UPX not found. Proceeding with installation..." -ForegroundColor Yellow
}

Write-Host ""

# Try Chocolatey first (easiest)
Write-Host "[*] Attempting installation via Chocolatey..." -ForegroundColor Yellow
try {
    $chocoInstalled = Get-Command choco -ErrorAction SilentlyContinue
    if ($chocoInstalled) {
        Write-Host "[*] Chocolatey found. Installing UPX..." -ForegroundColor Cyan
        choco install upx -y

        # Verify installation
        $upxVersion = & upx --version 2>&1 | Select-Object -First 1
        Write-Host "[+] UPX installed successfully: $upxVersion" -ForegroundColor Green
        Write-Host ""
        Write-Host "[*] You can now rebuild with compression enabled!" -ForegroundColor Cyan
        exit 0
    } else {
        Write-Host "[!] Chocolatey not found. Trying manual installation..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "[!] Chocolatey installation failed. Trying manual installation..." -ForegroundColor Yellow
}

Write-Host ""

# Manual installation
Write-Host "[*] Manual Installation" -ForegroundColor Cyan
Write-Host ""
Write-Host "UPX can be installed in several ways:" -ForegroundColor White
Write-Host ""
Write-Host "Option 1: Install Chocolatey (recommended)" -ForegroundColor Green
Write-Host "   1. Open PowerShell as Administrator" -ForegroundColor Gray
Write-Host "   2. Run:" -ForegroundColor Gray
Write-Host "      Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))" -ForegroundColor Cyan
Write-Host "   3. Then run: choco install upx -y" -ForegroundColor Cyan
Write-Host ""
Write-Host "Option 2: Download UPX Manually" -ForegroundColor Green
Write-Host "   1. Visit: https://github.com/upx/upx/releases/latest" -ForegroundColor Gray
Write-Host "   2. Download: upx-*-win64.zip" -ForegroundColor Gray
Write-Host "   3. Extract to: C:\Program Files\upx" -ForegroundColor Gray
Write-Host "   4. Add to PATH:" -ForegroundColor Gray
Write-Host "      - Open System Properties > Environment Variables" -ForegroundColor Cyan
Write-Host "      - Edit 'Path' variable" -ForegroundColor Cyan
Write-Host "      - Add: C:\Program Files\upx" -ForegroundColor Cyan
Write-Host ""
Write-Host "Option 3: Use Scoop" -ForegroundColor Green
Write-Host "   scoop install upx" -ForegroundColor Cyan
Write-Host ""
Write-Host "Option 4: Skip UPX (not recommended)" -ForegroundColor Yellow
Write-Host "   You can disable UPX in python-backend.spec:" -ForegroundColor Gray
Write-Host "   upx=False,  # Line 65" -ForegroundColor Cyan
Write-Host "   This will result in a larger executable (~10-20% bigger)" -ForegroundColor Yellow
Write-Host ""
Write-Host "After installing, verify with: upx --version" -ForegroundColor White
Write-Host ""
