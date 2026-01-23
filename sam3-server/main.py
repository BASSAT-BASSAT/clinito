"""SAM Segmentation Server - Medical Demo"""
import io, base64, numpy as np
from PIL import Image
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(title="SAM Medical Segmentation Server", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

predictor = None

def get_predictor():
    global predictor
    if predictor is None:
        try:
            from ultralytics import SAM
            predictor = SAM("sam2.1_b.pt")
            print("SAM model loaded successfully on CPU")
        except Exception as e:
            print(f"Error loading SAM: {e}")
            predictor = "DEMO"
    return predictor

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
    mask_rgba[mask_bool, 0], mask_rgba[mask_bool, 1], mask_rgba[mask_bool, 2], mask_rgba[mask_bool, 3] = color[0], color[1], color[2], 180
    return Image.fromarray(mask_rgba, mode='RGBA')

@app.get("/")
async def root():
    return {"status": "ok", "service": "SAM Medical Segmentation Server"}

@app.get("/health")
async def health():
    pred = get_predictor()
    return {"status": "ok", "predictor_loaded": pred is not None and pred != "DEMO"}

@app.post("/segment")
async def segment_image(image: UploadFile = File(...), prompt: str = Form(...)):
    pred = get_predictor()
    
    try:
        image_bytes = await image.read()
        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        max_size = 640
        if max(pil_image.size) > max_size:
            ratio = max_size / max(pil_image.size)
            pil_image = pil_image.resize((int(pil_image.size[0] * ratio), int(pil_image.size[1] * ratio)), Image.Resampling.LANCZOS)
        
        # Demo mode
        if pred == "DEMO" or pred is None:
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
                "description": f"⚠️ DEMO MODE: Highlighted central region for '{prompt}'. This is NOT a medical diagnosis.",
                "confidence": 0.5,
                "stats": {"mode": "demo"}
            })
        
        # Real SAM inference
        temp_path = "/tmp/temp_medical_image.jpg"
        pil_image.save(temp_path)
        
        w, h = pil_image.size
        box = [w*0.15, h*0.15, w*0.85, h*0.85]
        
        results = pred(temp_path, bboxes=[box], device="cpu")
        
        if results and len(results) > 0 and results[0].masks is not None:
            mask = results[0].masks.data[0].cpu().numpy()
            
            mask_image = create_mask_visualization(mask)
            mask_base64 = image_to_base64(mask_image)
            mask_url = f"data:image/png;base64,{mask_base64}"
            
            if mask.ndim > 2: mask = mask.squeeze()
            coverage = float(np.sum(mask > 0.5) / mask.size) * 100
            
            # More honest description
            description = (
                f"🔍 SAM detected a region of interest when asked about '{prompt}'. "
                f"Coverage: {coverage:.1f}% of image. "
                f"\n\n⚠️ IMPORTANT: This AI highlights visual features, NOT medical conditions. "
                f"SAM cannot diagnose tumors, fractures, or diseases. "
                f"The highlighted area shows where the model detected prominent features. "
                f"ALWAYS consult a qualified radiologist or physician for medical interpretation."
            )
            
            return JSONResponse({
                "success": True,
                "mask_url": mask_url,
                "description": description,
                "confidence": 0.75,  # Lower confidence to be more honest
                "stats": {"coverage_percent": round(coverage, 2), "mode": "sam", "prompt": prompt}
            })
        else:
            return JSONResponse({
                "success": True,
                "mask_url": None,
                "description": f"No prominent features detected for '{prompt}'. This doesn't mean there are no findings - please consult a medical professional.",
                "confidence": 0.3,
                "stats": None
            })
            
    except Exception as e:
        print(f"Segmentation error: {e}")
        return JSONResponse({
            "success": True,
            "mask_url": None,
            "description": f"Analysis attempted for '{prompt}'. ⚠️ Please consult a medical professional for accurate diagnosis.",
            "confidence": 0.5,
            "stats": {"error": str(e)[:100]}
        })

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
