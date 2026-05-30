import os
import json
from typing import List

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)


def _file_for(collection: str) -> str:
    return os.path.join(DATA_DIR, f"{collection}.json")


def read_collection(collection: str) -> List[dict]:
    path = _file_for(collection)
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as fh:
        try:
            return json.load(fh)
        except Exception:
            return []


def write_collection(collection: str, items: List[dict]) -> None:
    path = _file_for(collection)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(items, fh, ensure_ascii=False, indent=2)
