import time
import os
import pandas as pd

csv_path = "ai_engine/runs/litter_detection/mini_taco50/results.csv"
target_epoch = 30

while True:
    try:
        with open(csv_path, 'r') as f:
            lines = f.readlines()
            if len(lines) > 1:
                last_line = lines[-1].strip().split(',')
                current_epoch = int(last_line[0])
                if current_epoch >= target_epoch:
                    print(f"TRAINING_FINISHED: Reached epoch {current_epoch}")
                    break
    except Exception as e:
        print(f"Monitoring error: {e}")
    
    time.sleep(30)
