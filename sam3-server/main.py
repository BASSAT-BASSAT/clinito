"""Medical-SAM3 Segmentation Server"""
import io, base64, sys, time
import numpy as np
from pathlib import Path
from typing import Optional
from PIL import Image
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Add Medical-SAM3 to path
MEDSAM3_ROOT = Path(__file__).resolve().parents[1] / "Medical-SAM3"
sys.path.insert(0, str(MEDSAM3_ROOT / "inference"))

app = FastAPI(title="Medical-SAM3 Segmentation Server", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# Global model instance
MODEL = None

def get_model(device: str = "cuda"):
    """Lazy load Medical-SAM3 model."""
    global MODEL
    if MODEL is None:
        try:
            import torch
            from sam3_inference import SAM3Model
            
            # Use CPU if CUDA not available
            if device == "cuda" and not torch.cuda.is_available():
                device = "cpu"
                print("CUDA not available, using CPU")
            
            MODEL = SAM3Model(confidence_threshold=0.1, device=device)
            print(f"Medical-SAM3 model initialized (device: {device})")
        except Exception as e:
            print(f"Error loading Medical-SAM3: {e}")
            import traceback
            traceback.print_exc()
            MODEL = "DEMO"
    return MODEL

def image_to_base64(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode()

def create_mask_visualization(mask: np.ndarray, color=(0, 255, 128)) -> Image.Image:
    if mask.ndim > 2: 
        mask = mask.squeeze()
    if mask.ndim > 2:
        mask = mask[0]
    h, w = mask.shape
    mask_rgba = np.zeros((h, w, 4), dtype=np.uint8)
    mask_bool = mask > 0.5
    mask_rgba[mask_bool, 0] = color[0]
    mask_rgba[mask_bool, 1] = color[1]
    mask_rgba[mask_bool, 2] = color[2]
    mask_rgba[mask_bool, 3] = 180
    return Image.fromarray(mask_rgba, mode='RGBA')

def resize_mask(mask: np.ndarray, target_shape) -> np.ndarray:
    mask = np.squeeze(mask)
    mask_img = Image.fromarray(mask.astype(np.uint8) * 255)
    mask_resized = mask_img.resize((target_shape[1], target_shape[0]), Image.NEAREST)
    return (np.array(mask_resized) > 127).astype(np.uint8)

@app.get("/")
async def root():
    return {"status": "ok", "service": "Medical-SAM3 Segmentation Server", "version": "2.0.0"}

@app.get("/health")
async def health():
    model = get_model()
    return {
        "status": "ok", 
        "predictor_loaded": model is not None and model != "DEMO",
        "model_type": "Medical-SAM3" if model != "DEMO" else "DEMO"
    }

@app.post("/segment")
async def segment_image(image: UploadFile = File(...), prompt: str = Form(...)):
    model = get_model()
    
    try:
        image_bytes = await image.read()
        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image_np = np.array(pil_image)
        
        # Resize if too large
        max_size = 1024
        if max(pil_image.size) > max_size:
            ratio = max_size / max(pil_image.size)
            new_size = (int(pil_image.size[0] * ratio), int(pil_image.size[1] * ratio))
            pil_image = pil_image.resize(new_size, Image.Resampling.LANCZOS)
            image_np = np.array(pil_image)
        
        # Demo mode fallback
        if model == "DEMO" or model is None:
            w, h = pil_image.size
            y, x = np.ogrid[:h, :w]
            center_x, center_y = w // 2, h // 2
            mask = ((x - center_x) ** 2 / (w//4) ** 2 + (y - center_y) ** 2 / (h//4) ** 2) <= 1
            mask = mask.astype(np.float32)
            
            mask_image = create_mask_visualization(mask)
            mask_base64 = image_to_base64(mask_image)
            mask_url = f"data:image/png;base64,{mask_base64}"
            
            return JSONResponse({
                "success": True,
                "mask_url": mask_url,
                "description": f"⚠️ DEMO MODE: Highlighted region for '{prompt}'. Medical-SAM3 model not loaded.",
                "confidence": 0.5,
                "stats": {"mode": "demo"}
            })
        
        # Medical-SAM3 inference
        start_time = time.perf_counter()
        
        # Encode image and run text-prompted segmentation
        inference_state = model.encode_image(image_np)
        pred_mask = model.predict_text(inference_state, prompt)
        
        inference_time = time.perf_counter() - start_time
        
        if pred_mask is None:
            return JSONResponse({
                "success": True,
                "mask_url": None,
                "description": f"No regions detected for '{prompt}'. Please consult a medical professional.",
                "confidence": 0.3,
                "stats": {"mode": "medical-sam3", "prompt": prompt}
            })
        
        # Resize mask if needed
        if pred_mask.shape != (image_np.shape[0], image_np.shape[1]):
            pred_mask = resize_mask(pred_mask, (image_np.shape[0], image_np.shape[1]))
        
        # Calculate stats
        area_px = int(pred_mask.sum())
        total_px = pred_mask.shape[0] * pred_mask.shape[1]
        coverage = (area_px / total_px) * 100
        
        ys, xs = np.where(pred_mask > 0)
        diameter_px = int(max(xs.max() - xs.min(), ys.max() - ys.min())) if len(xs) > 0 else 0
        
        # Create visualization
        mask_image = create_mask_visualization(pred_mask)
        mask_base64 = image_to_base64(mask_image)
        mask_url = f"data:image/png;base64,{mask_base64}"
        
        description = (
            f"🔬 Medical-SAM3 detected region for '{prompt}'. "
            f"Coverage: {coverage:.1f}% ({area_px} px). Diameter: {diameter_px} px. "
            f"Inference: {inference_time:.2f}s. "
            f"\n\n⚠️ This AI highlights visual features for reference only. "
            f"ALWAYS consult a qualified physician for medical interpretation."
        )
        
        confidence = 0.85 if area_px > 1000 else (0.7 if area_px > 100 else 0.5)
        
        return JSONResponse({
            "success": True,
            "mask_url": mask_url,
            "description": description,
            "confidence": confidence,
            "stats": {
                "mode": "medical-sam3",
                "prompt": prompt,
                "coverage_percent": round(coverage, 2),
                "area_px": area_px,
                "diameter_px": diameter_px,
                "inference_time": round(inference_time, 3)
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
            "confidence": 0.0,
            "stats": {"error": str(e)[:100]}
        })

if __name__ == "__main__":
    import uvicorn
    print("Starting Medical-SAM3 Segmentation Server...")
    print(f"Medical-SAM3 path: {MEDSAM3_ROOT}")
    uvicorn.run(app, host="0.0.0.0", port=8000)
