"""
CraniumWeb Backend - FastAPI server for CraniumPy mesh processing.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import mesh, registration, craniometrics, nicp, asymmetry

app = FastAPI(
    title="CraniumWeb API",
    description="REST API for craniofacial mesh registration and analysis",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(mesh.router)
app.include_router(registration.router)
app.include_router(craniometrics.router)
app.include_router(nicp.router)
app.include_router(asymmetry.router)


@app.get("/")
def root():
    return {"message": "CraniumWeb API", "docs": "/docs"}


@app.get("/api/health")
def health():
    return {"status": "ok"}
