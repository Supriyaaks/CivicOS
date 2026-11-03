from ultralytics import YOLO
import os

# Paths
checkpoint_path = "ai_engine/runs/detection/civicos_v1/weights/last.pt"

try:
    # Load the model from the last checkpoint
    model = YOLO(checkpoint_path)
    
    # Resume training with the specified parameters
    # Note: Passing resume=True will use the settings from the checkpoint's args.yaml.
    # However, we want to override epochs=15.
    # In Ultralytics, calling model.train(resume=True) ignores most overrides.
    # To change the epoch target while resuming, we typically need to modify the args.yaml 
    # or use the train method with specific arguments.
    
    print("Resuming training from last.pt...")
    model.train(
        resume=True,
        epochs=15,
        imgsz=640,
        batch=2,
        workers=0,
        cache=False,
        device="cpu",
        patience=3,
        seed=42
    )
    print("Training completed successfully.")
except Exception as e:
    print(f"Error during training: {e}")
