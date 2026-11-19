#!/usr/bin/env bash
# ==============================================================================
# Gondar Hospital Management System (GHMS) - Production Deployment Pipeline
# ==============================================================================
set -euo pipefail

echo "======================================================================"
echo "STARTING GHMS AUTOMATED PRODUCTION DEPLOYMENT"
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================================================"

# 1. Pre-flight Checks
echo "--> Step 1/6: Pre-flight Verification..."
command -v node >/dev/null 2>&1 || { echo "ERROR: Node.js is required"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "ERROR: npm is required"; exit 1; }

NODE_MAJOR=$(node -v | cut -d'.' -f1 | tr -d 'v')
if (( NODE_MAJOR < 20 )); then
    echo "ERROR: Node.js version 20+ is required. Found: $(node -v)"
    exit 1
fi

# 2. Dependency Audit & Install
echo "--> Step 2/6: Installing dependencies..."
npm ci --prefer-offline
npm --prefix backend ci --prefer-offline

# 3. Code Verification & Typechecks
echo "--> Step 3/6: Executing static checks and unit tests..."
npm run typecheck
npm --prefix backend run typecheck
npm --prefix backend test

# 4. Safe Database Migration (Never use db push in production)
echo "--> Step 4/6: Applying database migrations safely..."
if [[ -f "./scripts/backup.sh" ]]; then
    echo "Creating pre-deployment safety database backup..."
    bash ./scripts/backup.sh || echo "WARN: Pre-deployment backup script skipped or failed"
fi

npx --prefix backend prisma migrate deploy

# 5. Production Build
echo "--> Step 5/6: Building optimized production artifacts..."
npm --prefix backend run build
npm run build

# 6. Service Reload (Zero-downtime rolling restart via PM2 or Docker)
echo "--> Step 6/6: Reloading application services..."
if command -v pm2 >/dev/null 2>&1; then
    pm2 reload ecosystem.config.cjs --update-env || pm2 start ecosystem.config.cjs
elif command -v docker >/dev/null 2>&1 && [[ -f "docker-compose.prod.yml" ]]; then
    docker compose -f docker-compose.prod.yml up -d --build
else
    echo "INFO: Build completed. Restart systemd services or manual workers."
fi

# 7. Post-Deployment Smoke Test
echo "--> Executing Post-Deployment Smoke Test..."
sleep 3
HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4000/api/v1/health || echo "FAILED")

if [[ "${HEALTH_CODE}" == "200" ]]; then
    echo "======================================================================"
    echo "SUCCESS: GHMS Production Deployment Completed! Health check OK (200)."
    echo "======================================================================"
else
    echo "ERROR: Health check returned code: ${HEALTH_CODE}. Check server logs."
    exit 1
fi
