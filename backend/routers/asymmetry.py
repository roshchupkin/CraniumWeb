"""Facial asymmetry endpoint."""

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from pathlib import Path
import tempfile

from services.cranium_service import CraniumService

router = APIRouter(prefix="/api/asymmetry", tags=["asymmetry"])


@router.post("")
async def asymmetry(mesh: UploadFile = File(...)):
    """Compute facial asymmetry. Returns MAI and per-vertex heatmap."""
    with tempfile.TemporaryDirectory() as tmpdir:
        work_dir = Path(tmpdir)
        suffix = Path(mesh.filename or "mesh.ply").suffix
        mesh_path = work_dir / ("input" + suffix)
        content = await mesh.read()
        mesh_path.write_bytes(content)

        service = CraniumService(work_dir)
        try:
            result = service.calculate_asymmetry(mesh_path)
            return JSONResponse(result)
        except RuntimeError as e:
            if "menpo3d" in str(e):
                raise HTTPException(
                    status_code=501,
                    detail="Asymmetry calculation requires menpo3d (not installed)",
                )
            raise HTTPException(500, str(e))
        except Exception as e:
            raise HTTPException(500, str(e))
