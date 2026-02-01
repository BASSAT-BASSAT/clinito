# Medical-SAM3 Docker Image for Railway Deployment (CPU-only)
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install typing-extensions from PyPI first (fixes PyTorch CPU index issue)
RUN pip install --no-cache-dir "typing-extensions>=4.10.0"

# Install typing-extensions from PyPI first (fixes PyTorch CPU index issue)
RUN pip install --no-cache-dir "typing-extensions>=4.10.0"

# Install PyTorch CPU-only version
RUN pip install --no-cache-dir torch==2.10.0 torchvision==0.25.0 --index-url https://download.pytorch.org/whl/cpu

# Copy requirements and install Python dependencies
COPY requirements-full.txt /app/requirements-full.txt
RUN pip install --no-cache-dir -r requirements-full.txt

# Install SAM3 from source (already in the repo)
# The sam3 directory is part of Medical-SAM3
COPY sam3/ /app/sam3/
RUN cd /app/sam3 && pip install -e .

# Copy Medical-SAM3 inference code
COPY inference/ /app/inference/

# Copy checkpoint file (Medical-SAM3 weights)
# WARNING: Checkpoint is ~9.5 GB - Docker image will be ~10+ GB
# This file must exist in Medical-SAM3/ directory before building
COPY checkpoint.pt /app/checkpoint.pt

# Copy server file (must be after inference/ to resolve imports)
COPY server.py /app/server.py

# Expose port (Railway will set PORT env var)
ENV PORT=8000
EXPOSE 8000

# Run server
CMD uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}
