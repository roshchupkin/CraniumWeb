"""Mesh upload and metadata endpoints."""

from __future__ import annotations

import atexit
import tempfile
import uuid
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/mesh", tags=["mesh"])

# In-memory store for temp file paths (simple; for production use Redis or similar)
_temp_files: dict[str, Path] = {}
_MAX_TEMP_FILES = 100


def _evict_oldest() -> None:
    """Remove oldest temp file from dict and delete from disk."""
    if not _temp_files:
        return
    oldest_id = next(iter(_temp_files))
    path = _temp_files.pop(oldest_id)
    try:
        path.unlink(missing_ok=True)
    except OSError:
        pass


def _cleanup_all_temp_files() -> None:
    """Delete all temp files on process exit."""
    for path in list(_temp_files.values()):
        try:
            path.unlink(missing_ok=True)
        except OSError:
            pass
    _temp_files.clear()


atexit.register(_cleanup_all_temp_files)


@router.post("/upload")
async def upload_mesh(file: UploadFile = File(...)):
    """Upload a mesh file and return temp ID for subsequent operations."""
    if not file.filename or not file.filename.lower().endswith(
        (".ply", ".obj", ".stl")
    ):
        raise HTTPException(400, "File must be .ply, .obj, or .stl")

    suffix = Path(file.filename).suffix
    temp_id = str(uuid.uuid4())
    with tempfile.NamedTemporaryFile(
        delete=False, suffix=suffix, prefix="cranium_"
    ) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = Path(tmp.name)

    while len(_temp_files) >= _MAX_TEMP_FILES:
        _evict_oldest()
    _temp_files[temp_id] = tmp_path
    return JSONResponse(
        {"temp_id": temp_id, "filename": file.filename, "size": len(content)}
    )
