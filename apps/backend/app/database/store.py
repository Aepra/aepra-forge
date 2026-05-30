"""Simple file-based storage for schema snapshots.

This module provides minimal helpers to persist schema JSON to disk so
backend code can read/write snapshots without requiring a DB during
early development. Intended as a temporary placeholder.
"""

import json
import os
from typing import Any, Optional

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)


def _path_for(project_id: str) -> str:
    safe = project_id.replace("/", "_").replace("\\", "_")
    return os.path.join(DATA_DIR, f"{safe}.json")


def save_schema_snapshot(project_id: str, schema: Any) -> str:
    """Save schema JSON for a project to a file and return the path."""
    path = _path_for(project_id)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(schema, fh, ensure_ascii=False, indent=2)
    return path


def load_schema_snapshot(project_id: str) -> Optional[Any]:
    """Load and return schema JSON for a project, or None if missing."""
    path = _path_for(project_id)
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)
