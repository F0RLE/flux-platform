# Очистка сборки
$ErrorActionPreference = "SilentlyContinue"

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║     🧹 Flux Platform - Clean           ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Yellow
Write-Host ""

$scriptDir = $PSScriptRoot

# Clean Rust build
Write-Host "[1/4] Cleaning Rust target..." -ForegroundColor Cyan
Remove-Item -Recurse -Force "$scriptDir\..\backend\target" -ErrorAction SilentlyContinue
Remove-Item -Force "$scriptDir\..\backend\Cargo.lock" -ErrorAction SilentlyContinue

# Clean Vite dist
Write-Host "[2/4] Cleaning Vite dist..." -ForegroundColor Cyan
Remove-Item -Recurse -Force "$scriptDir\..\frontend\dist" -ErrorAction SilentlyContinue

# Clean node_modules (optional, commented by default)
# Write-Host "[3/4] Cleaning node_modules..." -ForegroundColor Cyan
# Remove-Item -Recurse -Force "$scriptDir\..\frontend\node_modules" -ErrorAction SilentlyContinue

Write-Host "[3/4] Skipping node_modules (run with -Full to include)" -ForegroundColor DarkGray

# Clean release folder
Write-Host "[4/4] Cleaning release folder..." -ForegroundColor Cyan
$releaseDir = "$scriptDir\..\..\release"
if (Test-Path $releaseDir) {
    Remove-Item -Recurse -Force $releaseDir -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "✅ Clean complete!" -ForegroundColor Green
Write-Host ""
