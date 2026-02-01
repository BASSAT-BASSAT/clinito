"""
Medical-SAM3 FastAPI Server for Railway Deployment
Based on sam3_api.py but adapted for production use with environment variables
"""
import base64
import io
import os
import time
from typing import Optional

import numpy as np
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
import torch

# Import SAM3 inference module
try:
    from inference.sam3_inference import SAM3Model, resize_mask
except ModuleNotFoundError:
    # Fallback for Docker environment
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent))
    from inference.sam3_inference import SAM3Model, resize_mask

app = FastAPI(title="Medical-SAM3 Server", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model instance
MODEL: Optional[SAM3Model] = None

# MedSAM3 checkpoint: use env override or default checkpoint.pt in this directory
DEFAULT_CHECKPOINT = os.path.join(os.path.dirname(__file__), "checkpoint.pt")
CHECKPOINT_PATH = os.environ.get("MEDSAM3_CHECKPOINT_PATH", None)
if CHECKPOINT_PATH is None and os.path.exists(DEFAULT_CHECKPOINT):
    CHECKPOINT_PATH = DEFAULT_CHECKPOINT
    print(f"Using MedSAM3 checkpoint: {CHECKPOINT_PATH}")
DEVICE = os.environ.get("DEVICE", "cpu")  # Default to CPU for Railway


def get_model(checkpoint_path: Optional[str] = None, device: str = "cpu") -> SAM3Model:
    """Get or create SAM3 model instance."""
    global MODEL
    effective_checkpoint = checkpoint_path or CHECKPOINT_PATH
    effective_device = device if device != "cuda" or torch.cuda.is_available() else "cpu"
    
    if MODEL is None or MODEL.checkpoint_path != effective_checkpoint:
        print(f"Loading Medical-SAM3 model (checkpoint: {effective_checkpoint}, device: {effective_device})")
        MODEL = SAM3Model(
            confidence_threshold=0.1,
            device=effective_device,
            checkpoint_path=effective_checkpoint
        )
    return MODEL


def mask_to_data_url(mask: np.ndarray) -> str:
    """Convert mask to base64 data URL."""
    mask_img = Image.fromarray((mask > 0).astype(np.uint8) * 255)
    buf = io.BytesIO()
    mask_img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")


def overlay_to_data_url(image_np: np.ndarray, mask: np.ndarray) -> str:
    """Create overlay image with mask highlighted."""
    base = Image.fromarray(image_np).convert("RGBA")
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    overlay_np = np.array(overlay)
    overlay_np[mask > 0] = (0, 255, 128, 180)  # Green overlay with transparency
    overlay = Image.fromarray(overlay_np, mode="RGBA")
    blended = Image.alpha_composite(base, overlay).convert("RGB")
    buf = io.BytesIO()
    blended.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")


@app.get("/")
async def root():
    """Root endpoint."""
    checkpoint_status = "not found"
    if CHECKPOINT_PATH:
        if os.path.exists(CHECKPOINT_PATH):
            file_size_mb = os.path.getsize(CHECKPOINT_PATH) / (1024 * 1024)
            checkpoint_status = f"loaded ({file_size_mb:.1f} MB)"
        else:
            checkpoint_status = f"specified but not found: {CHECKPOINT_PATH}"
    else:
        checkpoint_status = "default (HuggingFace)"
    
    return {
        "status": "ok",
        "service": "Medical-SAM3 Server",
        "version": "1.0.0",
        "device": DEVICE,
        "checkpoint": checkpoint_status
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "Medical-SAM3 Server",
        "model_loaded": MODEL is not None
    }


@app.post("/segment")
async def segment(
    image: UploadFile = File(...),
    prompt: str = Form(...),
    checkpoint: Optional[str] = Form(None),
    device: Optional[str] = Form(None),
):
    """
    Segment medical image using text prompt.
    
    Args:
        image: Medical image file
        prompt: Text description of what to segment (e.g., "fracture", "tumor")
        checkpoint: Optional checkpoint path (overrides env var)
        device: Optional device ("cpu" or "cuda")
    
    Returns:
        JSON with mask_url, description, confidence, and stats
    """
    try:
        # Determine device
        effective_device = device or DEVICE
        if effective_device == "cuda" and not torch.cuda.is_available():
            effective_device = "cpu"
            print("CUDA not available, using CPU")

        # Read and process image
        content = await image.read()
        image_pil = Image.open(io.BytesIO(content)).convert("RGB")
        image_np = np.array(image_pil)
        
        # Resize if too large (max 1024px for CPU performance)
        max_size = 1024
        if max(image_pil.size) > max_size:
            ratio = max_size / max(image_pil.size)
            new_size = (int(image_pil.size[0] * ratio), int(image_pil.size[1] * ratio))
            image_pil = image_pil.resize(new_size, Image.Resampling.LANCZOS)
            image_np = np.array(image_pil)

        # Get model and run inference
        model = get_model(checkpoint, effective_device)
        start = time.perf_counter()
        inference_state = model.encode_image(image_np)
        pred_mask = model.predict_text(inference_state, prompt)
        inference_time = time.perf_counter() - start

        if pred_mask is None:
            return JSONResponse({
                "success": False,
                "mask_url": None,
                "description": f"No regions detected for '{prompt}'. Try a different prompt.",
                "confidence": 0.2,
                "stats": {"mode": "medical-sam3", "prompt": prompt, "error": "No mask predicted"}
            })

        # Resize mask if needed
        if pred_mask.shape != image_np.shape[:2]:
            pred_mask = resize_mask(pred_mask, image_np.shape[:2])

        # Calculate statistics
        area_px = int(pred_mask.sum())
        total_px = pred_mask.shape[0] * pred_mask.shape[1]
        coverage = (area_px / total_px) * 100
        
        ys, xs = np.where(pred_mask > 0)
        if len(xs) == 0 or len(ys) == 0:
            diameter_px = 0
        else:
            diameter_px = int(max(xs.max() - xs.min(), ys.max() - ys.min()))

        # Create mask and overlay URLs
        mask_data_url = mask_to_data_url(pred_mask)
        overlay_data_url = overlay_to_data_url(image_np, pred_mask)

        # Calculate confidence based on area
        confidence = 0.85 if area_px > 1000 else (0.7 if area_px > 100 else 0.5)

        description = (
            f"🔬 Medical-SAM3 detected '{prompt}'. "
            f"Coverage: {coverage:.1f}% ({area_px} px). Diameter: {diameter_px} px. "
            f"Inference: {inference_time:.2f}s. "
            f"\n\n⚠️ This AI highlights visual features for reference only. "
            f"ALWAYS consult a qualified physician for medical interpretation."
        )

        # Return in format expected by frontend
        return JSONResponse({
            "success": True,
            "mask_url": overlay_data_url,  # Frontend expects overlay, not just mask
            "description": description,
            "confidence": confidence,
            "stats": {
                "mode": "medical-sam3",
                "prompt": prompt,
                "coverage_percent": round(coverage, 2),
                "area_px": area_px,
                "diameter_px": diameter_px,
                "inference_time": round(inference_time, 3),
                "device": effective_device
            }
        })

    except Exception as e:
        print(f"Segmentation error: {e}")
        import traceback
        traceback.print_exc()
        
        return JSONResponse({
            "success": False,
            "mask_url": None,
            "description": f"Error analyzing '{prompt}': {str(e)[:100]}. Please consult a medical professional.",
            "confidence": 0,
            "stats": {"error": str(e)[:200], "mode": "medical-sam3"}
        }, status_code=500)


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
