# Medical-SAM3 Deployment Guide

This guide covers deploying Medical-SAM3 as a Docker container to Railway.

## Prerequisites

- Docker installed locally (for testing)
- Railway account (free tier works)
- Medical-SAM3 checkpoint file: `checkpoint.pt` in the `Medical-SAM3/` directory
  - If checkpoint.pt exists, it will be used automatically
  - If not found, will fall back to base SAM3 from HuggingFace

## Local Testing

Before deploying, test locally:

```bash
# Activate your environment
# Windows:
clinito-env\Scripts\activate

# Run tests
cd Medical-SAM3
python test_medsam3_local.py
```

## Docker Build

Build the Docker image locally:

```bash
cd Medical-SAM3
docker build -t medsam3-server:latest .
```

Test the container:

```bash
docker run -d \
  --name medsam3-test \
  -p 8000:8000 \
  -e PORT=8000 \
  -e DEVICE=cpu \
  medsam3-test:latest

# Test health endpoint
curl http://localhost:8000/health

# Stop container
docker stop medsam3-test
docker rm medsam3-test
```

## Railway Deployment

### Step 1: Create Railway Project

1. Go to [Railway](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. **Important**: Set the **Root Directory** to `Medical-SAM3`

### Step 2: Configure Environment Variables

In Railway dashboard, go to your service → Variables tab, add:

- `PORT` - Railway sets this automatically (don't override)
- `DEVICE` - Set to `cpu` (default, for CPU-only deployment)
- `MEDSAM3_CHECKPOINT_PATH` - (Optional) Override checkpoint path. Default: `/app/checkpoint.pt` (automatically detected if checkpoint.pt is in Medical-SAM3 directory)

### Step 3: Upload Checkpoint (Optional)

If you have a Medical-SAM3 checkpoint file:

1. Upload it to Railway as a file or volume
2. Set `MEDSAM3_CHECKPOINT_PATH` to the file path
3. Or download from external source during container startup

### Step 4: Deploy

Railway will automatically:
1. Build the Docker image from `Dockerfile`
2. Install all dependencies
3. Start the server on the port Railway provides

### Step 5: Get Public URL

1. Go to Settings → Networking
2. Click "Generate Domain"
3. You'll get a URL like: `medsam3-server-production.up.railway.app`

## Updating Frontend

Update your Next.js app to use the new Medical-SAM3 server:

1. Set environment variable in Vercel:
   ```
   SAM3_SERVER_URL=https://your-medsam3-railway-url.up.railway.app
   ```

2. Or update `src/app/api/sam3/segment/route.ts`:
   ```typescript
   const RAILWAY_SAM3_URL = process.env.SAM3_SERVER_URL || 'https://your-medsam3-railway-url.up.railway.app';
   ```

## API Endpoints

### Health Check
```
GET /health
```
Returns: `{"status": "ok", "service": "Medical-SAM3 Server", "model_loaded": true}`

### Root
```
GET /
```
Returns service information

### Segment
```
POST /segment
Content-Type: multipart/form-data

Form fields:
- image: File (medical image)
- prompt: string (e.g., "fracture", "tumor")
- checkpoint: string (optional, overrides env var)
- device: string (optional, "cpu" or "cuda")
```

Response:
```json
{
  "success": true,
  "mask_url": "data:image/png;base64,...",
  "description": "🔬 Medical-SAM3 detected...",
  "confidence": 0.85,
  "stats": {
    "mode": "medical-sam3",
    "prompt": "fracture",
    "coverage_percent": 12.5,
    "area_px": 4096,
    "diameter_px": 128,
    "inference_time": 5.23,
    "device": "cpu"
  }
}
```

## Performance Notes

- **CPU-only deployment**: Inference takes 5-30 seconds per image
- **Model loading**: First request takes longer (~30-60s) as model loads
- **Image size**: Images are automatically resized to max 1024px for CPU performance
- **Memory**: Container needs at least 4GB RAM for model loading

## Troubleshooting

### Container fails to start
- Check Railway logs for errors
- Verify all dependencies are in `requirements-full.txt`
- Ensure PyTorch CPU version is installed correctly

### Model loading fails
- Check if checkpoint path is correct (if using custom checkpoint)
- Verify HuggingFace access (for default model)
- Check container has enough memory

### Slow inference
- This is expected on CPU-only deployment
- Consider Railway GPU tier for faster inference
- Reduce image size further if needed

### API returns errors
- Check that image format is supported (PNG, JPEG)
- Verify prompt is not empty
- Check Railway logs for detailed error messages

## GitHub Actions

Integration tests run automatically on push to:
- `main`
- `deployment-testing`
- `doctor-assistant-full-database`

Tests include:
- Docker build verification
- Container startup
- Health endpoint
- Segment endpoint (with test image)

View results in the "Actions" tab on GitHub.
