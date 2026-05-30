import os
import sys

# Ensure the backend package (moved to backend/app) is importable when running
# `uvicorn backend.main:app`. Insert this `backend` directory on sys.path so
# imports like `import app` inside the moved code resolve to `backend/app`.
BACKEND_DIR = os.path.abspath(os.path.dirname(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Import the moved application entrypoint
from app_main import app  # noqa: E402, F401

# Export `app` as the FastAPI application for uvicorn: `uvicorn backend.main:app`
