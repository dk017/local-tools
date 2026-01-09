# Verification script for size optimization
# Run this after rebuilding to check the improvements

$ErrorActionPreference = "Stop"

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Size Optimization Verification" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Check if UPX is installed
Write-Host "[1/4] Checking UPX installation..." -ForegroundColor Yellow
try {
    $upxVersion = & upx --version 2>&1 | Select-Object -First 1
    Write-Host "  ✅ UPX is installed: $upxVersion" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  UPX not found in PATH" -ForegroundColor Yellow
    Write-Host "     Install with: choco install upx" -ForegroundColor Gray
    Write-Host "     Or download from: https://github.com/upx/upx/releases" -ForegroundColor Gray
}

Write-Host ""

# Check Python backend spec
Write-Host "[2/4] Checking PyInstaller spec..." -ForegroundColor Yellow
$specFile = "python-backend\python-backend.spec"
if (Test-Path $specFile) {
    $specContent = Get-Content $specFile -Raw

    # Check optimize level
    if ($specContent -match "optimize=2") {
        Write-Host "  ✅ Python optimization enabled (level 2)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Python optimization not set to 2" -ForegroundColor Yellow
    }

    # Check strip
    if ($specContent -match "strip=True") {
        Write-Host "  ✅ Debug symbol stripping enabled" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Debug symbols not stripped (strip=False)" -ForegroundColor Yellow
    }

    # Check UPX
    if ($specContent -match "upx=True") {
        Write-Host "  ✅ UPX compression enabled in spec" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  UPX compression disabled in spec" -ForegroundColor Yellow
    }

    # Count excludes
    $excludesMatch = $specContent -match "excludes=\[(.*?)\]" -replace '\s+', ' '
    $excludeCount = ([regex]::Matches($specContent, "'[^']+',?\s*#?") | Where-Object { $_.Value -match "excludes" -or $_.Index -gt ($specContent.IndexOf("excludes=")) -and $_.Index -lt ($specContent.IndexOf("]", ($specContent.IndexOf("excludes=")))) }).Count

    if ($excludeCount -gt 20) {
        Write-Host "  ✅ Enhanced excludes list ($excludeCount+ modules)" -ForegroundColor Green
    } else {
        Write-Host "  ℹ️  Basic excludes list ($excludeCount modules)" -ForegroundColor Cyan
    }
} else {
    Write-Host "  ❌ python-backend.spec not found!" -ForegroundColor Red
}

Write-Host ""

# Check if Python backend has been built
Write-Host "[3/4] Checking built Python backend..." -ForegroundColor Yellow
$pythonBackendPath = "src-tauri\binaries\python-backend.exe"
if (Test-Path $pythonBackendPath) {
    $backendSize = (Get-Item $pythonBackendPath).Length
    $backendSizeMB = [math]::Round($backendSize / 1MB, 2)

    Write-Host "  ✅ Python backend found" -ForegroundColor Green
    Write-Host "     Path: $pythonBackendPath" -ForegroundColor Gray
    Write-Host "     Size: $backendSizeMB MB" -ForegroundColor Cyan

    if ($backendSizeMB -lt 150) {
        Write-Host "     Status: Excellent size! 🎉" -ForegroundColor Green
    } elseif ($backendSizeMB -lt 200) {
        Write-Host "     Status: Good size ✓" -ForegroundColor Green
    } elseif ($backendSizeMB -lt 300) {
        Write-Host "     Status: Could be better (consider full optimization)" -ForegroundColor Yellow
    } else {
        Write-Host "     Status: Large (optimization may not have been applied)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ℹ️  Python backend not built yet" -ForegroundColor Cyan
    Write-Host "     Run: cd python-backend && pyinstaller python-backend.spec --clean" -ForegroundColor Gray
}

Write-Host ""

# Check if final installer exists
Write-Host "[4/4] Checking final installer..." -ForegroundColor Yellow
$msiPath = Get-ChildItem "src-tauri\target\release\bundle\msi\*.msi" -ErrorAction SilentlyContinue | Select-Object -First 1
$nsisPath = Get-ChildItem "src-tauri\target\release\bundle\nsis\*-setup.exe" -ErrorAction SilentlyContinue | Select-Object -First 1

if ($msiPath) {
    $installerSize = (Get-Item $msiPath.FullName).Length
    $installerSizeMB = [math]::Round($installerSize / 1MB, 2)

    Write-Host "  ✅ MSI installer found" -ForegroundColor Green
    Write-Host "     Path: $($msiPath.FullName)" -ForegroundColor Gray
    Write-Host "     Size: $installerSizeMB MB" -ForegroundColor Cyan

    if ($installerSizeMB -lt 200) {
        Write-Host "     Status: Excellent! Very compact installer 🎉" -ForegroundColor Green
    } elseif ($installerSizeMB -lt 300) {
        Write-Host "     Status: Good size ✓" -ForegroundColor Green
    } elseif ($installerSizeMB -lt 400) {
        Write-Host "     Status: Moderate (optimizations applied)" -ForegroundColor Yellow
    } else {
        Write-Host "     Status: Large (may need rebuild with optimizations)" -ForegroundColor Yellow
    }
}

if ($nsisPath) {
    $installerSize = (Get-Item $nsisPath.FullName).Length
    $installerSizeMB = [math]::Round($installerSize / 1MB, 2)

    Write-Host "  ✅ NSIS installer found" -ForegroundColor Green
    Write-Host "     Path: $($nsisPath.FullName)" -ForegroundColor Gray
    Write-Host "     Size: $installerSizeMB MB" -ForegroundColor Cyan
}

if (-not $msiPath -and -not $nsisPath) {
    Write-Host "  ℹ️  No installer found yet" -ForegroundColor Cyan
    Write-Host "     Run: npm run tauri:build:production" -ForegroundColor Gray
}

Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. If UPX is missing, install it:" -ForegroundColor White
Write-Host "   choco install upx" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Rebuild the Python backend:" -ForegroundColor White
Write-Host "   cd python-backend" -ForegroundColor Gray
Write-Host "   pyinstaller python-backend.spec --clean" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Build the full installer:" -ForegroundColor White
Write-Host "   npm run tauri:build:production" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Compare sizes before and after!" -ForegroundColor White
Write-Host ""
