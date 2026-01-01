# Release Build Script
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║     📦 Flux Platform - Build           ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

$env:PATH = $env:PATH + ";C:\msys64\mingw64\bin"

$scriptDir = $PSScriptRoot

# Install frontend dependencies if needed
$nodeModules = "$scriptDir\..\frontend\node_modules"
if (-not (Test-Path $nodeModules)) {
    Write-Host "[1/4] Installing frontend dependencies..." -ForegroundColor Cyan
    Push-Location "$scriptDir\..\frontend"
    npm install
    Pop-Location
} else {
    Write-Host "[1/4] Frontend dependencies OK" -ForegroundColor DarkGray
}

# Build frontend with Vite
Write-Host "[2/4] Building frontend with Vite..." -ForegroundColor Cyan
Push-Location "$scriptDir\..\frontend"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Vite build failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# Build Tauri
Write-Host "[3/4] Building Tauri release..." -ForegroundColor Cyan
Push-Location "$scriptDir\..\backend"
cargo tauri build
Pop-Location

# Copy outputs
Write-Host "[4/4] Copying outputs..." -ForegroundColor Cyan

$exePath = "$scriptDir\..\backend\target\release\flux-platform.exe"
$releaseDir = "$scriptDir\..\..\release"

if (Test-Path $exePath) {
    if (-not (Test-Path $releaseDir)) { 
        New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null 
    }
    Copy-Item $exePath "$releaseDir\FluxPlatform.exe" -Force
    Write-Host "   ✓ FluxPlatform.exe" -ForegroundColor Green
}

# Copy installers
$bundlePath = "$scriptDir\..\backend\target\release\bundle"
if (Test-Path $bundlePath) {
    $distDir = "$releaseDir\dist"
    if (-not (Test-Path $distDir)) { 
        New-Item -ItemType Directory -Path $distDir -Force | Out-Null 
    }
    
    $msiFiles = Get-ChildItem "$bundlePath\msi\*.msi" -ErrorAction SilentlyContinue
    $nsisFiles = Get-ChildItem "$bundlePath\nsis\*.exe" -ErrorAction SilentlyContinue
    
    foreach ($file in $msiFiles) {
        Copy-Item $file.FullName "$distDir\" -Force
        Write-Host "   ✓ $($file.Name)" -ForegroundColor Green
    }
    foreach ($file in $nsisFiles) {
        Copy-Item $file.FullName "$distDir\" -Force
        Write-Host "   ✓ $($file.Name)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║     ✅ Build Complete!                 ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Output: $releaseDir" -ForegroundColor DarkGray
Write-Host ""
