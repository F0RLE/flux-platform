"""
Bootstrap: Check and install Python dependencies.
"""
import os
import sys
import subprocess
import time
import json

# Cache paths
_appdata = os.environ.get("APPDATA", "")
_cache_file = os.path.join(_appdata, "FluxData", "User", "Configs", ".bootstrap_cache.json")
_log_dir = os.path.join(_appdata, "FluxData", "System", "Logs")

# Required packages: (pip_name, import_name)
REQUIRED_PACKAGES = [
    ("requests", "requests"),
    ("psutil", "psutil"),
    ("python-dotenv", "dotenv"),
    ("packaging", "packaging"),
    ("cryptography", "cryptography"),
    ("SpeechRecognition", "speech_recognition"),
]


def _cache_valid() -> bool:
    """Check if dependency cache is valid (<2 hours old)."""
    try:
        if os.path.exists(_cache_file):
            with open(_cache_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            # Cache valid for 7 days (604800 seconds)
            return (time.time() - data.get("last_check", 0)) < 604800
    except Exception:
        pass
    return False


def _update_cache() -> None:
    """Update cache timestamp."""
    try:
        os.makedirs(os.path.dirname(_cache_file), exist_ok=True)
        with open(_cache_file, "w", encoding="utf-8") as f:
            json.dump({"last_check": time.time()}, f)
    except Exception:
        pass


def _get_missing() -> list:
    """Return list of missing packages."""
    missing = []
    for pip_name, import_name in REQUIRED_PACKAGES:
        try:
            __import__(import_name)
        except ImportError:
            missing.append(pip_name)
    return missing


def _install_pip() -> bool:
    """Install pip if not available."""
    try:
        import urllib.request
        import tempfile
        pip_script = os.path.join(tempfile.gettempdir(), "get-pip.py")
        urllib.request.urlretrieve("https://bootstrap.pypa.io/get-pip.py", pip_script)
        subprocess.check_call(
            [sys.executable, pip_script],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=120
        )
        return True
    except Exception:
        return False


def _install_packages(packages: list) -> bool:
    """Install packages via pip."""
    python = sys.executable
    
    # Check pip
    try:
        result = subprocess.run(
            [python, "-m", "pip", "--version"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=2
        )
        if result.returncode != 0:
            if not _install_pip():
                return False
    except Exception:
        if not _install_pip():
            return False
    
    # Install each package
    for pkg in packages:
        print(f"  Installing {pkg}...")
        try:
            result = subprocess.run(
                [python, "-m", "pip", "install", pkg],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=120
            )
            if result.returncode != 0:
                print(f"  Failed: {pkg}")
                return False
        except Exception as e:
            print(f"  Error: {pkg} - {e}")
            return False
    
    return True


def ensure_dependencies() -> bool:
    """
    Ensure all required dependencies are installed.
    Returns True if all dependencies are available.
    """
    # Check cache first (fast path)
    if _cache_valid():
        return True
    
    # Check what's missing
    missing = _get_missing()
    
    if not missing:
        _update_cache()
        return True
    
    print(f"\nMissing packages: {', '.join(missing)}")
    
    if _install_packages(missing):
        _update_cache()
        return True
    
    print(f"\nFailed to install. Run manually:")
    print(f"  pip install {' '.join(missing)}")
    return False
