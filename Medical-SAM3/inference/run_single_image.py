"""
Run Medical-SAM3/SAM3 inference on a single image.
Supports text prompt or box prompt input.
"""

import argparse
from pathlib import Path

import numpy as np
from PIL import Image
import torch

from sam3_inference import SAM3Model, resize_mask


def parse_box(box_str: str):
    parts = [p.strip() for p in box_str.split(",")]
    if len(parts) != 4:
        raise ValueError("Box must be 'x_min,y_min,x_max,y_max'")
    return tuple(int(p) for p in parts)


def save_mask(mask: np.ndarray, output_path: Path):
    mask_img = Image.fromarray((mask > 0).astype(np.uint8) * 255)
    mask_img.save(output_path)


def save_overlay(
    image_np: np.ndarray,
    mask: np.ndarray,
    output_path: Path,
    color=(0, 255, 255),
    alpha=0.5,
):
    base = Image.fromarray(image_np).convert("RGBA")
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    overlay_np = np.array(overlay)
    overlay_np[mask > 0] = (*color, int(255 * alpha))
    overlay = Image.fromarray(overlay_np, mode="RGBA")
    blended = Image.alpha_composite(base, overlay).convert("RGB")
    blended.save(output_path)


def main():
    parser = argparse.ArgumentParser(
        description="Run Medical-SAM3/SAM3 inference on a single image."
    )
    parser.add_argument("--image", required=True, help="Path to input image")
    parser.add_argument(
        "--checkpoint",
        default=None,
        help="Path to model checkpoint (e.g., checkpoint.pt). If omitted, uses HF.",
    )
    parser.add_argument(
        "--text",
        default=None,
        help="Text prompt for segmentation (e.g., 'brain')",
    )
    parser.add_argument(
        "--box",
        default=None,
        help="Box prompt as 'x_min,y_min,x_max,y_max'",
    )
    parser.add_argument(
        "--output",
        default="mask.png",
        help="Output mask path (png)",
    )
    parser.add_argument(
        "--overlay",
        default=None,
        help="Output overlay path (png). Defaults to *_overlay.png",
    )
    parser.add_argument(
        "--device",
        default="cuda",
        choices=["cuda", "cpu"],
        help="Device to use",
    )
    parser.add_argument(
        "--confidence",
        type=float,
        default=0.1,
        help="Confidence threshold",
    )

    args = parser.parse_args()

    if args.text is None and args.box is None:
        raise SystemExit("Please provide --text or --box for inference.")

    if args.device == "cuda" and not torch.cuda.is_available():
        print("CUDA not available, switching to CPU.")
        args.device = "cpu"

    image_path = Path(args.image)
    output_path = Path(args.output)

    image = Image.open(image_path).convert("RGB")
    image_np = np.array(image)

    sam3 = SAM3Model(
        confidence_threshold=args.confidence,
        device=args.device,
        checkpoint_path=args.checkpoint,
    )

    inference_state = sam3.encode_image(image_np)

    pred_mask = None
    if args.text:
        pred_mask = sam3.predict_text(inference_state, args.text)
    elif args.box:
        bbox = parse_box(args.box)
        pred_mask = sam3.predict_box(inference_state, bbox, image_np.shape[:2])

    if pred_mask is None:
        raise SystemExit("No mask predicted. Try a different prompt.")

    if pred_mask.shape != image_np.shape[:2]:
        pred_mask = resize_mask(pred_mask, image_np.shape[:2])

    save_mask(pred_mask, output_path)
    overlay_path = Path(args.overlay) if args.overlay else output_path.with_name(
        f"{output_path.stem}_overlay.png"
    )
    save_overlay(image_np, pred_mask, overlay_path)
    print(f"Saved mask to: {output_path}")
    print(f"Saved overlay to: {overlay_path}")


if __name__ == "__main__":
    main()
