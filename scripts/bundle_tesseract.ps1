# Script to download and bundle Tesseract OCR for desktop app
# This script downloads Tesseract binaries and language data for Windows

$ErrorActionPreference = "Stop"

Write-Host "[*] Downloading Tesseract OCR for Desktop Bundle..." -ForegroundColor Cyan

$binariesDir = "src-tauri\binaries"
$tesseractDir = "$binariesDir\tesseract"

# Create directories
New-Item -ItemType Directory -Force -Path $tesseractDir | Out-Null
New-Item -ItemType Directory -Force -Path "$tesseractDir\tessdata" | Out-Null

# Check if files already exist
$tesseractExe = "$tesseractDir\tesseract.exe"
$tessdataFile = "$tesseractDir\tessdata\eng.traineddata"

if ((Test-Path $tesseractExe) -and (Test-Path $tessdataFile)) {
    Write-Host "[+] Tesseract OCR files already exist" -ForegroundColor Green
    Write-Host "    tesseract.exe: $tesseractExe" -ForegroundColor Gray
    Write-Host "    eng.traineddata: $tessdataFile" -ForegroundColor Gray
    Write-Host "[*] Skipping download. Files are ready to use." -ForegroundColor Cyan
    exit 0
}

# Try multiple download sources for Tesseract Windows binaries
Write-Host "[*] Searching for Tesseract OCR download..." -ForegroundColor Yellow

# Try GitHub releases first (most reliable)
$githubReleases = "https://api.github.com/repos/UB-Mannheim/tesseract/releases/latest"
$downloadUrl = $null
$installerPath = "$env:TEMP\tesseract-installer.exe"

try {
    Write-Host "[*] Checking GitHub releases..." -ForegroundColor Cyan
    $releaseInfo = Invoke-RestMethod -Uri $githubReleases -UseBasicParsing
    $asset = $releaseInfo.assets | Where-Object { $_.name -like "*w64-setup*.exe" -or $_.name -like "*windows*.exe" } | Select-Object -First 1

    if ($asset) {
        $downloadUrl = $asset.browser_download_url
        Write-Host "[+] Found release: $($asset.name)" -ForegroundColor Green
    }
}
catch {
    Write-Host "[!] GitHub API check failed, trying alternative URLs..." -ForegroundColor Yellow
}

# Fallback URLs (try different versions and sources)
if (-not $downloadUrl) {
    $fallbackUrls = @(
        "https://github.com/UB-Mannheim/tesseract/releases/download/v5.5.0.20241201/tesseract-ocr-w64-setup-5.5.0.20241201.exe",
        "https://github.com/UB-Mannheim/tesseract/releases/download/v5.4.0.20241106/tesseract-ocr-w64-setup-5.4.0.20241106.exe",
        "https://digi.bib.uni-mannheim.de/tesseract/tesseract-ocr-w64-setup-5.5.0.exe",
        "https://digi.bib.uni-mannheim.de/tesseract/tesseract-ocr-w64-setup-5.4.0.exe"
    )

    foreach ($url in $fallbackUrls) {
        try {
            Write-Host "[*] Trying: $url" -ForegroundColor Cyan
            $response = Invoke-WebRequest -Uri $url -Method Head -UseBasicParsing -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                $downloadUrl = $url
                Write-Host "[+] Found working URL" -ForegroundColor Green
                break
            }
        }
        catch {
            continue
        }
    }
}

