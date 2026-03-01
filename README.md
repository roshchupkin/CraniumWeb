# CraniumWeb

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

Browser-based craniofacial mesh registration and analysis. Rewrite of [CraniumPy](https://github.com/T-AbdelAlim/CraniumPy) as a hybrid web app: React + Three.js frontend, FastAPI backend reusing CraniumPy algorithms.

**Repository**: [github.com/roshchupkin/CraniumWeb](https://github.com/roshchupkin/CraniumWeb)

**Built on**: [CraniumPy](https://github.com/T-AbdelAlim/CraniumPy) by Tareq Abdel-Alim — craniofacial mesh registration and analysis. See [CraniumPy/README.md](CraniumPy/README.md) for citation and DOI.

## Docker Quick Start (recommended)

No local Python or Node setup required. Requires [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/).

```bash
docker compose up --build
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API docs**: http://localhost:8000/docs

Note: The first build may take 10–15 minutes (large Python packages). Facial asymmetry requires menpo3d (not in Docker); other features work fully.

---

## Local Development (without Docker)

Use this when you prefer to run backend and frontend directly on your machine. The `scripts/` folder contains setup helpers for the CraniumPy conda environment.

### Prerequisites

- Node.js 18+
- **Anaconda or Miniconda** (required for CraniumPy; [install Miniconda](https://docs.conda.io/en/latest/miniconda.html) if needed)

## Setup CraniumPy Environment

The backend uses CraniumPy (pyvista, pyacvd, pymeshfix, open3d, scikit-learn, scipy, menpo3d, scikit-sparse). Use the automated setup:

```powershell
# From CraniumWeb project root
.\scripts\setup-craniumpy-env.ps1
```

This creates a `CraniumPy` conda environment and installs all dependencies. If `scikit-sparse` fails (common on Windows), install [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (workload: "Desktop development with C++"), then run the script again or see [CraniumPy/README.md](CraniumPy/README.md) for manual steps.

## Quick Start

### Backend

```powershell
conda activate CraniumPy
cd backend
uvicorn main:app --reload --host 0.0.0.0
```

The backend runs on http://localhost:8000

### Frontend (separate terminal)

```powershell
cd frontend
npm install
npm run dev
```

The frontend runs on http://localhost:5173 and proxies API requests to the backend.

## Usage

1. **Import mesh**: File > Import mesh (supports .ply, .obj, .stl)
2. **Landmark selection**: In the Landmark panel, click Nasion, LH tragus, RH tragus, then click on the mesh to pick each point
3. **Register**: Global alignment > (2) Register > Cranial or Facial analysis
4. **Clip**: After registration, use (3) Clip, Repair, Resample
5. **Compute**: Cephalometrics, 2D slice, Evaluate Asymmetry, NICP

## Project Structure

```
CraniumWeb/
├── frontend/         # React + Three.js SPA
├── backend/          # FastAPI + CraniumPy service
├── CraniumPy/        # Vendored from [T-AbdelAlim/CraniumPy](https://github.com/T-AbdelAlim/CraniumPy)
├── scripts/          # Local dev only: setup-craniumpy-env.ps1 for conda
├── docker-compose.yml
└── README.md
```

## API Endpoints

- `POST /api/registration/register` - Register mesh with landmarks
- `POST /api/registration/cranial-cut` - Clip for cranial analysis
- `POST /api/registration/facial-clip` - Clip for facial analysis
- `POST /api/craniometrics` - Extract cephalometric measurements
- `POST /api/nicp` - Non-rigid ICP
- `POST /api/asymmetry` - Facial asymmetry
