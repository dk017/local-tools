# Cleanup Uncommitted Changes
# Handles Python cache files and reviews other changes

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cleanup Uncommitted Changes" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Change to repo root
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host "[*] Current git status:" -ForegroundColor Yellow
Write-Host ""
git status --short
Write-Host ""

# Python cache files - always restore these
Write-Host "=== Python Cache Files ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "These are auto-generated files that should never be committed." -ForegroundColor Gray
Write-Host "Restoring them to clean state..." -ForegroundColor Yellow
Write-Host ""

$cacheFiles = @(
    "python-backend/modules/__pycache__/image_tools.cpython-312.pyc",
    "python-backend/modules/__pycache__/licensing.cpython-312.pyc",
    "python-backend/modules/__pycache__/pdf_tools.cpython-312.pyc",
    "python-backend/modules/__pycache__/security.cpython-312.pyc"
)

foreach ($file in $cacheFiles) {
    if (Test-Path $file) {
        git restore $file 2>$null
        Write-Host "  [x] Restored: $file" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=== Modified Files to Review ===" -ForegroundColor Cyan
Write-Host ""

# Check build-with-env.ps1
Write-Host "1. scripts/build-with-env.ps1" -ForegroundColor White
Write-Host "   Changes: Bug fixes (Join-Path syntax, removed & operator)" -ForegroundColor Gray
Write-Host ""
Write-Host "   These are improvements from previous work." -ForegroundColor Yellow
Write-Host "   Recommend: COMMIT" -ForegroundColor Green
Write-Host ""

# Check ActivationScreen.tsx
Write-Host "2. src/components/ActivationScreen.tsx" -ForegroundColor White
Write-Host "   Changes: Added onActivate prop for custom activation logic" -ForegroundColor Gray
Write-Host ""
Write-Host "   This improves flexibility for license activation." -ForegroundColor Yellow
Write-Host "   Recommend: COMMIT" -ForegroundColor Green
Write-Host ""

# Check ActivationWrapper.tsx
Write-Host "3. src/components/ActivationWrapper.tsx" -ForegroundColor White
Write-Host "   Changes: Refactored to use useLicense hook" -ForegroundColor Gray
Write-Host ""
Write-Host "   This is better code organization." -ForegroundColor Yellow
Write-Host "   Recommend: COMMIT" -ForegroundColor Green
Write-Host ""

# Check docs/ folder
Write-Host "4. docs/ folder (untracked)" -ForegroundColor White
if (Test-Path "docs/") {
    $docFiles = Get-ChildItem -Path "docs/" -Recurse -File
    Write-Host "   Contains: $($docFiles.Count) files" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   If these are project documentation:" -ForegroundColor Yellow
    Write-Host "   Recommend: COMMIT" -ForegroundColor Green
    Write-Host ""
    Write-Host "   If these are personal notes/temp files:" -ForegroundColor Yellow
    Write-Host "   Recommend: DELETE or add to .gitignore" -ForegroundColor Red
} else {
    Write-Host "   Folder not found" -ForegroundColor Gray
}
Write-Host ""

# Check commit script
Write-Host "5. scripts/commit-secure-license.ps1 (untracked)" -ForegroundColor White
Write-Host "   Helper script for committing secure license files" -ForegroundColor Gray
Write-Host ""
Write-Host "   This is a useful utility script." -ForegroundColor Yellow
Write-Host "   Recommend: COMMIT" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Options" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[1] Commit all recommended changes" -ForegroundColor White
Write-Host "[2] Restore all changes (discard)" -ForegroundColor White
Write-Host "[3] Manual - I'll handle it myself" -ForegroundColor White
Write-Host "[4] Exit (do nothing)" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Choose option (1-4)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "[*] Committing recommended changes..." -ForegroundColor Cyan
        Write-Host ""

        # Add the modified files
        git add scripts/build-with-env.ps1
        git add src/components/ActivationScreen.tsx
        git add src/components/ActivationWrapper.tsx
        git add scripts/commit-secure-license.ps1

        # Ask about docs/
        if (Test-Path "docs/") {
            Write-Host ""
            $addDocs = Read-Host "Add docs/ folder? (y/n)"
            if ($addDocs -eq "y") {
                git add docs/
            }
        }

        Write-Host ""
        Write-Host "Files staged:" -ForegroundColor Yellow
        git status --short
        Write-Host ""

        # Commit
        $commitMsg = @"
fix: Improve build scripts and license components

- Fix build-with-env.ps1 syntax issues (Join-Path, npm commands)
- Add flexible activation logic to ActivationScreen
- Refactor ActivationWrapper to use useLicense hook
- Add commit helper script
"@

        git commit -m $commitMsg

        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "[+] Commit created successfully!" -ForegroundColor Green
            Write-Host ""

            $push = Read-Host "Push to GitHub? (y/n)"
            if ($push -eq "y") {
                git push origin main
                Write-Host ""
                Write-Host "[+] Pushed successfully!" -ForegroundColor Green
            }
        }
    }

    "2" {
        Write-Host ""
        Write-Host "[*] Restoring all changes..." -ForegroundColor Yellow
        Write-Host ""

        git restore scripts/build-with-env.ps1
        git restore src/components/ActivationScreen.tsx
        git restore src/components/ActivationWrapper.tsx

        Write-Host "[+] All changes restored" -ForegroundColor Green
        Write-Host ""
        Write-Host "Note: Untracked files (docs/, scripts/*.ps1) still present." -ForegroundColor Yellow
        Write-Host "      Use 'git clean -fd' to remove them if needed." -ForegroundColor Gray
    }

    "3" {
        Write-Host ""
        Write-Host "[*] Manual mode" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "To commit changes:" -ForegroundColor White
        Write-Host "  git add <file>" -ForegroundColor Gray
        Write-Host "  git commit -m 'message'" -ForegroundColor Gray
        Write-Host "  git push origin main" -ForegroundColor Gray
        Write-Host ""
        Write-Host "To discard changes:" -ForegroundColor White
        Write-Host "  git restore <file>" -ForegroundColor Gray
        Write-Host ""
    }

    "4" {
        Write-Host ""
        Write-Host "[*] Exiting without changes" -ForegroundColor Yellow
        exit 0
    }

    default {
        Write-Host ""
        Write-Host "[!] Invalid option" -ForegroundColor Red
        exit 1
    }
}
