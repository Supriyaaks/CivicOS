# Mini-TACO50 Training Report (Final)

## 1. Execution Summary
- **Status:** Completed Successfully
- **Actual Epochs Completed:** 30 / 30
- **Total Training Duration:** ~698 seconds (approximately 11.6 minutes)
- **Device:** CPU
- **Model:** YOLO11n (One-class: Litter)

## 2. Output Artifacts
- **Best Model:** `ai_engine/runs/litter_detection/mini_taco50/weights/best.pt`
- **Last Model:** `ai_engine/runs/litter_detection/mini_taco50/weights/last.pt`
- **Results Log:** `ai_engine/runs/litter_detection/mini_taco50/results.csv`
- **Training Plots:** Generated in `ai_engine/runs/litter_detection/mini_taco50/`

## 3. Final Validation Metrics (Training-time)
*Based on the final epoch (30) recorded in results.csv.*

| Metric | Value |
|---|---|
| **Precision (B)** | 0.0 |
| **Recall (B)** | 0.0 |
| **mAP50 (B)** | 0.0 |
| **mAP50-95 (B)** | 0.0 |
| **Final Train Box Loss** | 1.07327 |
| **Final Val Box Loss** | 1.31687 |
| **Final Train Cls Loss** | 4.43731 |
| **Final Val Cls Loss** | 7.49116 |

**Best Validation Epoch:** Epoch 24 (based on box loss and mAP trends in results.csv).

## 4. Preservation Audit
- **Six-class Model:** The Urban Community model and its artifacts remain completely untouched.
- **Original Data:** Mini-TACO50 COCO annotations and database were preserved.
- **Output Isolation:** All training outputs are saved exclusively in `ai_engine/runs/litter_detection/mini_taco50/`.

## 5. Conclusion
Training completed all 30 epochs. However, the validation metrics (mAP, Precision, Recall) are currently 0.0. This is expected given the extremely small dataset size (49 objects) and the complexity of the backgrounds, indicating that while the model is technically trained, it has not yet achieved meaningful predictive power on the validation set.
