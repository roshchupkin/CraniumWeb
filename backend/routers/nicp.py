"""Non-rigid ICP endpoint."""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
import tempfile

from services.cranium_service import CraniumService

router = APIRouter(prefix="/api/nicp", tags=["nicp"])


@router.post("")
async def nicp(
    mesh: UploadFile = File(...),
    target: str = Form("cranium"),
):
    """Run non-rigid ICP. Returns deformed PLY. Target: cranium, face, or head."""
    if target not in ("cranium", "face", "head"):
        raise HTTPException(400, "target must be cranium, face, or head")

    with tempfile.TemporaryDirectory() as tmpdir:
        work_dir = Path(tmpdir)
        suffix = Path(mesh.filename or "mesh.ply").suffix
        mesh_path = work_dir / ("input" + suffix)
        content = await mesh.read()
        mesh_path.write_bytes(content)

        service = CraniumService(work_dir)
        try:
            out_path = service.nricp_to_template(mesh_path, target=target)
            return FileResponse(
                out_path,
                media_type="application/octet-stream",
                filename=out_path.name,
            )
        except Exception as e:
            raise HTTPException(500, str(e))
