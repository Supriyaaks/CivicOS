import os
import json
import time
import numpy as np
from pathlib import Path
from ultralytics import YOLO

def evaluate_rdd_model():
    # Paths
    model_path = "ai_engine/runs/detection/rdd2022_synthetic/weights/best.pt"
    data_yaml = "ai_engine/datasets/processed/rdd2022_synthetic/data.yaml"
    output_dir = Path("ai_engine/rdd2022_synthetic_detection")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Loading model: {model_path}")
    model = YOLO(model_path)
    
    # Run validation on test split
    print("Evaluating on test split...")
    results = model.val(data=data_yaml, split='test', plots=True)
    
    # Use the speed attribute from DetMetrics for inference time
    # speed is a dict: {'preprocess': ..., 'inference': ..., 'loss': ..., 'postprocess': ...}
    inference_time = results.speed['inference'] / 1000.0 if 'inference' in results.speed else 0
    
    # Extract metrics
    metrics = {
        "precision": float(results.results_dict['metrics/precision(B)']),
        "recall": float(results.results_dict['metrics/recall(B)']),
        "mAP50": float(results.results_dict['metrics/mAP50(B)']),
        "mAP50-95": float(results.results_dict['metrics/mAP50-95(B)']),
        "inference_time_per_image": inference_time,
        "per_class": {}
    }
    
    # Per-class metrics
    names = model.names
    for i in range(len(names)):
        cls_name = names[i]
        metrics["per_class"][cls_name] = {
            "precision": float(results.box.p[i]),
            "recall": float(results.box.r[i]),
            "mAP50": float(results.box.ap50[i])
        }
        
    # Save metrics
    with open(output_dir / "test_metrics.json", "w") as f:
        json.dump(metrics, f, indent=4)
        
    # Generate Report
    report = f"# RDD2022 Synthetic Test Evaluation Report\n\n"
    report += f"## Overall Metrics\n"
    report += f"- **Precision:** {metrics['precision']:.4f}\n"
    report += f"- **Recall:** {metrics['recall']:.4f}\n"
    report += f"- **mAP50:** {metrics['mAP50']:.4f}\n"
    report += f"- **mAP50-95:** {metrics['mAP50-95']:.4f}\n"
    report += f"- **Avg Inference Time:** {metrics['inference_time_per_image']:.4f}s\n\n"
    
    report += "## Per-Class Performance\n"
    report += "| Class | Precision | Recall | mAP50 |\n"
    report += "|---|---|---|---|\n"
    for cls, m in metrics["per_class"].items():
        report += f"| {cls} | {m['precision']:.4f} | {m['recall']:.4f} | {m['mAP50']:.4f} |\n"
        
    report += "\n## Notes\n"
    report += "- Evaluation performed on the independent synthetic test split.\n"
    report += "- Visualizations saved in the run directory by Ultralytics.\n"
    
    with open(output_dir / "TEST_EVALUATION_REPORT.md", "w") as f:
        f.write(report)
        
    print(f"Evaluation complete. Reports saved to {output_dir}")

if __name__ == "__main__":
    evaluate_rdd_model()
