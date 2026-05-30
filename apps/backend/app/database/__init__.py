"""database package

Lightweight area to house simple file-based data storage used as a
placeholder for persisted schema/artifacts. This lets backend code
read/write schema snapshots locally for development and simplifies
future wiring to a proper database.
"""

from . import store

__all__ = ["store"]
