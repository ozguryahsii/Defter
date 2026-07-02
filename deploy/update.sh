#!/usr/bin/env bash
# SOBSO! sunucu güncelleme scripti (Linux / aaPanel).
# Kullanım: repo kökünde  ->  bash deploy/update.sh
set -euo pipefail

BRANCH="claude/expense-splitting-app-h4vl8d"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "[1/5] Kod çekiliyor ($BRANCH)..."
cd "$ROOT"
git checkout -- web/package-lock.json 2>/dev/null || true
git pull origin "$BRANCH"

cd "$ROOT/web"

echo "[2/5] Bağımlılıklar..."
npm install

echo "[3/5] Veritabanı migration..."
npm run db:migrate

echo "[4/5] Build..."
npm run build

echo "[5/5] PM2 yeniden başlatılıyor..."
if pm2 describe sobso >/dev/null 2>&1; then
  pm2 restart sobso --update-env
else
  pm2 start ecosystem.config.js
  pm2 save
fi

echo ""
echo "Tamam! https://sobso.net"