if ($downloadUrl) {
    try {
        Write-Host "[*] Downloading from: $downloadUrl" -ForegroundColor Yellow
        Write-Host "    This may take a few minutes..." -ForegroundColor Gray
        Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath -UseBasicParsing
        Write-Host "[+] Downloaded installer" -ForegroundColor Green
        
        # Default installation path
        $defaultInstallPath = "C:\Program Files\Tesseract-OCR"
        $systemTesseractExe = "$defaultInstallPath\tesseract.exe"
        $systemTessdataFile = "$defaultInstallPath\tessdata\eng.traineddata"
        
        # Check if Tesseract is already installed on the system
        if ((Test-Path $systemTesseractExe) -and (Test-Path $systemTessdataFile)) {
            Write-Host "[+] Tesseract is already installed on the system" -ForegroundColor Green
            Write-Host "[*] Copying files from system installation..." -ForegroundColor Cyan
        }
        else {
            # Run silent installation
            Write-Host "[*] Installing Tesseract OCR silently..." -ForegroundColor Yellow
            Write-Host "    This may take a few minutes..." -ForegroundColor Gray
            
            try {
                $installArgs = "/S", "/D=$defaultInstallPath"
                $process = Start-Process -FilePath $installerPath -ArgumentList $installArgs -Wait -PassThru -NoNewWindow
                
                if ($process.ExitCode -eq 0) {
                    Write-Host "[+] Installation completed successfully" -ForegroundColor Green
                }
                else {
                    Write-Host "[!] Installer exited with code: $($process.ExitCode)" -ForegroundColor Yellow
                    Write-Host "[*] Continuing to check if installation was successful..." -ForegroundColor Cyan
                }
            }
            catch {
                Write-Host "[!] Silent installation failed: $_" -ForegroundColor Yellow
                Write-Host "[*] Checking if Tesseract was already installed..." -ForegroundColor Cyan
            }
            
            # Wait a moment for installation to complete
            Start-Sleep -Seconds 2
        }
        
        # Verify installation and copy files
        if ((Test-Path $systemTesseractExe) -and (Test-Path $systemTessdataFile)) {
            Write-Host "[*] Copying tesseract.exe..." -ForegroundColor Cyan
            Copy-Item -Path $systemTesseractExe -Destination $tesseractExe -Force -ErrorAction Stop
            Write-Host "[+] Copied tesseract.exe" -ForegroundColor Green
            
            Write-Host "[*] Copying eng.traineddata..." -ForegroundColor Cyan
            Copy-Item -Path $systemTessdataFile -Destination $tessdataFile -Force -ErrorAction Stop
            Write-Host "[+] Copied eng.traineddata" -ForegroundColor Green
            
            Write-Host ""
            Write-Host "[+] Tesseract OCR bundled successfully!" -ForegroundColor Green
            Write-Host "    tesseract.exe: $tesseractExe" -ForegroundColor Gray
            Write-Host "    eng.traineddata: $tessdataFile" -ForegroundColor Gray
        }
        else {
            Write-Host ""
            Write-Host "[!] Installation completed, but files not found at expected location" -ForegroundColor Yellow
            Write-Host "[*] Manual installation may be required:" -ForegroundColor Yellow
            Write-Host "1. Run the installer: $installerPath" -ForegroundColor Yellow
            Write-Host "2. During installation, note the install path (usually C:\Program Files\Tesseract-OCR)" -ForegroundColor Yellow
            Write-Host "3. After installation, copy these files:" -ForegroundColor Yellow
            Write-Host "   - tesseract.exe -> $tesseractDir\tesseract.exe" -ForegroundColor Cyan
            Write-Host "   - tessdata\eng.traineddata -> $tesseractDir\tessdata\eng.traineddata" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "[*] Quick copy commands (run after installation):" -ForegroundColor Green
            Write-Host "   Copy-Item '<InstallPath>\tesseract.exe' '$tesseractDir\tesseract.exe' -Force" -ForegroundColor White
            Write-Host "   Copy-Item '<InstallPath>\tessdata\eng.traineddata' '$tesseractDir\tessdata\eng.traineddata' -Force" -ForegroundColor White
            exit 1
        }
    }
    catch {
        Write-Host "[-] Failed to download or install: $_" -ForegroundColor Red
        $downloadUrl = $null
    }
}

if (-not $downloadUrl) {
    Write-Host ""
    Write-Host "[-] Could not find a working download URL automatically" -ForegroundColor Red
    Write-Host ""
    Write-Host "[*] Manual Installation Steps:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1: Download from GitHub (Recommended)" -ForegroundColor Cyan
    Write-Host "1. Visit: https://github.com/UB-Mannheim/tesseract/releases" -ForegroundColor White
    Write-Host "2. Download the latest 'tesseract-ocr-w64-setup-*.exe' file" -ForegroundColor White
    Write-Host "3. Run the installer" -ForegroundColor White
    Write-Host "4. Copy files as shown below" -ForegroundColor White
    Write-Host ""
    Write-Host "Option 2: Use Chocolatey" -ForegroundColor Cyan
    Write-Host "   choco install tesseract" -ForegroundColor White
    Write-Host ""
    Write-Host "Option 3: Direct Download" -ForegroundColor Cyan
    Write-Host "   Visit: https://github.com/UB-Mannheim/tesseract/wiki" -ForegroundColor White
    Write-Host ""
    Write-Host "After installation, copy files:" -ForegroundColor Yellow
    Write-Host "   Copy: <InstallPath>\tesseract.exe" -ForegroundColor Cyan
    Write-Host "   To:   $tesseractDir\tesseract.exe" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   Copy: <InstallPath>\tessdata\eng.traineddata" -ForegroundColor Cyan
    Write-Host "   To:   $tesseractDir\tessdata\eng.traineddata" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Expected structure:" -ForegroundColor Green
    Write-Host "$tesseractDir\" -ForegroundColor Green
    Write-Host "  +-- tesseract.exe" -ForegroundColor Green
    Write-Host "  +-- tessdata\" -ForegroundColor Green
    Write-Host "      +-- eng.traineddata" -ForegroundColor Green
    Write-Host ""
    Write-Host "[i] Tip: Default install path is usually: C:\Program Files\Tesseract-OCR" -ForegroundColor Gray
    exit 1
}
