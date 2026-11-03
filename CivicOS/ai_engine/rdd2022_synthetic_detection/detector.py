import os
import time
import numpy as np
from ultralytics import YOLO
from .config import MODEL_PATH, CLASS_NAMES, CONF_THRESHOLD
from .schemas import Detection, DetectionResult
from typing import List

class RDD2022Detector:
    def __init__(self):
        self.model_path = MODEL_PATH
        self.class_names = CLASS_NAMES
        self.conf_threshold = CONF_THRESHOLD
        self.model = self._load_model()

    def _load_model(self):
        if not os.path.exists(self.model_path):
            print(f"Warning: RDD model checkpoint not found at {self.model_path}")
            return None
        try:
            return YOLO(self.model_path)
        except Exception as e:
            print(f"Error loading RDD model: {e}")
            return None

    def detect(self, image_path: str) -> DetectionResult:
        if self.model is None:
            return {
                "image_path": image_path,
                "detections": [],
                "inference_time": 0.0
            }

        if not os.path.exists(image_path):
            print(f"Error: Image path {image_path} does not exist.")
            return {
                "image_path": image_path,
                "detections": [],
                "inference_time": 0.0
            }

        start_time = time.time()
        try:
            results = self.model.predict(
                source=image_path,
                conf=self.conf_threshold,
                verbose=False
            )[0]
            
            detections: List[Detection] = []
            boxes = results.boxes
            
            for box in boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                xyxy = box.xyxy[0].tolist() # [xmin, ymin, xmax, ymax]
                
                detections.append({
                    "class_id": cls_id,
                    "class_name": self.class_names.get(cls_id, "Unknown"),
                    "confidence": conf,
                    "bbox": tuple(xyxy)
                })
                
            inference_time = time.time() - start_time
            
            return {
                "image_path": image_path,
                "detections": detections,
                "inference_time": inference_time
            }
            
        except Exception as e:
            print(f"Error during RDD detection: {e}")
            return {
                "image_path": image_path,
                "detections": [],
                "inference_time": 0.0
            }

    def __repr__(self):
        return f"RDD2022Detector(model={self.model_path}, threshold={self.conf_threshold})"
