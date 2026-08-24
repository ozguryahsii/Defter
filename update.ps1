# Defter güncelleme scripti — yönetici PowerShell'de çalıştır:
#   powershell -ExecutionPolicy Bypass -File .\update.ps1
#
# Sırayla: servisi durdurur, yerel package-lock değişikliğini atar (pull'u
# engellemesin), kodu çeker, bağımlılık + migration + build, servisi başlatır.

$ErrorActionPreference = "Stop"
$branch = "claude/expense-splitting-app-h4vl8d"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "[1/6] Servis durduruluyor..." -ForegroundColor Cyan
Stop-Service Defter -ErrorAction SilentlyContinue

Set-Location $root

Write-Host "[2/6] Yerel package-lock.json degisikligi atiliyor..." -ForegroundColor Cyan
git checkout -- web/package-lock.json 2>$null

Write-Host "[3/6] Kod cekiliyor ($branch)..." -ForegroundColor Cyan
git pull origin $branch

Set-Location "$root\web"

Write-Host "[4/6] Bagimliliklar kuruluyor..." -ForegroundColor Cyan
npm install

Write-Host "[5/6] Veritabani migration + build..." -ForegroundColor Cyan
npm run db:migrate
npm run build

Write-Host "[6/6] Servis baslatiliyor..." -ForegroundColor Cyan
Start-Service Defter

Write-Host ""
Write-Host "Tamam! http://localhost:3000" -ForegroundColor Green
