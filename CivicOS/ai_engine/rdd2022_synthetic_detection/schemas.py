from typing import TypedDict, List, Tuple

class Detection(TypedDict):
    class_id: int
    class_name: str
    confidence: float
    bbox: Tuple[float, float, float, float] # [xmin, ymin, xmax, ymax]

class DetectionResult(TypedDict):
    image_path: str
    detections: List[Detection]
    inference_time: float
