import torch
try:
    checkpoint_path = "ai_engine/runs/detection/civicos_v1/weights/last.pt"
    ckpt = torch.load(checkpoint_path, map_location="cpu")
    print(f"Checkpoint Epoch: {ckpt.get('epoch', 'Unknown')}")
    print(f"Optimizer state: {'Present' if 'optimizer' in ckpt else 'Missing'}")
    print(f"Scheduler state: {'Present' if 'scheduler' in ckpt else 'Missing'}")
except Exception as e:
    print(f"Error: {e}")
