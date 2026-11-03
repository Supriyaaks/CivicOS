from ultralytics import YOLO
import os
import sys

# Set project root for absolute imports
sys.path.append(os.getcwd())

def train_model():
    try:
        model = YOLO("yolo11n.pt")
        # Use absolute path for data.yaml
        data_yaml = os.path.abspath("ai_engine/datasets/processed/rdd2022_synthetic/data.yaml")
        project_dir = os.path.abspath("ai_engine/runs/detection")
        name_dir = "rdd2022_synthetic"
        
        model.train(
            data=data_yaml,
            epochs=20,
            imgsz=640,
            batch=2,
            device="cpu",
            workers=0,
            project=project_dir,
            name=name_dir,
            exist_ok=True
        )
    except Exception as e:
        with open("training_error.log", "w") as f:
            f.write(str(e))

if __name__ == "__main__":
    train_model()
