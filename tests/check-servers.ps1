# Check if servers are running
$backendRunning = $false
$frontendRunning = $false

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        $backendRunning = $true
        Write-Host "✓ Backend is running on port 8000" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Backend is not running on port 8000" -ForegroundColor Yellow
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        $frontendRunning = $true
        Write-Host "✓ Frontend is running on port 3000" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Frontend is not running on port 3000" -ForegroundColor Yellow
}

if ($backendRunning -and $frontendRunning) {
    Write-Host "`nBoth servers are running. Playwright will reuse them." -ForegroundColor Cyan
    exit 0
} else {
    Write-Host "`nSome servers are not running. Playwright will start them." -ForegroundColor Yellow
    exit 1
}

