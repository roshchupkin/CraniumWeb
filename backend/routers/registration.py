"""Registration endpoints: register, cranial-cut, facial-clip."""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, JSONResponse
import tempfile
import json
from pathlib import Path

from services.cranium_service import CraniumService

router = APIRouter(prefix="/api/registration", tags=["registration"])


@router.post("/register")
async def register(
    mesh: UploadFile = File(...),
    landmarks: str = Form(...),
    target: str = Form("cranium"),
):
    """Register mesh with three landmarks. Returns PLY + landmarks JSON."""
    try:
        landmarks_dict = json.loads(landmarks)
        for key in ["nasion", "left_tragus", "right_tragus"]:
            if key not in landmarks_dict:
                raise HTTPException(400, f"Missing landmark: {key}")
    except json.JSONDecodeError as e:
        raise HTTPException(400, f"Invalid landmarks JSON: {e}")

    with tempfile.TemporaryDirectory() as tmpdir:
        work_dir = Path(tmpdir)
        suffix = Path(mesh.filename or "mesh.ply").suffix
        mesh_path = work_dir / ("input" + suffix)
        content = await mesh.read()
        mesh_path.write_bytes(content)

        service = CraniumService(work_dir)
        out_path, out_landmarks = service.register(
            mesh_path, landmarks_dict, target=target
        )

        # Return multipart: PLY file + JSON in response headers or as separate download
        # For simplicity: return JSON with landmarks; client fetches PLY via separate mechanism
        # Actually we need to return both. Option: return JSON with base64 PLY, or two-part response
        # Simpler: return the PLY file and put landmarks in a custom header or as a separate endpoint
        # Best: return JSON with { landmarks, download_url } - but we can't have a download_url for temp
        # So: return the PLY file in response body, and landmarks as a header X-Landmarks: base64(json)
        import base64
        landmarks_b64 = base64.b64encode(
            json.dumps(out_landmarks).encode()
        ).decode()

        return FileResponse(
            out_path,
            media_type="application/octet-stream",
            filename=out_path.name,
            headers={"X-Landmarks": landmarks_b64},
        )


@router.post("/cranial-cut")
async def cranial_cut(
    mesh: UploadFile = File(...),
    initial_clip: bool = Form(False),
):
    """Clip mesh for cranial analysis. Returns clipped PLY."""
    with tempfile.TemporaryDirectory() as tmpdir:
        work_dir = Path(tmpdir)
        suffix = Path(mesh.filename or "mesh.ply").suffix
        mesh_path = work_dir / ("input" + suffix)
        content = await mesh.read()
        mesh_path.write_bytes(content)

        service = CraniumService(work_dir)
        out_path = service.cranial_cut(mesh_path, initial_clip=initial_clip)

        return FileResponse(
            out_path,
            media_type="application/octet-stream",
            filename=out_path.name,
        )


@router.post("/facial-clip")
async def facial_clip(
    mesh: UploadFile = File(...),
    landmarks: str = Form(...),
):
    """Clip mesh for facial analysis. Requires landmarks from registration."""
    try:
        landmarks_dict = json.loads(landmarks)
        # Use new positions from registration if available, else initial
        if "new_nasion" in landmarks_dict:
            newpos = [
                landmarks_dict["new_nasion"],
                landmarks_dict["new_lh_coord"],
                landmarks_dict["new_rh_coord"],
            ]
        else:
            newpos = [
                landmarks_dict["nasion"],
                landmarks_dict["left_tragus"],
                landmarks_dict["right_tragus"],
            ]
    except (json.JSONDecodeError, KeyError) as e:
        raise HTTPException(400, f"Invalid landmarks JSON: {e}")

    with tempfile.TemporaryDirectory() as tmpdir:
        work_dir = Path(tmpdir)
        suffix = Path(mesh.filename or "mesh.ply").suffix
        mesh_path = work_dir / ("input" + suffix)
        content = await mesh.read()
        mesh_path.write_bytes(content)

        service = CraniumService(work_dir)
        out_path = service.facial_clip(mesh_path, newpos)

        return FileResponse(
            out_path,
            media_type="application/octet-stream",
            filename=out_path.name,
        )
