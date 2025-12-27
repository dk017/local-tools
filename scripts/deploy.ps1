# PowerShell Deployment Script for Hetzner
# Usage: .\scripts\deploy.ps1 -ServerIP "YOUR_SERVER_IP" -SSHKey "path/to/key"

param(
    [Parameter(Mandatory=$true)]
    [string]$ServerIP,
    
    [Parameter(Mandatory=$false)]
    [string]$SSHKey = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$BackendOnly = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$FrontendOnly = $false
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting deployment to Hetzner..." -ForegroundColor Cyan

# Check if SSH key is provided
$sshArgs = @()
if ($SSHKey -and (Test-Path $SSHKey)) {
    $sshArgs += "-i", $SSHKey
    Write-Host "✅ Using SSH key: $SSHKey" -ForegroundColor Green
} elseif ($SSHKey) {
    Write-Host "⚠️ SSH key not found: $SSHKey" -ForegroundColor Yellow
    Write-Host "   Continuing with default SSH authentication..." -ForegroundColor Yellow
}

# Build deployment command
$deployScript = @"
set -e
echo '🚀 Starting deployment...'

# Navigate to project directory
cd ~/local-tools || { echo '❌ Project directory not found!'; exit 1; }

# Pull latest changes
echo '📥 Pulling latest changes...'
git pull origin main || { echo '❌ Git pull failed!'; exit 1; }

# Stop containers
echo '🛑 Stopping containers...'
docker compose -f docker-compose.prod.yml down || true

# Determine what to rebuild
if [ "$SkipBuild" = "true" ]; then
    echo '⏭️ Skipping build (using existing images)...'
else
    echo '🔨 Rebuilding containers...'
    if [ "$BackendOnly" = "true" ]; then
        docker compose -f docker-compose.prod.yml build --no-cache backend || { echo '❌ Backend build failed!'; exit 1; }
    elif [ "$FrontendOnly" = "true" ]; then
        docker compose -f docker-compose.prod.yml build --no-cache frontend || { echo '❌ Frontend build failed!'; exit 1; }
    else
        docker compose -f docker-compose.prod.yml build --no-cache backend frontend || { echo '❌ Build failed!'; exit 1; }
    fi
fi

# Start containers
echo '▶️ Starting containers...'
docker compose -f docker-compose.prod.yml up -d || { echo '❌ Start failed!'; exit 1; }

# Wait for services to be ready
echo '⏳ Waiting for services to start...'
sleep 10

# Health check
echo '🏥 Running health checks...'
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo '✅ Backend health check passed'
else
    echo '⚠️ Backend health check failed (may still be starting)'
fi

if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo '✅ Frontend health check passed'
else
    echo '⚠️ Frontend health check failed (may still be starting)'
fi

# Show container status
echo '📊 Container status:'
docker compose -f docker-compose.prod.yml ps

echo '✅ Deployment completed!'
"@

# Execute deployment
try {
    Write-Host "📡 Connecting to server: $ServerIP" -ForegroundColor Cyan
    
    if ($sshArgs.Count -gt 0) {
        $deployScript | ssh @sshArgs root@$ServerIP bash
    } else {
        $deployScript | ssh root@$ServerIP bash
    }
    
    Write-Host "`n✅ Deployment completed successfully!" -ForegroundColor Green
    Write-Host "`n📊 Next steps:" -ForegroundColor Cyan
    Write-Host "   - Check logs: ssh root@$ServerIP 'cd ~/local-tools && docker compose -f docker-compose.prod.yml logs -f'" -ForegroundColor Gray
    Write-Host "   - Test site: https://localtools.pro" -ForegroundColor Gray
    
} catch {
    Write-Host "`n❌ Deployment failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

