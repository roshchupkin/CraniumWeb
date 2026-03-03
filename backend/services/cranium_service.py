"""
CraniumService - Headless service layer wrapping CraniumPy logic.
No plotter/visualization - returns mesh data and metrics.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Add CraniumPy to path for imports
_CRANIUM_ROOT = Path(__file__).resolve().parent.parent.parent / "CraniumPy"
if str(_CRANIUM_ROOT) not in sys.path:
    sys.path.insert(0, str(_CRANIUM_ROOT))

import pyacvd
import pyvista as pv
import numpy as np
from pymeshfix import _meshfix
from craniometrics.craniometrics import CranioMetrics
from registration.picking import CoordinatePicking
from registration.write_ply import write_ply_file
import json
import datetime
import open3d as o3d
from nicp.icp import IterativeClosestPoint, ApplyTransformation
from nicp.nricp import nonrigidIcp
from nicp.write_ply import write_ply_file_NICP
import copy

try:
    from menpo3d.vtkutils import VTKClosestPointLocator
    HAS_MENPO = True
except ImportError:
    HAS_MENPO = False


def _template_dir() -> Path:
    return _CRANIUM_ROOT / "template"


def _calculate_sum(points1, points2, half_face="left"):
    if half_face == "left":
        mask = points1[:, 0] < 0
    else:
        mask = points1[:, 0] > 0
    points1 = points1[mask]
    points2 = points2[mask]
    n = points1.shape[0]
    distances = np.linalg.norm(points1 - points2, axis=1)
    return np.sum(distances) / n


def _mirror_mesh(mesh):
    mirrored = mesh.copy()
    mirrored.flip_x()
    return mirrored


def _compute_asymmetry_heatmap(original_points, mirrored_points):
    half_index = np.where(original_points[:, 0] < 0)
    center = np.mean(original_points, axis=0)
    center = [center[0], 0, center[2]]
    distance_original = np.linalg.norm(original_points - center, axis=1)
    distance_mirror = np.linalg.norm(mirrored_points - center, axis=1)
    asymmetry_heatmap = distance_original - distance_mirror
    asymmetry_heatmap[half_index] = 0
    return asymmetry_heatmap


def _convert_to_open3d(mesh_pv):
    """Convert PyVista mesh to Open3D TriangleMesh."""
    m = o3d.geometry.TriangleMesh()
    m.vertices = o3d.utility.Vector3dVector(mesh_pv.points)
    m.triangles = o3d.utility.Vector3iVector(
        mesh_pv.faces.reshape(-1, 4)[:, 1:]
    )
    return m


def _repairsample(file_path: Path, n_vertices: int, postfix: str = "", repair: bool = False) -> Path:
    remesh = pv.read(file_path)
    if remesh.n_points <= 150000:
        clus = pyacvd.Clustering(remesh)
        clus.subdivide(3)
        clus.cluster(n_vertices)
        remesh = clus.create_mesh()
    remesh_path = file_path.with_name(file_path.stem + postfix + ".ply")
    write_ply_file(remesh, remesh_path)
    if repair:
        _meshfix.clean_from_file(str(remesh_path), str(remesh_path))
    return remesh_path


def landmarks_dict_to_list(landmarks: dict) -> list:
    """Convert API format {nasion, left_tragus, right_tragus} to internal format."""
    return [
        landmarks["nasion"],
        landmarks["left_tragus"],
        landmarks["right_tragus"],
    ]


def landmarks_list_to_dict(landmarks: list) -> dict:
    """Convert internal format to API format."""
    return {
        "nasion": landmarks[0].tolist() if hasattr(landmarks[0], "tolist") else list(landmarks[0]),
        "left_tragus": landmarks[1].tolist() if hasattr(landmarks[1], "tolist") else list(landmarks[1]),
        "right_tragus": landmarks[2].tolist() if hasattr(landmarks[2], "tolist") else list(landmarks[2]),
    }


class CraniumService:
    """Headless service for CraniumPy operations."""

    def __init__(self, work_dir: Path):
        self.work_dir = Path(work_dir)
        self.template_path_cranium = _template_dir() / "clipped_template_xy_com.ply"
        self.template_path_face = _template_dir() / "template_face.ply"
        self.template_path_head = _template_dir() / "template_xy_com.ply"
        self.CoM_translation = True

    def register(
        self,
        mesh_path: Path,
        landmarks: dict,
        target: str = "cranium",
    ) -> tuple[Path, dict]:
        """Register mesh with landmarks. Returns (output_ply_path, landmarks_json)."""
        landmarks_list = landmarks_dict_to_list(landmarks)
        metrics = CoordinatePicking(mesh_path)
        metrics.reg_to_template(landmarks_list)

        mesh_file = pv.read(mesh_path)
        mesh_file.translate(metrics.translation)
        mesh_file.rotate_x(metrics.x_rotation_nasion, transform_all_input_vectors=True)
        mesh_file.rotate_y(metrics.y_rotation_nasion, transform_all_input_vectors=True)
        mesh_file.rotate_z(metrics.z_rotation_nasion, transform_all_input_vectors=True)
        mesh_file.rotate_x(metrics.x_rotation_normals, transform_all_input_vectors=True)
        mesh_file.rotate_y(metrics.y_rotation_normals, transform_all_input_vectors=True)
        mesh_file.rotate_z(metrics.z_rotation_normals, transform_all_input_vectors=True)

        suffix = "_rgF" if target == "face" else "_rg"
        stem = mesh_path.stem
        if not stem.endswith(suffix):
            stem += suffix
        out_path = self.work_dir / (stem + ".ply")
        write_ply_file(mesh_file, str(out_path))

        if self.CoM_translation:
            temp_metric = CranioMetrics(out_path)
            temp_metric.extract_dimensions(temp_metric.slice_height)
            CoM = temp_metric.HC_s.center_of_mass()
            mesh_file.translate([0, 0, -CoM[2]])
            write_ply_file(mesh_file, str(out_path))
            metrics.lm_surf.translate([0, 0, -CoM[2]])

        if target == "face":
            mesh_file = pv.read(out_path)
            mesh_file.translate(
                [
                    -1 * metrics.lm_surf.points[0][0],
                    -1 * metrics.lm_surf.points[0][1],
                    -1 * metrics.lm_surf.points[0][2],
                ]
            )
            metrics.lm_surf.translate(
                [
                    -1 * metrics.lm_surf.points[0][0],
                    -1 * metrics.lm_surf.points[0][1],
                    -1 * metrics.lm_surf.points[0][2],
                ]
            )
            write_ply_file(mesh_file, str(out_path))

        newpos = metrics.lm_surf.points
        out_landmarks = {
            "datetime": datetime.datetime.now().strftime("%Y-%m-%d/%H:%M:%S"),
            "CoM": str(self.CoM_translation),
            "initial_nasion": np.round(landmarks_list[0], 3).tolist(),
            "initial_lh_coord": np.round(landmarks_list[1], 3).tolist(),
            "initial_rh_coord": np.round(landmarks_list[2], 3).tolist(),
            "new_nasion": np.round(newpos[0], 3).tolist(),
            "new_lh_coord": np.round(newpos[1], 3).tolist(),  # index 1 = left_tragus
            "new_rh_coord": np.round(newpos[2], 3).tolist(),  # index 2 = right_tragus
        }
        return out_path, out_landmarks

    def cranial_cut(self, mesh_path: Path, initial_clip: bool = False) -> Path:
        """Clip mesh for cranial analysis. Returns output PLY path."""
        mesh_file = pv.read(mesh_path)
        clip = -20 if initial_clip else 0

        mesh_file = mesh_file.clip_surface(
            pv.Sphere(radius=125, center=(0, 40, 0)), invert=True
        )
        mesh_file = mesh_file.clip(normal=[0, 0.6, 1], origin=[0, -60, -50], invert=False)
        mesh_file = mesh_file.clip("y", origin=[0, -21, 0], invert=False)

        stem = mesh_path.stem
        if not stem.endswith("_C"):
            stem += "_C"
        out_path = self.work_dir / (stem + ".ply")
        write_ply_file(mesh_file, str(out_path))

        _repairsample(out_path, n_vertices=20000, repair=True)

        mesh_file = pv.read(out_path)
        write_ply_file(mesh_file.clip("y", origin=[0, clip, 0], invert=False), str(out_path))

        _repairsample(out_path, n_vertices=10000, repair=False)

        mesh_file = pv.read(out_path)
        write_ply_file(mesh_file, str(out_path))

        if self.CoM_translation:
            temp_metric = CranioMetrics(out_path)
            temp_metric.extract_dimensions(temp_metric.slice_height)
            CoM = temp_metric.HC_s.center_of_mass()
            mesh_file.translate([-CoM[0], 0, -CoM[2]])
            write_ply_file(mesh_file, str(out_path))

        return out_path

    def facial_clip(self, mesh_path: Path, newpos_landmarks: list) -> Path:
        """Clip mesh for facial analysis. Requires landmarks from registration."""
        mesh_file = pv.read(mesh_path)
        lmk_surface = pv.PolyData(np.array(newpos_landmarks)).delaunay_2d()
        templ_centroid = lmk_surface.center_of_mass()

        mesh_file = mesh_file.clip(
            "z", origin=[0, 20, templ_centroid[2] - 1], invert=False
        )
        mesh_file = mesh_file.clip_surface(
            pv.Sphere(radius=115, center=(0, 25, -25)), invert=True
        )

        stem = mesh_path.stem
        if not stem.endswith("_CF"):
            stem += "_CF"
        out_path = self.work_dir / (stem + ".ply")
        write_ply_file(mesh_file, str(out_path))

        mesh_file = pv.read(out_path)
        write_ply_file(
            mesh_file.clip(
                "z", origin=[0, 20, templ_centroid[2]], invert=False
            ),
            str(out_path),
        )

        _repairsample(out_path, n_vertices=10000, repair=False)

        mesh_file = pv.read(out_path)
        write_ply_file(mesh_file, str(out_path))
        return out_path

    def craniometrics(self, mesh_path: Path) -> dict:
        """Extract cephalometric measurements. Returns metrics dict with HC line for visualization."""
        metrics = CranioMetrics(mesh_path)
        metrics.extract_dimensions(metrics.slice_height)
        # Order HC slice points by angle for closed contour (x,z plane)
        hcp = metrics.HC_s.points
        angles = np.arctan2(hcp[:, 2], hcp[:, 0])
        order = np.argsort(angles)
        hc_points = hcp[order].tolist()
        return {
            "Datetime": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "Filepath": str(mesh_path),
            "OFD_depth_mm": round(float(metrics.depth), 2),
            "BPD_breadth_mm": round(float(metrics.breadth), 2),
            "Cephalic_Index": metrics.CI,
            "Circumference_cm": metrics.HC,
            "MeshVolume_cc": round((metrics.pvmesh.volume / 1000), 2),
            "hc_line": hc_points,
        }

    def calculate_asymmetry(self, mesh_path: Path) -> dict:
        """Compute facial asymmetry. Returns MAI and per-vertex heatmap."""
        if not HAS_MENPO:
            raise RuntimeError("menpo3d is required for asymmetry calculation")

        mesh = pv.read(mesh_path)
        mirrored_mesh = _mirror_mesh(mesh)

        mirrored_o3d = _convert_to_open3d(mirrored_mesh)
        P = np.rollaxis(mirrored_mesh.points, 1)
        X = np.rollaxis(mesh.points, 1)
        Rr, tr, _ = IterativeClosestPoint(source_pts=P, target_pts=X, tau=10e-6)
        Np = ApplyTransformation(P, Rr, tr)
        Np = np.rollaxis(Np, 1)

        vertices = np.asarray(Np)
        faces = np.asarray(mirrored_o3d.triangles)
        faces = np.c_[np.full(len(faces), 3), faces]
        mirrored_mesh = pv.PolyData(vertices, faces)

        closest_points_locator = VTKClosestPointLocator(mirrored_mesh)
        closest_points, _ = closest_points_locator(mesh.points)
        sum_value = _calculate_sum(mesh.points, closest_points)
        asymmetry_heatmap = _compute_asymmetry_heatmap(
            mesh.points, closest_points
        )

        return {
            "Datetime": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "Filepath": str(mesh_path),
            "Mean_Asymmetry_Index": round(float(sum_value), 4),
            "asymmetry_heatmap": asymmetry_heatmap.tolist(),
        }

    def nricp_to_template(self, mesh_path: Path, target: str = "cranium") -> Path:
        """Run non-rigid ICP. Returns deformed mesh path."""
        sourcepath = str(self.template_path_cranium)
        if target == "face":
            sourcepath = str(self.template_path_face)
        elif target == "head":
            sourcepath = str(self.template_path_head)

        targetpath = str(mesh_path)
        stem = mesh_path.stem
        suffix = "_" + target[0] + "_nicp"
        if stem.endswith(suffix):
            deformedpath = mesh_path
        else:
            deformedpath = self.work_dir / (stem + suffix + ".ply")

        sourcemesh = pv.read(sourcepath)
        targetmesh = pv.read(targetpath)

        P = np.rollaxis(sourcemesh.points, 1)
        X = np.rollaxis(targetmesh.points, 1)
        Rr, tr, _ = IterativeClosestPoint(source_pts=P, target_pts=X, tau=10e-6)
        Np = ApplyTransformation(P, Rr, tr)
        Np = np.rollaxis(Np, 1)

        write_ply_file_NICP(sourcemesh, Np, str(deformedpath))
        deformed_pv = pv.read(deformedpath)

        deformed_rigid_o3d = _convert_to_open3d(deformed_pv)
        target_o3d = _convert_to_open3d(targetmesh)
        deformed_mesh = nonrigidIcp(deformed_rigid_o3d, target_o3d)
        o3d.io.write_triangle_mesh(filename=str(deformedpath), mesh=deformed_mesh)

        return Path(deformedpath)
