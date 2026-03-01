# CraniumWeb Backend - CraniumPy + FastAPI
# Build context: project root (docker-compose sets this)
# Python 3.8 + Debian for SuiteSparse (libsuitesparse-dev)
# Use amd64 for wheel availability (pymeshfix, open3d, scikit-sparse)
FROM --platform=linux/amd64 python:3.8-slim-bookworm

ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Install system deps: SuiteSparse for scikit-sparse, build tools,
# libX11/libGL for open3d headless (loads native libs that link against X11)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsuitesparse-dev \
    build-essential \
    libx11-6 \
    libgl1-mesa-glx \
    libgl1 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy CraniumPy (algorithm library) and backend
COPY CraniumPy /app/CraniumPy
COPY backend /app/backend

# Install pip deps (numpy first; scikit-sparse uses system SuiteSparse)
ENV SUITESPARSE_INCLUDE_DIR=/usr/include/suitesparse
ENV SUITESPARSE_LIBRARY_DIR=/usr/lib/x86_64-linux-gnu

RUN pip install --no-cache-dir numpy \
    && pip install --no-cache-dir -r /app/backend/requirements-docker.txt \
    && pip install --no-cache-dir scikit-sparse \
    && pip install --no-cache-dir fastapi "uvicorn[standard]" python-multipart

WORKDIR /app/backend

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
