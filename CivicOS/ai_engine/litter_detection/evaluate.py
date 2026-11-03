import json
import time
from pathlib import Path
from typing import Dict, Any
from ultralytics import YOLO
from ai_engine.litter_detection.detector import LitterDetector

def evaluate_litter_model(checkpoint_path: str, data_yaml: str, output_dir: str = "ai_engine/runs/litter_detection/test_evaluation"):
    """
    Evaluates the LitterDetector model on the held-out test split.
    """
    # 1. Initialize Detector
    detector = LitterDetector(checkpoint_path=checkpoint_path)
    if detector.model is None:
        return {"status": "error", "message": "Failed to load model for evaluation"}

    # 2. Perform Ultralytics Validation on Test Split
    # We use the model's built-in val method with split='test'
    try:
        # Ensure output dir exists
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        # Run validation
        metrics = detector.model.val(
            data=data_yaml,
            split='test',
            project=output_dir,
            name='test_metrics',
            verbose=False
        )

        # Extract key metrics
        results = {
            "test_image_count": len(metrics.confusion_matrix.matrix) if hasattr(metrics, 'confusion_matrix') else 0, # Approximation
            "precision": metrics.results_dict.get('metrics/precision(B)', 0),
            "recall": metrics.results_dict.get('metrics/recall(B)', 0),
            "mAP50": metrics.results_dict.get('metrics/mAP50(B)', 0),
            "mAP50_95": metrics.results_dict.get('metrics/mAP50-95(B)', 0),
            "inference_speed_ms": metrics.speed['inference'],
            "checkpoint_path": checkpoint_path,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }

        # Save machine-readable results
        with open("ai_engine/litter_detection/test_metrics.json", 'w') as f:
            json.dump(results, f, indent=4)

        # Save human-readable report
        report_path = "ai_engine/litter_detection/TEST_EVALUATION_REPORT.md"
        with open(report_path, 'w') as f:
            f.write("# Litter Detection Test Evaluation Report\n\n")
            f.write(f"**Checkpoint:** {checkpoint_path}\n")
            f.write(f"**Timestamp:** {results['timestamp']}\n\n")
            f.write("## Metrics\n")
            f.write(f"- **Precision:** {results['precision']:.4f}\n")
            f.write(f"- **Recall:** {results['recall']:.4f}\n")
            f.write(f"- **mAP50:** {results['mAP50']:.4f}\n")
            f.write(f"- **mAP50-95:** {results['mAP50_95']:.4f}\n")
            f.write(f"- **Inference Speed:** {results['inference_speed_ms']:.2f} ms/image\n\n")
            f.write("## Limitations\n")
            f.write("The Mini-TACO50 dataset is extremely small (experimental prototype). ")
            f.write("Metrics may be unstable and do not represent production readiness.\n")

        return {"status": "success", "metrics": results}

    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    # Run evaluation on best checkpoint
    BEST_CKPT = "ai_engine/runs/litter_detection/mini_taco50/weights/best.pt"
    DATA_YAML = "ai_engine/datasets/processed/mini_taco50/data.yaml"

    print("Starting independent test evaluation...")
    res = evaluate_litter_model(BEST_CKPT, DATA_YAML)
    if res["status"] == "success":
        print(f"Evaluation successful. mAP50: {res['metrics']['mAP50']:.4f}")
    else:
        print(f"Evaluation failed: {res['message']}")
