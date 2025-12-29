"""
Path configuration for Flux Platform.
All paths are absolute and auto-created.
"""
import os
import sys

# =============================================================================
# PROJECT ROOT
# =============================================================================

if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.dirname(sys.executable)
    PROJECT_ROOT = BASE_DIR
else:
    _this_file = os.path.abspath(__file__)
    _config_dir = os.path.dirname(_this_file)    # backend/config
    _backend_dir = os.path.dirname(_config_dir)  # backend
    _src_dir = os.path.dirname(_backend_dir)     # src
    PROJECT_ROOT = os.path.dirname(_src_dir)     # Flux Platform
    BASE_DIR = _backend_dir

# =============================================================================
# APPDATA STRUCTURE
# =============================================================================

APPDATA_ROOT = os.path.join(
    os.environ.get("APPDATA", os.path.expanduser("~")), 
    "FluxData"
)

# User data
USER_ROOT = os.path.join(APPDATA_ROOT, "User")
DIR_CONFIGS = os.path.join(USER_ROOT, "Configs")

# System data
SYSTEM_ROOT = os.path.join(APPDATA_ROOT, "System")
RUNTIME_DIR = os.path.join(SYSTEM_ROOT, "Runtime")
LAUNCHER_DIR = os.path.join(SYSTEM_ROOT, "Launcher")  # Launcher code from GitHub
ENGINE_DIR = os.path.join(SYSTEM_ROOT, "Engine")      # SD, Ollama, etc.
DIR_LOGS = os.path.join(SYSTEM_ROOT, "Logs")
DIR_TEMP = os.path.join(SYSTEM_ROOT, "Temp")
DIR_FONTS = os.path.join(SYSTEM_ROOT, "Fonts")

# Runtime components
PYTHON_DIR = os.path.join(RUNTIME_DIR, "python")
ELECTRON_DIR = os.path.join(RUNTIME_DIR, "electron")
GIT_DIR = os.path.join(RUNTIME_DIR, "git")

# =============================================================================
# CONFIGURATION FILES
# =============================================================================

FILE_ENV = os.path.join(DIR_CONFIGS, ".env")
FILE_CHANNELS = os.path.join(DIR_CONFIGS, "channels.json")
FILE_GEN_CONFIG = os.path.join(DIR_CONFIGS, "generation_config.json")

# =============================================================================
# ENSURE DIRECTORIES EXIST
# =============================================================================

for _dir in [DIR_CONFIGS, SYSTEM_ROOT, RUNTIME_DIR, DIR_LOGS, DIR_TEMP, DIR_FONTS]:
    try:
        os.makedirs(_dir, exist_ok=True)
    except Exception:
        pass
