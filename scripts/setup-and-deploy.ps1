# D1 設定與部署腳本
# 使用方式：在 PowerShell 中執行
#   $env:CLOUDFLARE_API_TOKEN = "您的_API_Token"
#   .\scripts\setup-and-deploy.ps1

$ErrorActionPreference = "Stop"

if (-not $env:CLOUDFLARE_API_TOKEN) {
    Write-Host "錯誤：請先設定 CLOUDFLARE_API_TOKEN 環境變數" -ForegroundColor Red
    Write-Host "  `$env:CLOUDFLARE_API_TOKEN = `"您的_API_Token`"" -ForegroundColor Yellow
    exit 1
}

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $projectRoot

Write-Host "`n=== 1. 套用 D1 migrations ===" -ForegroundColor Cyan
npx wrangler d1 migrations apply dory-babe-shop-db --remote
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n=== 2. 建置專案 ===" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n=== 3. 部署至 Cloudflare Pages ===" -ForegroundColor Cyan
npx wrangler pages deploy dist --project-name=dory-babe-shop
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n=== 完成 ===" -ForegroundColor Green
Write-Host "請至 Cloudflare Dashboard 確認 D1 綁定已設定（Settings > Functions > Bindings）" -ForegroundColor Yellow
