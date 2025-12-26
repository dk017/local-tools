# Wrapper script to start backend, handling port already in use
# If port is in use, check if server is accessible - if so, exit successfully
# If not accessible, exit with error

$port = 8000
$url = "http://localhost:$port/"

# Check if port is in use
$portInUse = $false
try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $port)
    $listener.Start()
    $listener.Stop()
} catch {
    $portInUse = $true
}

if ($portInUse) {
    # Port is in use - check if server is accessible
    try {
        $response = Invoke-WebRequest -Uri $url -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "Backend already running on port $port - reusing it" -ForegroundColor Green
            # Exit successfully - Playwright will detect and reuse
            exit 0
        }
    } catch {
        Write-Host "Port $port is in use but server not accessible - stopping existing process" -ForegroundColor Yellow
        # Try to find and kill the process
        $process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -First 1
        if ($process) {
            Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
        }
    }
}

# Start the server
Set-Location "../python-backend"
python -m uvicorn api:app --host 0.0.0.0 --port $port

