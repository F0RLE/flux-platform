@echo off
REM ==========================================
REM Flux Platform Launcher
REM Supports both development and installed modes
REM ==========================================

setlocal enabledelayedexpansion

REM Check if running from installed location or dev
set "APPDATA_DIR=%APPDATA%\FluxData"
set "INSTALLED_PYTHON=%APPDATA_DIR%\System\Runtime\python\python.exe"
set "INSTALLED_LAUNCHER=%APPDATA_DIR%\System\Launcher"

REM Dev mode: script is in Flux Platform\scripts\
set "SCRIPT_DIR=%~dp0"
set "DEV_ROOT=%SCRIPT_DIR%.."
set "DEV_LAUNCHER=%DEV_ROOT%\src\backend\__main__.py"

REM Check for installed Python first
if exist "%INSTALLED_PYTHON%" (
    REM Check if we're running installed version or dev version
    if exist "%INSTALLED_LAUNCHER%\src\backend\__main__.py" (
        REM Running installed version
        cd /d "%INSTALLED_LAUNCHER%"
        "%INSTALLED_PYTHON%" src\backend\__main__.py
    ) else if exist "%DEV_LAUNCHER%" (
        REM Running dev version with installed Python
        cd /d "%DEV_ROOT%"
        "%INSTALLED_PYTHON%" src\backend\__main__.py
    ) else (
        echo [ERROR] Launcher not found!
        pause
        exit /b 1
    )
) else (
    REM Try system Python for dev mode
    where python >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        if exist "%DEV_LAUNCHER%" (
            cd /d "%DEV_ROOT%"
            python src\backend\__main__.py
        ) else (
            echo [ERROR] Launcher not found at: %DEV_LAUNCHER%
            pause
            exit /b 1
        )
    ) else (
        echo [ERROR] Python not found!
        echo Please run the installer first or install Python.
        pause
        exit /b 1
    )
)
