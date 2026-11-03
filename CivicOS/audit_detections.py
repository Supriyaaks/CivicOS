import os
import cv2
from ai_engine.orchestrator import CivicOS_AI_Orchestrator
from pathlib import Path

def audit_detections():
    orch = CivicOS_AI_Orchestrator()
    test_dir = Path("ai_engine/datasets/processed/urban_community_mini50/images/test")
    images = list(test_dir.glob("*.jpg"))
    
    class_counts = {i: 0 for i in range(6)}
    total_images = len(images)
    
    print(f"Auditing {total_images} images from test split...")
    
    for img_path in images:
        res = orch.detector.detect(str(img_path))
        if res["status"] == "success":
            for det in res["detections"]:
                cid = det["class_id"]
                if cid in class_counts:
                    class_counts[cid] += 1
    
    print("\n--- Actual Detection Counts ---")
    names = {0: "Animal", 1: "Traffic Light", 2: "Waste Container", 3: "Pothole", 4: "Cracks", 5: "Open Manhole"}
    for cid, count in class_counts.items():
        print(f"{names[cid]}: {count} detections")

if __name__ == "__main__":
    audit_detections()
