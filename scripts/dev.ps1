# Dev Mode Launch Script
$ErrorActionPreference = "Stop"

# Ensure Cargo is in PATH
$env:PATH = "C:\Users\FORLE\.cargo\bin;$env:PATH"

Write-Host "Starting Flux Platform (Dev Mode)..." -ForegroundColor Cyan

$scriptDir = $PSScriptRoot
$srcDir = Join-Path $scriptDir "..\src"
$tauriDir = Join-Path $scriptDir "..\src-tauri"

# Install frontend deps if missing
if (-not (Test-Path "$srcDir\node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    Set-Location $srcDir
    npm install
}

# Start Vite in background (using cmd /c to ensure npm works)
Write-Host "Starting Vite..." -ForegroundColor Cyan
$viteProcess = Start-Process -FilePath "cmd" -ArgumentList "/c npm run dev" -WorkingDirectory $srcDir -PassThru -NoNewWindow
Start-Sleep -Seconds 5

Write-Host "Launching Tauri..." -ForegroundColor Cyan
Set-Location $tauriDir
rustup run stable-msvc cargo tauri dev

# Kill Vite on exit
Stop-Process -Id $viteProcess.Id -ErrorAction SilentlyContinue
Write-Host "Stopped Vite." -ForegroundColor DarkGray
