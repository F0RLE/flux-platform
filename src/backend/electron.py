"""
Electron window management.
"""
import os
import sys
import subprocess

from backend.config.paths import RUNTIME_DIR, PROJECT_ROOT
from backend.process import save_pid


def launch_electron(url: str = "flux://launcher") -> bool:
    """
    Launch Electron window.
    Returns True if launched successfully.
    """
    try:
        electron_exe = os.path.join(RUNTIME_DIR, "electron", "electron.exe")
        
        # Check both possible locations for main.js
        main_js = os.path.join(PROJECT_ROOT, "src", "frontend", "electron", "main.js")
        if not os.path.exists(main_js):
            main_js = os.path.join(PROJECT_ROOT, "src", "ui", "electron", "main.js")
        
        if not os.path.exists(electron_exe):
            print(f"[ELECTRON] Not found: {electron_exe}")
            return False
        
        if not os.path.exists(main_js):
            print(f"[ELECTRON] main.js not found")
            return False
        
        env = os.environ.copy()
        env["LAUNCHER_URL"] = url
        
        proc = subprocess.Popen(
            [electron_exe, main_js],
            env=env,
            cwd=PROJECT_ROOT,
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
        )
        
        save_pid("electron", proc.pid)
        print(f"[ELECTRON] Started (PID: {proc.pid})")
        return True
        
    except Exception as e:
        print(f"[ELECTRON] Failed: {e}")
        return False


def open_window(url: str = "http://localhost:18888") -> None:
    """Open the launcher window (Electron only)."""
    if os.environ.get("LAUNCHER_NO_BROWSER") == "1":
        return
    
    if launch_electron(url):
        print("✅ Лаунчер запущен")
    else:
        print("⚠️ Electron not available")
        print(f"ℹ️ Open in browser: {url}")
        print("ℹ️ Install Electron to: %APPDATA%/FluxData/System/Runtime/electron/")
