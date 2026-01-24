"""
Simple GUI for Medical-SAM3 single-image inference.
Select an image, enter a text prompt, and run segmentation.
"""

import time
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox

import numpy as np
from PIL import Image
import torch

from sam3_inference import SAM3Model, resize_mask


class InferenceGUI:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Medical-SAM3 Inference")
        self.sam3 = None

        self.image_path_var = tk.StringVar()
        self.prompt_var = tk.StringVar()
        self.checkpoint_var = tk.StringVar(
            value=str(Path("C:/Users/asus/Desktop/CLINITO/checkpoint.pt"))
        )
        self.output_var = tk.StringVar()
        self.overlay_var = tk.StringVar()
        self.use_gpu_var = tk.BooleanVar(value=True)

        self._build_ui()

    def _build_ui(self):
        pad = {"padx": 8, "pady": 6}

        tk.Label(self.root, text="Image:").grid(row=0, column=0, sticky="w", **pad)
        tk.Entry(self.root, textvariable=self.image_path_var, width=60).grid(
            row=0, column=1, **pad
        )
        tk.Button(self.root, text="Browse...", command=self._browse_image).grid(
            row=0, column=2, **pad
        )

        tk.Label(self.root, text="Text prompt:").grid(
            row=1, column=0, sticky="w", **pad
        )
        tk.Entry(self.root, textvariable=self.prompt_var, width=60).grid(
            row=1, column=1, **pad
        )

        tk.Label(self.root, text="Checkpoint:").grid(
            row=2, column=0, sticky="w", **pad
        )
        tk.Entry(self.root, textvariable=self.checkpoint_var, width=60).grid(
            row=2, column=1, **pad
        )
        tk.Button(self.root, text="Browse...", command=self._browse_checkpoint).grid(
            row=2, column=2, **pad
        )

        tk.Label(self.root, text="Output mask:").grid(
            row=3, column=0, sticky="w", **pad
        )
        tk.Entry(self.root, textvariable=self.output_var, width=60).grid(
            row=3, column=1, **pad
        )
        tk.Button(self.root, text="Save as...", command=self._browse_output).grid(
            row=3, column=2, **pad
        )

        tk.Label(self.root, text="Output overlay:").grid(
            row=4, column=0, sticky="w", **pad
        )
        tk.Entry(self.root, textvariable=self.overlay_var, width=60).grid(
            row=4, column=1, **pad
        )
        tk.Button(self.root, text="Save as...", command=self._browse_overlay).grid(
            row=4, column=2, **pad
        )

        tk.Checkbutton(self.root, text="Use GPU", variable=self.use_gpu_var).grid(
            row=5, column=1, sticky="w", **pad
        )

        tk.Button(self.root, text="Run Inference", command=self._run).grid(
            row=6, column=1, sticky="e", **pad
        )

    def _browse_image(self):
        path = filedialog.askopenfilename(
            title="Select image",
            filetypes=[("Images", "*.png;*.jpg;*.jpeg;*.bmp;*.tif;*.tiff")],
        )
        if path:
            self.image_path_var.set(path)
            if not self.output_var.get():
                out_path = Path(path).with_suffix("").as_posix() + "_mask.png"
                self.output_var.set(out_path)
            if not self.overlay_var.get():
                overlay_path = (
                    Path(self.output_var.get()).with_name(
                        f"{Path(self.output_var.get()).stem}_overlay.png"
                    ).as_posix()
                )
                self.overlay_var.set(overlay_path)

    def _browse_checkpoint(self):
        path = filedialog.askopenfilename(
            title="Select checkpoint",
            filetypes=[("PyTorch checkpoint", "*.pt;*.pth"), ("All files", "*.*")],
        )
        if path:
            self.checkpoint_var.set(path)

    def _browse_output(self):
        path = filedialog.asksaveasfilename(
            title="Save mask as",
            defaultextension=".png",
            filetypes=[("PNG", "*.png")],
        )
        if path:
            self.output_var.set(path)
            if not self.overlay_var.get():
                overlay_path = (
                    Path(path).with_name(f"{Path(path).stem}_overlay.png").as_posix()
                )
                self.overlay_var.set(overlay_path)

    def _browse_overlay(self):
        path = filedialog.asksaveasfilename(
            title="Save overlay as",
            defaultextension=".png",
            filetypes=[("PNG", "*.png")],
        )
        if path:
            self.overlay_var.set(path)

    def _get_or_create_model(self, checkpoint_path: str, device: str) -> SAM3Model:
        if self.sam3 is None or self.sam3.checkpoint_path != checkpoint_path:
            self.sam3 = SAM3Model(
                confidence_threshold=0.1,
                device=device,
                checkpoint_path=checkpoint_path,
            )
        return self.sam3

    def _run(self):
        image_path = self.image_path_var.get().strip()
        prompt = self.prompt_var.get().strip()
        checkpoint = self.checkpoint_var.get().strip()
        output_path = self.output_var.get().strip()
        overlay_path = self.overlay_var.get().strip()

        if not image_path:
            messagebox.showerror("Error", "Please select an image.")
            return
        if not prompt:
            messagebox.showerror("Error", "Please enter a text prompt.")
            return
        if not checkpoint:
            messagebox.showerror("Error", "Please select a checkpoint.")
            return
        if not output_path:
            output_path = str(Path(image_path).with_suffix("").as_posix() + "_mask.png")
            self.output_var.set(output_path)
        if not overlay_path:
            overlay_path = str(Path(output_path).with_name(
                f"{Path(output_path).stem}_overlay.png"
            ))
            self.overlay_var.set(overlay_path)

        device = "cuda" if self.use_gpu_var.get() else "cpu"
        if device == "cuda" and not torch.cuda.is_available():
            messagebox.showwarning("Warning", "CUDA not available; using CPU.")
            device = "cpu"

        try:
            image = Image.open(image_path).convert("RGB")
            image_np = np.array(image)

            sam3 = self._get_or_create_model(checkpoint, device)

            load_time = None
            if sam3.model is None:
                start_load = time.perf_counter()
                sam3.load_model()
                load_time = time.perf_counter() - start_load

            start = time.perf_counter()
            inference_state = sam3.encode_image(image_np)
            pred_mask = sam3.predict_text(inference_state, prompt)
            infer_time = time.perf_counter() - start

            if pred_mask is None:
                messagebox.showerror("Error", "No mask predicted. Try another prompt.")
                return

            if pred_mask.shape != image_np.shape[:2]:
                pred_mask = resize_mask(pred_mask, image_np.shape[:2])

            mask_img = Image.fromarray((pred_mask > 0).astype(np.uint8) * 255)
            mask_img.save(output_path)
            self._save_overlay(image_np, pred_mask, overlay_path)

            msg = (
                f"Saved mask to:\n{output_path}\n\n"
                f"Saved overlay to:\n{overlay_path}\n\n"
                f"Inference time: {infer_time:.3f}s"
            )
            if load_time is not None:
                msg += f"\nModel load time: {load_time:.3f}s (first run)"
            messagebox.showinfo("Done", msg)
        except Exception as exc:
            messagebox.showerror("Error", str(exc))

    def _save_overlay(self, image_np, mask, output_path):
        base = Image.fromarray(image_np).convert("RGBA")
        overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
        overlay_np = np.array(overlay)
        overlay_np[mask > 0] = (0, 255, 255, int(255 * 0.5))
        overlay = Image.fromarray(overlay_np, mode="RGBA")
        blended = Image.alpha_composite(base, overlay).convert("RGB")
        blended.save(output_path)


def main():
    root = tk.Tk()
    app = InferenceGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
