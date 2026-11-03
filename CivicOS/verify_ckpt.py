import torch
from pathlib import Path

ckpt_path = Path("ai_engine/runs/detection/civicos_v1/weights/last.pt")
try:
    ckpt = torch.load(ckpt_path)
    # Ultralytics saves epoch in the "epoch" key of the state dictionary
    epoch = ckpt.get("epoch", "Unknown")
    print(f"CHECKPOINT_EPOCH: {epoch}")
    print(f"OPTIMIZER_STATE: {'Exists' if 'optimizer' in ckpt else 'Missing'}")
    print(f"SCHEDULER_STATE: {'Exists' if 'lr_schedulers' in ckpt else 'Missing'}")
    print("VERDICT: Valid resumable checkpoint")
except Exception as e:
    print(f"VERIFICATION_ERROR: {e}")
