#!/usr/bin/env bash
#
# Build and (re)deploy the Wheat Harvester API + web admin on the EC2 host.
# Run it on the server, from anywhere inside the repo:
#
#   bash deploy/deploy.sh
#
# What it does: pull master → install deps → build shared/api/web → publish the
# web bundle to nginx's web root → (re)start the API under PM2.
#
# Override defaults with env vars, e.g.:
#   WEB_ROOT=/var/www/myharvester-web VITE_API_BASE_URL=/api/v1 bash deploy/deploy.sh
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

WEB_ROOT="${WEB_ROOT:-/var/www/myharvester-web}"
# Same-origin path: the web admin calls /api/v1 and nginx proxies it to the API.
API_BASE="${VITE_API_BASE_URL:-/api/v1}"
BRANCH="${BRANCH:-master}"

echo "==> [1/6] Updating $BRANCH"
git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "==> [2/6] Installing dependencies (npm ci)"
npm ci

echo "==> [3/6] Building shared types"
npm run shared:build

echo "==> [4/6] Building API"
npm run api:build

echo "==> [5/6] Building web admin (VITE_API_BASE_URL=$API_BASE)"
VITE_API_BASE_URL="$API_BASE" npm run build -w @wh/web

echo "==> [6/6] Publishing web to $WEB_ROOT and restarting API"
sudo mkdir -p "$WEB_ROOT"
sudo rsync -a --delete apps/web/dist/ "$WEB_ROOT/"

pm2 startOrReload deploy/ecosystem.config.cjs --update-env
pm2 save

echo ""
echo "Done. API on http://127.0.0.1:3000/api/v1 (behind nginx); web served from $WEB_ROOT."
echo "Tip: 'pm2 logs myharvester-api' to tail the API."
