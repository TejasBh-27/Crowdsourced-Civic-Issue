#!/usr/bin/env python
"""
start.py — One-command launcher for the CivicPulse AI microservice.
Installs dependencies if missing, then starts uvicorn.

Usage:
    python start.py
    py start.py        (Windows Python Launcher)
"""

import subprocess
import sys
import os

SERVICE_DIR = os.path.dirname(os.path.abspath(__file__))
REQ_FILE    = os.path.join(SERVICE_DIR, "requirements.txt")

def install_deps():
    print("📦  Checking / installing Python dependencies …")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", REQ_FILE, "--quiet"])
    print("✅  Dependencies OK")

def start_server():
    print("\n🚀  Starting CivicPulse AI Microservice on http://localhost:8000 …")
    print("    Docs: http://localhost:8000/docs\n")
    os.chdir(SERVICE_DIR)
    subprocess.check_call([
        sys.executable, "-m", "uvicorn", "main:app",
        "--host", "0.0.0.0",
        "--port", "8000",
        "--reload",
        "--log-level", "info",
    ])

if __name__ == "__main__":
    install_deps()
    start_server()
