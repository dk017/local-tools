$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Offline Tools Development Environment..." -ForegroundColor Cyan

# 1. Check if venv exists
# 1. Check if venv exists
if (-not (Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..."
    python -m venv venv
}
.\venv\Scripts\pip install -r python-backend\requirements.txt

# 2. Rebuild Python Backend
Write-Host "🐍 Building Python Backend..." -ForegroundColor Yellow
.\venv\Scripts\pyinstaller --onefile --name python-backend --hidden-import=image_tools --hidden-import=pdf_tools python-backend/main.py --paths python-backend/modules --distpath dist --workpath build --specpath . --log-level WARN

# 3. Move Binary to Sidecar Location
Write-Host "📦 Updating Sidecar Binary..." -ForegroundColor Yellow
$target = "src-tauri/binaries/python-backend-x86_64-pc-windows-msvc.exe"
Move-Item -Force dist/python-backend.exe $target

# 4. Start Tauri Dev
Write-Host "🎨 Starting Tauri Frontend..." -ForegroundColor Green
npm run tauri dev
