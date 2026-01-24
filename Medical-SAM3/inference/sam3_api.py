"""
FastAPI wrapper for Medical-SAM3 inference.
POST /segment with multipart form-data: image + prompt.
Returns overlay, mask, and short summary.
"""

import base64
import io
import time
from pathlib import Path
from typing import Optional

import numpy as np
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image
import torch

try:
    from inference.sam3_inference import SAM3Model, resize_mask
except ModuleNotFoundError:
    from sam3_inference import SAM3Model, resize_mask


app = FastAPI()

MODEL: Optional[SAM3Model] = None


def get_model(checkpoint_path: Optional[str], device: str) -> SAM3Model:
    global MODEL
    if MODEL is None or MODEL.checkpoint_path != checkpoint_path:
        MODEL = SAM3Model(confidence_threshold=0.1, device=device, checkpoint_path=checkpoint_path)
    return MODEL


def mask_to_data_url(mask: np.ndarray) -> str:
    mask_img = Image.fromarray((mask > 0).astype(np.uint8) * 255)
    buf = io.BytesIO()
    mask_img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")


def overlay_to_data_url(image_np: np.ndarray, mask: np.ndarray) -> str:
    base = Image.fromarray(image_np).convert("RGBA")
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    overlay_np = np.array(overlay)
    overlay_np[mask > 0] = (0, 255, 255, int(255 * 0.5))
    overlay = Image.fromarray(overlay_np, mode="RGBA")
    blended = Image.alpha_composite(base, overlay).convert("RGB")
    buf = io.BytesIO()
    blended.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")


def summarize(prompt: str, area_px: int, diameter_px: int) -> str:
    return (
        f"Detected \"{prompt}\" with area {area_px} px². "
        f"Estimated diameter {diameter_px} px."
    )


@app.post("/segment")
async def segment(
    image: UploadFile = File(...),
    prompt: str = Form(...),
    checkpoint: Optional[str] = Form(None),
    device: str = Form("cuda"),
):
    if device == "cuda" and not torch.cuda.is_available():
        device = "cpu"

    content = await image.read()
    image_pil = Image.open(io.BytesIO(content)).convert("RGB")
    image_np = np.array(image_pil)

    model = get_model(checkpoint, device)
    start = time.perf_counter()
    inference_state = model.encode_image(image_np)
    pred_mask = model.predict_text(inference_state, prompt)
    inference_time = time.perf_counter() - start

    if pred_mask is None:
        return JSONResponse({"error": "No mask predicted."}, status_code=400)

    if pred_mask.shape != image_np.shape[:2]:
        pred_mask = resize_mask(pred_mask, image_np.shape[:2])

    area_px = int(pred_mask.sum())
    ys, xs = np.where(pred_mask > 0)
    if len(xs) == 0 or len(ys) == 0:
        diameter_px = 0
    else:
        diameter_px = int(max(xs.max() - xs.min(), ys.max() - ys.min()))

    mask_data_url = mask_to_data_url(pred_mask)
    overlay_data_url = overlay_to_data_url(image_np, pred_mask)

    payload = {
        "maskDataUrl": mask_data_url,
        "overlayDataUrl": overlay_data_url,
        "summary": summarize(prompt, area_px, diameter_px),
        "metrics": {
            "areaPx": area_px,
            "diameterPx": diameter_px,
            "confidence": "High",
            "issueSize": "Moderate",
            "inferenceTimeSec": round(inference_time, 3),
        },
    }
    return JSONResponse(payload)
