"""
Main application logic.
"""
import os
import sys
import time
import threading

from backend.config.paths import (
    APPDATA_ROOT, DIR_CONFIGS, DIR_LOGS, DIR_TEMP,
    FILE_ENV, FILE_GEN_CONFIG
)
from backend.process import (
    kill_old_processes, register_launcher_pid, cleanup_pids,
    create_job_object, assign_current_process
)
from backend.electron import open_window
from backend.i18n import init_i18n
from backend.server import start_server, stop_server, PORT
import json


def _log(message: str, service: str = "SYSTEM") -> None:
    """Simple logger."""
    try:
        print(f"[{service}] {message}", flush=True)
    except Exception:
        pass


def _init_filesystem() -> None:
    """Create required directories and files."""
    # Critical directories
    for d in [APPDATA_ROOT, DIR_CONFIGS, DIR_LOGS, DIR_TEMP]:
        try:
            os.makedirs(d, exist_ok=True)
        except Exception:
            pass
    
    # Create .env if missing
    if not os.path.exists(FILE_ENV):
        try:
            with open(FILE_ENV, 'w', encoding='utf-8') as f:
                f.write("# Flux Platform Config\n")
                f.write("LANGUAGE=ru\n")
                f.write("USE_GPU=true\n")
                f.write("DEBUG_MODE=false\n")
        except Exception:
            pass
    
    # Create generation config if missing
    if not os.path.exists(FILE_GEN_CONFIG):
        try:
            config = {
                "llm_temp": 0.7,
                "llm_ctx": 4096,
                "sd_steps": 30,
                "sd_cfg": 6.0,
                "sd_width": 896,
                "sd_height": 1152,
                "sd_sampler": "DPM++ 2M",
                "sd_scheduler": "Karras"
            }
            with open(FILE_GEN_CONFIG, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
        except Exception:
            pass


def _shutdown() -> None:
    """Graceful shutdown."""
    _log("🛑 Shutting down...")
    stop_server()
    cleanup_pids()
    _log("✅ Shutdown complete")


def main() -> None:
    """Main application entry point."""
    # Windows: Create job object for process group
    if sys.platform == "win32":
        create_job_object()
        threading.Thread(target=assign_current_process, daemon=True).start()
    
    # Kill old launcher processes
    killed = kill_old_processes()
    if killed > 0:
        _log(f"Killed {killed} old process(es)")
    
    # Register our PID
    register_launcher_pid()
    
    # Initialize i18n
    lang = init_i18n()
    _log(f"🚀 Starting (lang: {lang})")
    _log(f"📋 PID: {os.getpid()}")
    
    # Initialize filesystem in background
    threading.Thread(target=_init_filesystem, daemon=True).start()
    
    # Open Electron window
    url = f"http://localhost:{PORT}"
    open_window(url)

    # Start HTTP server
    start_server()
    
    # Main loop
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        _shutdown()
