# RDD2022 Synthetic Test Evaluation Report

## Overall Metrics
- **Precision:** 0.8981
- **Recall:** 0.3430
- **mAP50:** 0.3950
- **mAP50-95:** 0.2237
- **Avg Inference Time:** 0.0561s

## Per-Class Performance
| Class | Precision | Recall | mAP50 |
|---|---|---|---|
| D00 - Longitudinal Crack | 1.0000 | 0.0000 | 0.0612 |
| D10 - Transverse Crack | 1.0000 | 0.0000 | 0.0176 |
| D20 - Alligator Crack | 0.5924 | 0.4444 | 0.5059 |
| D40 - Pothole | 1.0000 | 0.9277 | 0.9950 |

## Notes
- Evaluation performed on the independent synthetic test split.
- Visualizations saved in the run directory by Ultralytics.
