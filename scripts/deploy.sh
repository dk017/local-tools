#!/bin/bash
# Server-side deployment script
# This script runs on the Hetzner server
# Usage: ./scripts/deploy.sh [--skip-build] [--backend-only] [--frontend-only]

set -e

# Parse arguments
SKIP_BUILD=false
BACKEND_ONLY=false
FRONTEND_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --backend-only)
            BACKEND_ONLY=true
            shift
            ;;
        --frontend-only)
            FRONTEND_ONLY=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "🚀 Starting deployment..."

# Navigate to project directory
cd ~/local-tools || { echo "❌ Project directory not found!"; exit 1; }

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main || { echo "❌ Git pull failed!"; exit 1; }

# Stop containers
echo "🛑 Stopping containers..."
docker compose -f docker-compose.prod.yml down || true

# Determine what to rebuild
if [ "$SKIP_BUILD" = true ]; then
    echo "⏭️ Skipping build (using existing images)..."
else
    echo "🔨 Rebuilding containers..."
    if [ "$BACKEND_ONLY" = true ]; then
        docker compose -f docker-compose.prod.yml build --no-cache backend || { echo "❌ Backend build failed!"; exit 1; }
    elif [ "$FRONTEND_ONLY" = true ]; then
        docker compose -f docker-compose.prod.yml build --no-cache frontend || { echo "❌ Frontend build failed!"; exit 1; }
    else
        docker compose -f docker-compose.prod.yml build --no-cache backend frontend || { echo "❌ Build failed!"; exit 1; }
    fi
fi

# Start containers
echo "▶️ Starting containers..."
docker compose -f docker-compose.prod.yml up -d || { echo "❌ Start failed!"; exit 1; }

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Health check
echo "🏥 Running health checks..."
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend health check passed"
else
    echo "⚠️ Backend health check failed (may still be starting)"
fi

if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend health check passed"
else
    echo "⚠️ Frontend health check failed (may still be starting)"
fi

# Show container status
echo "📊 Container status:"
docker compose -f docker-compose.prod.yml ps

echo "✅ Deployment completed!"

