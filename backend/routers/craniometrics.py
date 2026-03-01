"""Craniometrics endpoint."""

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from pathlib import Path
import tempfile

from services.cranium_service import CraniumService

router = APIRouter(prefix="/api/craniometrics", tags=["craniometrics"])


@router.post("")
async def craniometrics(mesh: UploadFile = File(...)):
    """Extract cephalometric measurements. Returns metrics JSON."""
    with tempfile.TemporaryDirectory() as tmpdir:
        work_dir = Path(tmpdir)
        suffix = Path(mesh.filename or "mesh.ply").suffix
        mesh_path = work_dir / ("input" + suffix)
        content = await mesh.read()
        mesh_path.write_bytes(content)

        service = CraniumService(work_dir)
        try:
            metrics = service.craniometrics(mesh_path)
            return JSONResponse(metrics)
        except Exception as e:
            raise HTTPException(500, str(e))
