# Medical-SAM3 Docker Image for Railway Deployment (CPU-only)
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies including wget/curl for downloads
RUN apt-get update && apt-get install -y \
    git \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install typing-extensions from PyPI first (fixes PyTorch CPU index issue)
RUN pip install --no-cache-dir "typing-extensions>=4.10.0"

# Install huggingface_hub for model downloads
RUN pip install --no-cache-dir huggingface_hub

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

# Download checkpoint from HuggingFace during build
# Medical-SAM3 weights (~9.5GB) - this will make the image large but avoids runtime downloads
RUN python -c "from huggingface_hub import hf_hub_download; hf_hub_download(repo_id='Chongcong/Medical-SAM3', filename='checkpoint.pt', local_dir='/app')"

# Copy server file (must be after inference/ to resolve imports)
COPY server.py /app/server.py

# Expose port (Railway will set PORT env var)
ENV PORT=8000
EXPOSE 8000

# Run server
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
