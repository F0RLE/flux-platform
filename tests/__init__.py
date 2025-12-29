"""
Test package for Flux Platform.
Compatible with Python 3.10 - 3.14
"""
import sys
from pathlib import Path

# Add src/backend to path for imports
project_root = Path(__file__).parent.parent
backend_path = project_root / "src" / "backend"
if backend_path.exists():
    sys.path.insert(0, str(backend_path))
