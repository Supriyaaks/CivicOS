"""
Prevention Impact Scoring Engine
-------------------------------
Feature Addressed:
- Feature 9: Prevention Impact Score

Evaluates the effectiveness of preventive interventions by comparing
baseline risk against simulated intervention risk.
"""

from typing import Dict, Any, List, Optional, Tuple
import numpy as np
from datetime import datetime
import uuid

from .models import (
    PreventionImpactEvaluation,
    MetricDifference,
    PreventionImpactRequest
)

class PreventionImpactEngine:
    """
    Evaluates how much a preventive intervention changes the risk associated with an incident.
    """

    def __init__(self, tolerance: float = 0.5):
        # Numerical tolerance for treating negligible changes as UNCHANGED
        self.tolerance = tolerance

        # PIS Weights: Focus on physical risk reduction
        # Predictive Risk (Cascading Prob) is weighted higher than Severity.
        self.weights = {
            "cascading_probability": 0.6,
            "severity_score": 0.4
        }

    def calculate_relative_reduction(self, baseline: float, intervention: float) -> Optional[float]:
        """Calculates (Baseline - Intervention) / Baseline * 100."""
        if baseline <= 0:
            return None
        return ((baseline - intervention) / baseline) * 100

    def classify_impact(self, abs_reduction: float) -> str:
        """Classifies the change in risk based on absolute reduction and tolerance."""
        if abs_reduction > self.tolerance:
            return "IMPROVED"
        elif abs_reduction < -self.tolerance:
            return "WORSENED"
        else:
            return "UNCHANGED"

    def compute_raw_score(self, metric_diffs: Dict[str, MetricDifference]) -> float:
        """
        Computes the unconstrained weighted relative reduction score (-100.0 to +100.0).
        """
        weighted_sum = 0.0
        total_weight_used = 0.0

        for metric, weight in self.weights.items():
            if metric in metric_diffs:
                rel_red = metric_diffs[metric].relative_reduction
                if rel_red is not None:
                    # We cap relative reduction at 100% and floor at -100% for the score
                    capped_red = max(min(rel_red, 100.0), -100.0)
                    weighted_sum += weight * capped_red
                    total_weight_used += weight

        if total_weight_used == 0:
            return 0.0

        return float(weighted_sum / total_weight_used)

    def compute_pis(self, metric_diffs: Dict[str, MetricDifference]) -> float:
        """
        Computes the Prevention Impact Score (PIS) on a 0-100 scale.
        Formula: Sum(Weight_i * RelativeReduction_i)
        Normalized to 0-100 (worsening interventions clamp to 0.0).
        """
        raw_score = self.compute_raw_score(metric_diffs)
        return float(max(min(raw_score, 100.0), 0.0))

    def evaluate_impact(self,
                       incident_id: str,
                       intervention_name: str,
                       baseline_results: Dict[str, Any],
                       simulated_results: Optional[Dict[str, Any]] = None,
                       observed_metrics: Optional[Dict[str, float]] = None,
                       evaluation_type: str = "SIMULATED") -> PreventionImpactEvaluation:
        """
        Main entry point to calculate the Prevention Impact Evaluation.
        Supports SIMULATED and MEASURED types.
        """

        # 1. Extract Baseline Metrics
        b_prob = baseline_results.get("predictive", {}).get("cascading_probability", np.nan)
        b_sev = baseline_results.get("severity", {}).get("severity_score", np.nan)
        b_prio = baseline_results.get("priority", {}).get("priority_score", np.nan)

        # 2. Extract Intervention Metrics based on type
        if evaluation_type == "MEASURED":
            if not observed_metrics:
                return self._insufficient_data_result(incident_id, intervention_name, evaluation_type, "Observed metrics missing for MEASURED evaluation.")

            s_prob = observed_metrics.get("cascading_probability", np.nan)
            s_sev = observed_metrics.get("severity_score", np.nan)
            s_prio = observed_metrics.get("priority_score", np.nan)
        elif evaluation_type == "SIMULATED":
            if not simulated_results:
                return self._insufficient_data_result(incident_id, intervention_name, evaluation_type, "Simulated results missing for SIMULATED evaluation.")

            s_prob = simulated_results.get("predictive", {}).get("cascading_probability", np.nan)
            s_sev = simulated_results.get("severity", {}).get("severity_score", np.nan)
            s_prio = simulated_results.get("priority", {}).get("priority_score", np.nan)
        else:
            return self._insufficient_data_result(incident_id, intervention_name, evaluation_type, f"Invalid evaluation type: {evaluation_type}")

        metrics_map = {
            "cascading_probability": (b_prob, s_prob),
            "severity_score": (b_sev, s_sev),
            "priority_score": (b_prio, s_prio),
        }

        # 3. Calculate Metric-Level Differences
        metric_diffs = {}
        for metric, (base, sim) in metrics_map.items():
            if np.isnan(base) or np.isnan(sim):
                continue

            abs_red = base - sim
            rel_red = self.calculate_relative_reduction(base, sim)

            metric_diffs[metric] = MetricDifference(
                baseline=float(base),
                intervention=float(sim),
                absolute_reduction=round(float(abs_red), 4),
                relative_reduction=round(float(rel_red), 2) if rel_red is not None else None
            )

        # 4. Handle Insufficient Data
        if "cascading_probability" not in metric_diffs and "severity_score" not in metric_diffs:
            return self._insufficient_data_result(incident_id, intervention_name, evaluation_type, "No physical risk metrics available for comparison.")

        # 5. Compute PIS and Overall Classification
        raw_score = self.compute_raw_score(metric_diffs)
        pis = self.compute_pis(metric_diffs)

        if raw_score > self.tolerance:
            classification = "IMPROVED"
            direction = "Positive"
        elif raw_score < -self.tolerance:
            classification = "WORSENED"
            direction = "Negative"
        else:
            classification = "UNCHANGED"
            direction = "Neutral"

        # 6. Build Evaluation Object
        return PreventionImpactEvaluation(
            evaluation_id=f"EVAL-{uuid.uuid4().hex[:8].upper()}",
            incident_id=incident_id,
            intervention_name=intervention_name,
            baseline_metrics={
                "cascading_probability": float(b_prob) if not np.isnan(b_prob) else 0.0,
                "severity_score": float(b_sev) if not np.isnan(b_sev) else 0.0,
                "priority_score": float(b_prio) if not np.isnan(b_prio) else 0.0,
            },
            intervention_metrics={
                "cascading_probability": float(s_prob) if not np.isnan(s_prob) else 0.0,
                "severity_score": float(s_sev) if not np.isnan(s_sev) else 0.0,
                "priority_score": float(s_prio) if not np.isnan(s_prio) else 0.0,
            },
            metric_level_differences=metric_diffs,
            prevention_impact_score=round(pis, 2),
            impact_classification=classification,
            impact_direction=direction,
            contributing_factors=self._derive_contributing_factors(metric_diffs),
            assumptions="Intervention effects assume static environment." if evaluation_type == "SIMULATED" else "Based on direct field observations.",
            limitations="Simulation may vary from real-world." if evaluation_type == "SIMULATED" else "Observation subject to sensor/human error.",
            data_quality="HIGH" if len(metric_diffs) == 3 else "MEDIUM",
            evaluated_at=datetime.now().isoformat()
        )
    def _derive_contributing_factors(self, diffs: Dict[str, MetricDifference]) -> List[str]:
        factors = []
        for metric, diff in diffs.items():
            if diff.absolute_reduction > self.tolerance:
                factors.append(f"Reduction in {metric} ({round(diff.absolute_reduction, 2)})")
            elif diff.absolute_reduction < -self.tolerance:
                factors.append(f"Increase in {metric} ({round(diff.absolute_reduction, 2)})")

        if not factors:
            factors.append("No significant changes in monitored metrics.")
        return factors

    def _insufficient_data_result(self, incident_id: str, intervention_name: str, evaluation_type: str = "SIMULATED", reason: str = "Missing critical metrics") -> PreventionImpactEvaluation:
        return PreventionImpactEvaluation(
            evaluation_id=f"EVAL-FAIL-{uuid.uuid4().hex[:4].upper()}",
            incident_id=incident_id,
            intervention_name=intervention_name,
            baseline_metrics={},
            intervention_metrics={},
            metric_level_differences={},
            prevention_impact_score=0.0,
            impact_classification="INSUFFICIENT DATA",
            impact_direction="Neutral",
            contributing_factors=[reason],
            assumptions="N/A",
            limitations="Unable to perform comparison.",
            data_quality="LOW",
            evaluated_at=datetime.now().isoformat()
        )
