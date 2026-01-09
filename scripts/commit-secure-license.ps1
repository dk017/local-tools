# Commit Secure License Validation Files
# This script helps you commit only the necessary files

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Commit Secure License Validation Files" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Change to repo root
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host "[*] Checking git status..." -ForegroundColor Yellow
$gitStatus = git status --porcelain

if (-not $gitStatus) {
    Write-Host "[!] No changes to commit" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "=== Files to Commit ===" -ForegroundColor Green
Write-Host ""

# Clean up cache files first
Write-Host "[*] Cleaning up Python cache files..." -ForegroundColor Yellow
git restore python-backend/__pycache__/*.pyc 2>$null

# Restore workflow file (we'll update it later)
Write-Host "[*] Restoring workflow file (we'll update separately)..." -ForegroundColor Yellow
git restore .github/workflows/build-desktop.yml 2>$null

Write-Host ""
Write-Host "Adding files:" -ForegroundColor Cyan

# Add validation API
if (Test-Path "website/app/api/desktop") {
    Write-Host "  [+] Validation API endpoints" -ForegroundColor Green
    git add website/app/api/desktop/
}

# Add secure desktop code
if (Test-Path "python-backend/modules/licensing_secure.py") {
    Write-Host "  [+] Secure Python license module" -ForegroundColor Green
    git add python-backend/modules/licensing_secure.py
}

if (Test-Path "src-tauri/src/python_bridge_secure.rs") {
    Write-Host "  [+] Secure Rust bridge" -ForegroundColor Green
    git add src-tauri/src/python_bridge_secure.rs
}

# Add configuration
if (Test-Path ".env.example.secure") {
    Write-Host "  [+] Environment configuration template" -ForegroundColor Green
    git add .env.example.secure
}

# Add documentation
$docs = @(
    "SECURE_LICENSE_ARCHITECTURE.md",
    "SECURE_LICENSE_IMPLEMENTATION_COMPLETE.md",
    "SECURE_LICENSE_QUICK_START.md",
    "MIGRATION_TO_SECURE_LICENSE.md",
    "DEPLOYMENT_PIPELINE_EXPLAINED.md",
    "SECURITY_AUDIT_SUMMARY.md",
    "COMMIT_GUIDE.md"
)

foreach ($doc in $docs) {
    if (Test-Path $doc) {
        Write-Host "  [+] $doc" -ForegroundColor Green
        git add $doc
    }
}

Write-Host ""
Write-Host "=== Commit Summary ===" -ForegroundColor Cyan
Write-Host ""

# Show what will be committed
git status --short

Write-Host ""
Write-Host "=== Commit Message ===" -ForegroundColor Cyan
Write-Host ""

$commitMessage = @"
feat: Add secure license validation system

Core Changes:
- Add backend validation API (/api/desktop/* endpoints)
- Add secure desktop license module (licensing_secure.py)
- Add secure Rust bridge (python_bridge_secure.rs)
- Add rate limiting, input validation, error handling

Security Improvements:
- Fixes CRITICAL vulnerability: API key exposure in desktop binary
- API key now stays on server only
- Desktop apps call validation service instead of LemonSqueezy directly
- Implements server-side rate limiting and monitoring

Documentation:
- Complete architecture documentation
- Step-by-step migration guide
- Security audit summary
- Deployment pipeline explanation

This is Phase 1: Files are committed but not yet deployed.
See MIGRATION_TO_SECURE_LICENSE.md for deployment steps.
"@

Write-Host $commitMessage -ForegroundColor White
Write-Host ""

# Ask for confirmation
Write-Host "=== Confirmation ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "This will:" -ForegroundColor White
Write-Host "  1. Commit the files listed above" -ForegroundColor Gray
Write-Host "  2. Deploy validation API to Hetzner (automatic)" -ForegroundColor Gray
Write-Host "  3. NOT change current desktop builds (safe)" -ForegroundColor Gray
Write-Host ""
Write-Host "After commit:" -ForegroundColor White
Write-Host "  - Test validation API at localtools.pro/api/desktop/*" -ForegroundColor Gray
Write-Host "  - Add LEMONSQUEEZY_API_KEY to Hetzner server" -ForegroundColor Gray
Write-Host "  - Follow MIGRATION_TO_SECURE_LICENSE.md" -ForegroundColor Gray
Write-Host ""

$confirm = Read-Host "Commit these files? (y/n)"

if ($confirm -ne "y") {
    Write-Host ""
    Write-Host "[!] Commit cancelled" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "[*] Creating commit..." -ForegroundColor Cyan

git commit -m $commitMessage

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[+] Commit created successfully!" -ForegroundColor Green
    Write-Host ""

    # Ask about pushing
    $push = Read-Host "Push to GitHub? (y/n)"

    if ($push -eq "y") {
        Write-Host ""
        Write-Host "[*] Pushing to origin main..." -ForegroundColor Cyan
        git push origin main

        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "[+] Pushed successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "=== What Happens Next ===" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "Automatic (5 minutes):" -ForegroundColor White
            Write-Host "  - Website deploys to Hetzner" -ForegroundColor Gray
            Write-Host "  - Validation API becomes available" -ForegroundColor Gray
            Write-Host "  - Desktop builds start (20 minutes)" -ForegroundColor Gray
            Write-Host ""
            Write-Host "Manual Steps:" -ForegroundColor White
            Write-Host "  1. Wait for deployment to complete" -ForegroundColor Gray
            Write-Host "  2. Add LEMONSQUEEZY_API_KEY to Hetzner server" -ForegroundColor Gray
            Write-Host "  3. Test: curl https://localtools.pro/api/desktop/validate-license" -ForegroundColor Gray
            Write-Host "  4. Follow MIGRATION_TO_SECURE_LICENSE.md" -ForegroundColor Gray
            Write-Host ""
            Write-Host "Monitor deployment:" -ForegroundColor White
            Write-Host "  - GitHub Actions: https://github.com/your-repo/actions" -ForegroundColor Gray
            Write-Host "  - Check website in 5 minutes" -ForegroundColor Gray
            Write-Host ""
        } else {
            Write-Host ""
            Write-Host "[-] Push failed!" -ForegroundColor Red
            Write-Host "    Try: git push origin main" -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Host ""
        Write-Host "[*] Commit created locally (not pushed)" -ForegroundColor Yellow
        Write-Host "    To push later: git push origin main" -ForegroundColor Gray
        Write-Host ""
    }
} else {
    Write-Host ""
    Write-Host "[-] Commit failed!" -ForegroundColor Red
    exit 1
}
