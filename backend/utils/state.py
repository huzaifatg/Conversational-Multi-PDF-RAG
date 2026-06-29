from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from backend.utils.config import settings


STATE_FILE = settings.backend_dir / "index_state.json"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def default_state() -> dict[str, Any]:
    return {
        "status": "idle",
        "message": "",
        "started_at": None,
        "finished_at": None,
        "updated_at": _now(),
        "indexed_files": [],
        "error": None,
    }


def read_state() -> dict[str, Any]:
    if not STATE_FILE.exists():
        return default_state()
    try:
        with STATE_FILE.open("r", encoding="utf-8") as handle:
            state = json.load(handle)
    except Exception:
        return default_state()

    merged = default_state()
    if isinstance(state, dict):
        merged.update(state)
    return merged


def write_state(state: dict[str, Any]) -> dict[str, Any]:
    payload = default_state()
    payload.update(state)
    payload["updated_at"] = _now()
    with STATE_FILE.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
    return payload


def set_index_status(
    status: str,
    message: str = "",
    indexed_files: list[str] | None = None,
    error: str | None = None,
) -> dict[str, Any]:
    state = read_state()
    state.update(
        {
            "status": status,
            "message": message,
            "indexed_files": indexed_files or [],
            "error": error,
        }
    )
    if status == "running":
        state["started_at"] = _now()
        state["finished_at"] = None
    else:
        state["finished_at"] = _now()
    return write_state(state)
