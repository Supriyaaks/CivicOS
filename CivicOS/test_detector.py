import cv2
from pathlib import Path
from ai_engine.detection.detect import IncidentDetector

def test_detector():
    detector = IncidentDetector()
    
    # 1. Valid image test
    # Find any image from the test set
    test_images = list(Path("ai_engine/datasets/processed/urban_community_filtered/test/images").glob("*.*"))
    if not test_images:
        print("No test images found.")
        return
        
    img_path = test_images[0]
    print(f"Testing valid image: {img_path.name}")
    res_valid = detector.detect(img_path)
    print(f"Valid Image Result: {res_valid}")
    
    # 2. Invalid image path test
    print("\nTesting invalid image path...")
    res_invalid = detector.detect("non_existent.jpg")
    print(f"Invalid Image Result: {res_invalid}")
    
    # 3. No detection check (we assume a blank image or something similar if available)
    # For now, we just check if the structure is correct when detections are empty.
    # Since we are using a pretrained model on a custom dataset, 
    # results will be random until we fine-tune.
    
if __name__ == "__main__":
    test_detector()
