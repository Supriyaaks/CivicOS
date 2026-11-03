from ultralytics import YOLO
import os

CKPT_PATH = "ai_engine/runs/detection/civicos_v1/weights/last.pt"

def resume_training():
    try:
        # Load the last checkpoint
        model = YOLO(CKPT_PATH)
        
        # resume=True tells YOLO to look at the args.yaml in the run directory
        # and continue from the saved epoch and optimizer state.
        model.train(
            resume=True,
            batch=2,
            imgsz=640,
            workers=0,
            cache=False,
            device="cpu",
            patience=3,
            seed=42
        )
    except Exception as e:
        print(f"RESUME_ERROR: {e}")

if __name__ == "__main__":
    resume_training()
