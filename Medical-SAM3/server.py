"""
Medical-SAM3 FastAPI Server for Railway Deployment
Based on sam3_api.py but adapted for production use with environment variables
Includes classification models for post-segmentation analysis
"""
import base64
import io
import os
import time
from typing import Optional, List, Dict, Any

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

app = FastAPI(title="Medical-SAM3 Server", version="1.1.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model instances
MODEL: Optional[SAM3Model] = None
CLASSIFIERS: Dict[str, Any] = {}

# MedSAM3 checkpoint: use env override or default checkpoint.pt in this directory
DEFAULT_CHECKPOINT = os.path.join(os.path.dirname(__file__), "checkpoint.pt")
CHECKPOINT_PATH = os.environ.get("MEDSAM3_CHECKPOINT_PATH", None)
if CHECKPOINT_PATH is None and os.path.exists(DEFAULT_CHECKPOINT):
    CHECKPOINT_PATH = DEFAULT_CHECKPOINT
    print(f"Using MedSAM3 checkpoint: {CHECKPOINT_PATH}")
DEVICE = os.environ.get("DEVICE", "cpu")  # Default to CPU for Railway

# Classification model configurations
CLASSIFIER_CONFIGS = {
    "auto": {
        "name": "Auto-Detect",
        "description": "Automatically detect modality and use appropriate classifier",
        "labels": []
    },
    "biomedclip": {
        "name": "BiomedCLIP (General)",
        "description": "Zero-shot classification for any medical image",
        "labels": ["tumor", "mass", "nodule", "lesion", "cyst", "inflammation", "fracture", "normal tissue", "abnormal region"]
    },
    "chest_xray": {
        "name": "Chest X-Ray (TorchXRayVision)",
        "description": "14 pathologies: pneumonia, cardiomegaly, nodule, etc.",
        "labels": ["Atelectasis", "Cardiomegaly", "Consolidation", "Edema", "Effusion", 
                   "Emphysema", "Fibrosis", "Hernia", "Infiltration", "Mass", 
                   "Nodule", "Pleural_Thickening", "Pneumonia", "Pneumothorax"]
    },
    "brain_tumor": {
        "name": "Brain MRI Tumor",
        "description": "Classify brain tumors: glioma, meningioma, pituitary",
        "labels": ["glioma", "meningioma", "pituitary tumor", "no tumor"]
    },
    "skin_lesion": {
        "name": "Skin Lesion (Dermoscopy)",
        "description": "Melanoma and skin lesion classification",
        "labels": ["melanoma", "benign keratosis", "basal cell carcinoma", "nevus", "vascular lesion"]
    }
}


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


def get_classifier(classifier_type: str, device: str = "cpu"):
    """Load and cache classification models."""
    global CLASSIFIERS
    
    if classifier_type in CLASSIFIERS:
        return CLASSIFIERS[classifier_type]
    
    print(f"Loading classifier: {classifier_type}")
    
    try:
        if classifier_type == "biomedclip":
            # BiomedCLIP - zero-shot medical image classifier
            try:
                import open_clip
                model, _, preprocess = open_clip.create_model_and_transforms(
                    'hf-hub:microsoft/BiomedCLIP-PubMedBERT_256-vit_base_patch16_224'
                )
                tokenizer = open_clip.get_tokenizer('hf-hub:microsoft/BiomedCLIP-PubMedBERT_256-vit_base_patch16_224')
                model = model.to(device)
                model.eval()
                CLASSIFIERS[classifier_type] = {
                    "model": model,
                    "preprocess": preprocess,
                    "tokenizer": tokenizer,
                    "type": "clip"
                }
            except Exception as e:
                print(f"BiomedCLIP not available: {e}")
                return None
                
        elif classifier_type == "chest_xray":
            # TorchXRayVision for chest X-rays
            try:
                import torchxrayvision as xrv
                model = xrv.models.DenseNet(weights="densenet121-res224-all")
                model = model.to(device)
                model.eval()
                CLASSIFIERS[classifier_type] = {
                    "model": model,
                    "type": "xrv",
                    "labels": xrv.models.model_urls['densenet121-res224-all']['labels']
                }
            except Exception as e:
                print(f"TorchXRayVision not available: {e}")
                return None
                
        elif classifier_type == "brain_tumor":
            # Use BiomedCLIP with brain-specific prompts as fallback
            return get_classifier("biomedclip", device)
            
        elif classifier_type == "skin_lesion":
            # Use BiomedCLIP with skin-specific prompts as fallback
            return get_classifier("biomedclip", device)
            
        else:
            print(f"Unknown classifier type: {classifier_type}")
            return None
            
    except Exception as e:
        print(f"Error loading classifier {classifier_type}: {e}")
        return None
    
    return CLASSIFIERS.get(classifier_type)


def run_classification(image_np: np.ndarray, classifier_type: str, mask: Optional[np.ndarray] = None, custom_labels: Optional[List[str]] = None) -> Dict[str, Any]:
    """Run classification on image or masked region."""
    
    classifier = get_classifier(classifier_type, DEVICE)
    if classifier is None:
        return {
            "success": False,
            "error": f"Classifier '{classifier_type}' not available. Install required packages.",
            "predictions": []
        }
    
    # If mask provided, crop to region of interest
    if mask is not None and mask.sum() > 0:
        ys, xs = np.where(mask > 0)
        if len(xs) > 0 and len(ys) > 0:
            x1, x2 = max(0, xs.min() - 10), min(image_np.shape[1], xs.max() + 10)
            y1, y2 = max(0, ys.min() - 10), min(image_np.shape[0], ys.max() + 10)
            image_np = image_np[y1:y2, x1:x2]
    
    image_pil = Image.fromarray(image_np).convert("RGB")
    
    try:
        if classifier["type"] == "clip":
            # BiomedCLIP zero-shot classification
            labels = custom_labels or CLASSIFIER_CONFIGS.get(classifier_type, {}).get("labels", [])
            if not labels:
                labels = CLASSIFIER_CONFIGS["biomedclip"]["labels"]
            
            preprocess = classifier["preprocess"]
            tokenizer = classifier["tokenizer"]
            model = classifier["model"]
            
            image_tensor = preprocess(image_pil).unsqueeze(0).to(DEVICE)
            text_prompts = [f"a medical image showing {label}" for label in labels]
            text_tokens = tokenizer(text_prompts).to(DEVICE)
            
            with torch.no_grad():
                image_features = model.encode_image(image_tensor)
                text_features = model.encode_text(text_tokens)
                
                image_features = image_features / image_features.norm(dim=-1, keepdim=True)
                text_features = text_features / text_features.norm(dim=-1, keepdim=True)
                
                similarity = (100.0 * image_features @ text_features.T).softmax(dim=-1)
                probs = similarity[0].cpu().numpy()
            
            predictions = [{"label": label, "confidence": float(prob)} for label, prob in zip(labels, probs)]
            predictions.sort(key=lambda x: x["confidence"], reverse=True)
            
            return {
                "success": True,
                "classifier": classifier_type,
                "predictions": predictions[:5],
                "top_prediction": predictions[0] if predictions else None
            }
            
        elif classifier["type"] == "xrv":
            # TorchXRayVision for chest X-rays
            import torchxrayvision as xrv
            
            # Preprocess for XRV (expects grayscale, normalized)
            image_gray = np.array(image_pil.convert("L"))
            image_gray = xrv.datasets.normalize(image_gray, 255)
            
            # Resize to 224x224
            from skimage.transform import resize
            image_resized = resize(image_gray, (224, 224), preserve_range=True)
            
            # Add batch and channel dims
            image_tensor = torch.from_numpy(image_resized).unsqueeze(0).unsqueeze(0).float().to(DEVICE)
            
            model = classifier["model"]
            with torch.no_grad():
                outputs = model(image_tensor)
                probs = torch.sigmoid(outputs)[0].cpu().numpy()
            
            labels = classifier["labels"]
            predictions = [{"label": label, "confidence": float(prob)} for label, prob in zip(labels, probs)]
            predictions.sort(key=lambda x: x["confidence"], reverse=True)
            
            return {
                "success": True,
                "classifier": "chest_xray",
                "predictions": predictions[:5],
                "top_prediction": predictions[0] if predictions else None
            }
            
    except Exception as e:
        print(f"Classification error: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "predictions": []
        }
    
    return {"success": False, "error": "Unknown classifier type", "predictions": []}


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


@app.get("/classifiers")
async def list_classifiers():
    """List available classification models."""
    return {
        "classifiers": [
            {
                "id": key,
                "name": config["name"],
                "description": config["description"],
                "labels": config["labels"]
            }
            for key, config in CLASSIFIER_CONFIGS.items()
        ]
    }


@app.post("/classify")
async def classify(
    image: UploadFile = File(...),
    classifier: str = Form("biomedclip"),
    custom_labels: Optional[str] = Form(None),
):
    """
    Classify medical image using selected classifier.
    
    Args:
        image: Medical image file
        classifier: Classifier type (biomedclip, chest_xray, brain_tumor, skin_lesion)
        custom_labels: Comma-separated custom labels for zero-shot (BiomedCLIP only)
    
    Returns:
        JSON with predictions sorted by confidence
    """
    try:
        # Read and process image
        content = await image.read()
        image_pil = Image.open(io.BytesIO(content)).convert("RGB")
        image_np = np.array(image_pil)
        
        # Resize if too large
        max_size = 512
        if max(image_pil.size) > max_size:
            ratio = max_size / max(image_pil.size)
            new_size = (int(image_pil.size[0] * ratio), int(image_pil.size[1] * ratio))
            image_pil = image_pil.resize(new_size, Image.Resampling.LANCZOS)
            image_np = np.array(image_pil)
        
        # Parse custom labels if provided
        labels = None
        if custom_labels:
            labels = [l.strip() for l in custom_labels.split(",") if l.strip()]
        
        # Run classification
        start = time.perf_counter()
        result = run_classification(image_np, classifier, mask=None, custom_labels=labels)
        inference_time = time.perf_counter() - start
        
        result["inference_time"] = round(inference_time, 3)
        result["device"] = DEVICE
        
        return JSONResponse(result)
        
    except Exception as e:
        print(f"Classification error: {e}")
        import traceback
        traceback.print_exc()
        
        return JSONResponse({
            "success": False,
            "error": str(e)[:200],
            "predictions": []
        }, status_code=500)


@app.post("/segment_and_classify")
async def segment_and_classify(
    image: UploadFile = File(...),
    prompt: str = Form(...),
    classifier: str = Form("biomedclip"),
    custom_labels: Optional[str] = Form(None),
):
    """
    Segment image with SAM3 then classify the segmented region.
    
    This is the full pipeline: segment first, then classify the detected region.
    """
    try:
        # Read and process image
        content = await image.read()
        image_pil = Image.open(io.BytesIO(content)).convert("RGB")
        image_np = np.array(image_pil)
        
        # Resize if too large
        max_size = 1024
        if max(image_pil.size) > max_size:
            ratio = max_size / max(image_pil.size)
            new_size = (int(image_pil.size[0] * ratio), int(image_pil.size[1] * ratio))
            image_pil = image_pil.resize(new_size, Image.Resampling.LANCZOS)
            image_np = np.array(image_pil)
        
        # Step 1: Segment with SAM3
        model = get_model(None, DEVICE)
        start_seg = time.perf_counter()
        inference_state = model.encode_image(image_np)
        pred_mask = model.predict_text(inference_state, prompt)
        seg_time = time.perf_counter() - start_seg
        
        if pred_mask is None:
            return JSONResponse({
                "success": False,
                "mask_url": None,
                "description": f"No regions detected for '{prompt}'",
                "classification": None
            })
        
        # Resize mask if needed
        if pred_mask.shape != image_np.shape[:2]:
            pred_mask = resize_mask(pred_mask, image_np.shape[:2])
        
        # Step 2: Classify the segmented region
        labels = None
        if custom_labels:
            labels = [l.strip() for l in custom_labels.split(",") if l.strip()]
        
        start_cls = time.perf_counter()
        classification = run_classification(image_np, classifier, mask=pred_mask, custom_labels=labels)
        cls_time = time.perf_counter() - start_cls
        
        # Create overlay
        overlay_data_url = overlay_to_data_url(image_np, pred_mask)
        
        # Calculate stats
        area_px = int(pred_mask.sum())
        total_px = pred_mask.shape[0] * pred_mask.shape[1]
        coverage = (area_px / total_px) * 100
        
        # Build description
        top_pred = classification.get("top_prediction")
        if top_pred:
            classification_text = f"Classification: {top_pred['label']} ({top_pred['confidence']*100:.1f}% confidence)"
        else:
            classification_text = "Classification: Unable to classify region"
        
        description = (
            f"🔬 SAM3 detected '{prompt}' (coverage: {coverage:.1f}%). "
            f"\n\n🏷️ {classification_text}"
            f"\n\n⚠️ AI analysis for reference only. Consult a physician."
        )
        
        return JSONResponse({
            "success": True,
            "mask_url": overlay_data_url,
            "description": description,
            "confidence": classification.get("top_prediction", {}).get("confidence", 0.5),
            "classification": classification,
            "stats": {
                "mode": "segment_and_classify",
                "prompt": prompt,
                "classifier": classifier,
                "coverage_percent": round(coverage, 2),
                "area_px": area_px,
                "segmentation_time": round(seg_time, 3),
                "classification_time": round(cls_time, 3),
                "device": DEVICE
            }
        })
        
    except Exception as e:
        print(f"Segment+Classify error: {e}")
        import traceback
        traceback.print_exc()
        
        return JSONResponse({
            "success": False,
            "error": str(e)[:200]
        }, status_code=500)


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
