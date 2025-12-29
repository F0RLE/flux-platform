@echo off
set "PYTHON_PATH=%APPDATA%\FluxData\System\Runtime\python\python.exe"
set "PROJECT_ROOT=%~dp0.."
cd /d "%PROJECT_ROOT%"
set "LAUNCHER_SCRIPT=src\backend\__main__.py"

REM Fallback to old structure not needed anymore as we are in strict mode
if not exist "%LAUNCHER_SCRIPT%" (
    echo [ERROR] Launcher script not found at: %LAUNCHER_SCRIPT%
    echo Current dir: %CD%
    pause
    exit /b 1
)

if exist "%PYTHON_PATH%" (
    "%PYTHON_PATH%" "%LAUNCHER_SCRIPT%"
) else (
    echo [ERROR] Runtime not found at:
    echo %PYTHON_PATH%
    echo.
    echo Please ensure the runtime is installed in AppData\Roaming\FluxData.
    pause
    exit /b 1
)
pause
