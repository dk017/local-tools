# Wrapper script to start frontend, handling port already in use
$port = 3000
$url = "http://localhost:$port"

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
            Write-Host "Frontend already running on port $port - reusing it" -ForegroundColor Green
            exit 0
        }
    } catch {
        Write-Host "Port $port is in use but server not accessible" -ForegroundColor Yellow
        $process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -First 1
        if ($process) {
            Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
        }
    }
}

# Start the server
Set-Location "../website"
npm run dev

