"""Mesh upload and metadata endpoints."""

from __future__ import annotations

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import tempfile
import uuid
from pathlib import Path

router = APIRouter(prefix="/api/mesh", tags=["mesh"])

# In-memory store for temp file paths (simple; for production use Redis or similar)
_temp_files: dict[str, Path] = {}


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

    _temp_files[temp_id] = tmp_path
    return JSONResponse(
        {"temp_id": temp_id, "filename": file.filename, "size": len(content)}
    )
