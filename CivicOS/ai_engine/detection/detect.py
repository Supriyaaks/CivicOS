import cv2
import numpy as np
from ultralytics import YOLO
from pathlib import Path
from ai_engine.common.config import MODEL_PATHS, ACTIVE_MODEL_KEY, CONFIDENCE_THRESHOLD

class IncidentDetector:
    def __init__(self, model_key=ACTIVE_MODEL_KEY):
        # Load model based on the active key
        model_path = MODEL_PATHS.get(model_key, MODEL_PATHS["v1_3class"])
        self.model = YOLO(model_path)
        self.model_key = model_key

        # Get class names from the model itself
        self.classes = self.model.names # Dictionary {id: name}

    def get_supported_classes(self):
        """Returns the list of class names the current model supports."""
        return list(self.classes.values())

    def detect(self, image_path):
        try:
            img = cv2.imread(str(image_path))
            if img is None:
                return {"status": "error", "message": "Invalid image path or corrupt file"}

            results = self.model.predict(source=img, conf=CONFIDENCE_THRESHOLD, verbose=False)

            detections = []
            for r in results:
                for box in r.boxes:
                    cls_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    xyxy = box.xyxy[0].tolist()
                    detections.append({
                        "class_id": cls_id,
                        "class_name": self.classes.get(cls_id, str(cls_id)),
                        "confidence": conf,
                        "bbox": xyxy
                    })

            return {
                "status": "success",
                "detection_count": len(detections),
                "detections": detections
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}
