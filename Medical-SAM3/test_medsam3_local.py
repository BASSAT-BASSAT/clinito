"""
Local testing script for Medical-SAM3 before deployment.
Tests model loading, inference, and API endpoints.
"""
import os
import sys
import io
import time
from pathlib import Path
import numpy as np
from PIL import Image

# Add paths
MEDSAM3_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(MEDSAM3_ROOT / "inference"))

def test_imports():
    """Test that all required modules can be imported."""
    print("=" * 60)
    print("TEST 1: Module Imports")
    print("=" * 60)
    try:
        from sam3_inference import SAM3Model, resize_mask
        print("✓ Successfully imported SAM3Model and resize_mask")
        return True
    except ImportError as e:
        print(f"✗ Failed to import: {e}")
        return False

def test_model_loading(checkpoint_path=None):
    """Test model loading with and without checkpoint."""
    print("\n" + "=" * 60)
    print("TEST 2: Model Loading")
    print("=" * 60)
    try:
        from sam3_inference import SAM3Model
        import torch
        
        device = "cpu"  # Test with CPU
        print(f"Loading model (device: {device}, checkpoint: {checkpoint_path or 'default'})...")
        
        model = SAM3Model(
            confidence_threshold=0.1,
            device=device,
            checkpoint_path=checkpoint_path
        )
        
        # Trigger model loading
        print("Triggering model load...")
        model.load_model()
        print("✓ Model loaded successfully")
        return True, model
    except Exception as e:
        print(f"✗ Model loading failed: {e}")
        import traceback
        traceback.print_exc()
        return False, None

def test_image_encoding(model, test_image_path=None):
    """Test image encoding."""
    print("\n" + "=" * 60)
    print("TEST 3: Image Encoding")
    print("=" * 60)
    try:
        # Create a test image if none provided
        if test_image_path and os.path.exists(test_image_path):
            from PIL import Image
            pil_image = Image.open(test_image_path).convert("RGB")
            image_np = np.array(pil_image)
        else:
            # Create a dummy test image
            print("Creating dummy test image (256x256)...")
            image_np = np.random.randint(0, 255, (256, 256, 3), dtype=np.uint8)
        
        print(f"Image shape: {image_np.shape}")
        print("Encoding image...")
        inference_state = model.encode_image(image_np)
        print("✓ Image encoded successfully")
        print(f"  Inference state keys: {list(inference_state.keys())}")
        return True, inference_state, image_np
    except Exception as e:
        print(f"✗ Image encoding failed: {e}")
        import traceback
        traceback.print_exc()
        return False, None, None

def test_text_inference(model, inference_state, image_np, prompt="test region"):
    """Test text prompt inference."""
    print("\n" + "=" * 60)
    print("TEST 4: Text Prompt Inference")
    print("=" * 60)
    try:
        print(f"Running inference with prompt: '{prompt}'...")
        start_time = time.perf_counter()
        pred_mask = model.predict_text(inference_state, prompt)
        inference_time = time.perf_counter() - start_time
        
        if pred_mask is None:
            print("⚠ No mask predicted (this may be normal for dummy images)")
            return True, None
        
        print(f"✓ Inference completed in {inference_time:.2f}s")
        print(f"  Mask shape: {pred_mask.shape}")
        print(f"  Mask dtype: {pred_mask.dtype}")
        print(f"  Mask sum (pixels): {pred_mask.sum()}")
        return True, pred_mask
    except Exception as e:
        print(f"✗ Text inference failed: {e}")
        import traceback
        traceback.print_exc()
        return False, None

def test_api_endpoint():
    """Test FastAPI endpoint (if server is running)."""
    print("\n" + "=" * 60)
    print("TEST 5: API Endpoint (requires server running)")
    print("=" * 60)
    try:
        import httpx
        
        # Create a test image
        test_image = Image.new("RGB", (256, 256), color="red")
        buffer = io.BytesIO()
        test_image.save(buffer, format="PNG")
        image_bytes = buffer.getvalue()
        
        print("Testing /health endpoint...")
        try:
            response = httpx.get("http://localhost:8000/health", timeout=5.0)
            if response.status_code == 200:
                print(f"✓ Health check passed: {response.json()}")
            else:
                print(f"⚠ Health check returned {response.status_code}")
        except Exception as e:
            print(f"⚠ Health check failed (server may not be running): {e}")
            return False
        
        print("\nTesting /segment endpoint...")
        try:
            files = {"image": ("test.png", image_bytes, "image/png")}
            data = {"prompt": "test"}
            response = httpx.post(
                "http://localhost:8000/segment",
                files=files,
                data=data,
                timeout=120.0
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✓ Segment endpoint successful")
                print(f"  Success: {result.get('success')}")
                print(f"  Has mask_url: {result.get('mask_url') is not None}")
                return True
            else:
                print(f"✗ Segment endpoint failed: {response.status_code}")
                print(f"  Response: {response.text[:200]}")
                return False
        except Exception as e:
            print(f"⚠ Segment endpoint test failed: {e}")
            return False
            
    except ImportError:
        print("⚠ httpx not available, skipping API tests")
        return None
    except Exception as e:
        print(f"⚠ API test error: {e}")
        return None

def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("Medical-SAM3 Local Testing")
    print("=" * 60)
    
    # Check for checkpoint path
    checkpoint_path = os.environ.get("MEDSAM3_CHECKPOINT_PATH", None)
    
    # If no env var, check for default checkpoint location
    if checkpoint_path is None:
        default_checkpoint = os.path.join(os.path.dirname(__file__), "checkpoint.pt")
        if os.path.exists(default_checkpoint):
            checkpoint_path = default_checkpoint
            print(f"Found default checkpoint: {checkpoint_path}")
    
    if checkpoint_path:
        print(f"Using checkpoint: {checkpoint_path}")
        if not os.path.exists(checkpoint_path):
            print(f"⚠ Warning: Checkpoint file not found: {checkpoint_path}")
            checkpoint_path = None
        else:
            file_size = os.path.getsize(checkpoint_path) / (1024 * 1024)  # Size in MB
            print(f"  Checkpoint size: {file_size:.2f} MB")
    else:
        print("No checkpoint specified, using default SAM3 from HuggingFace")
    
    # Run tests
    results = {}
    
    # Test 1: Imports
    results['imports'] = test_imports()
    if not results['imports']:
        print("\n✗ Cannot continue - imports failed")
        return False
    
    # Test 2: Model loading
    results['model_loading'], model = test_model_loading(checkpoint_path)
    if not results['model_loading'] or model is None:
        print("\n✗ Cannot continue - model loading failed")
        return False
    
    # Test 3: Image encoding
    results['image_encoding'], inference_state, image_np = test_image_encoding(model)
    if not results['image_encoding']:
        print("\n✗ Cannot continue - image encoding failed")
        return False
    
    # Test 4: Text inference
    results['text_inference'], pred_mask = test_text_inference(
        model, inference_state, image_np, prompt="test"
    )
    if not results['text_inference']:
        print("\n⚠ Text inference failed, but this may be acceptable")
    
    # Test 5: API endpoint (optional)
    results['api_endpoint'] = test_api_endpoint()
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    for test_name, result in results.items():
        status = "✓ PASS" if result is True else "✗ FAIL" if result is False else "⚠ SKIP"
        print(f"{test_name:20s}: {status}")
    
    all_passed = all(r for r in results.values() if r is not None)
    print("\n" + "=" * 60)
    if all_passed:
        print("✓ All critical tests passed!")
        return True
    else:
        print("⚠ Some tests failed or were skipped")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
