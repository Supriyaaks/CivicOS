import json
import time
from pathlib import Path
from typing import List, Dict, Any, Optional
from ultralytics import YOLO

class LitterDetector:
    """
    LitterDetector handles object detection for litter using the Mini-TACO50 trained model.
    """
    def __init__(self, checkpoint_path: Optional[str] = None):
        # Default path if none provided
        if checkpoint_path is None:
            checkpoint_path = "ai_engine/runs/litter_detection/mini_taco50/weights/best.pt"

        self.checkpoint_path = checkpoint_path
        self.model = self._load_model()
        self.class_mapping = {0: "Litter"}

    def _load_model(self):
        try:
            if not Path(self.checkpoint_path).exists():
                print(f"Warning: Litter model checkpoint not found at {self.checkpoint_path}")
                return None
            return YOLO(self.checkpoint_path)
        except Exception as e:
            print(f"Error loading litter model: {e}")
            return None

    def detect(self, image_path: str) -> Dict[str, Any]:
        """
        Detects litter objects in the provided image.
        """
        if self.model is None:
            return {"status": "error", "message": "Litter model not loaded", "detections": []}

        if not Path(image_path).exists():
            return {"status": "error", "message": f"Image path not found: {image_path}", "detections": []}

        try:
            start_time = time.time()
            # Run inference
            results = self.model.predict(source=image_path, conf=0.25, verbose=False)
            inference_time = (time.time() - start_time) * 1000 # ms

            detections = []
            result = results[0]

            for box in result.boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                coords = box.xyxy[0].tolist() # [x1, y1, x2, y2]

                detections.append({
                    "category": self.class_mapping.get(cls_id, "Unknown"),
                    "confidence": conf,
                    "bbox": coords,
                    "class_id": cls_id
                })

            return {
                "status": "success",
                "total_detected": len(detections),
                "detections": detections,
                "inference_time_ms": inference_time
            }
        except Exception as e:
            return {"status": "error", "message": str(e), "detections": []}
