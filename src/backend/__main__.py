#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Flux Platform Launcher Entry Point
Usage: python -m backend
"""
import sys
import os

# Add src to path
_this_dir = os.path.dirname(os.path.abspath(__file__))
_src_dir = os.path.dirname(_this_dir)
_project_root = os.path.dirname(_src_dir)

if _src_dir not in sys.path:
    sys.path.insert(0, _src_dir)
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from backend.bootstrap import ensure_dependencies
from backend.app import main


if __name__ == "__main__":
    # Ensure dependencies first
    if not ensure_dependencies():
        print("Failed to install dependencies")
        sys.exit(1)
    
    # Run launcher
    main()
