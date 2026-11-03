"""
Smart Priority Engine
----------------------
Feature Addressed:
- Feature 6: Smart Priority Engine

This module computes a dynamic priority score to determine the urgency of
response for urban incidents, ranking them based on severity, predictive risk,
time sensitivity, and cascading potential.
"""

from typing import Dict, Any, List, Tuple, Optional
import numpy as np
from datetime import datetime

class PriorityScoringEngine:
    """
    Calculates and ranks incident priority based on multi-dimensional urgency factors.
    """

    def __init__(self):
        # Configurable weights (Must sum to 1.0)
        # Note: Severity already includes some urgency/cascading,
        # but Priority focuses on the 'Now' (Time) and 'Systemic Risk' (Prediction).
        self.weights = {
            "severity": 0.40,
            "predicted_risk": 0.25,
            "time_urgency": 0.20,
            "cascading_impact": 0.15
        }

        # Priority Level Classification
        self.classifications = [
            (85, "CRITICAL"),
            (60, "HIGH"),
            (30, "MEDIUM"),
            (0, "LOW")
        ]

    def _normalize_score(self, val: Any) -> float:
        """Ensures a value is a float between 0 and 100."""
        try:
            v = float(val)
            if v < 0: return np.nan
            return min(max(v, 0.0), 100.0)
        except (TypeError, ValueError):
            return np.nan

    def _derive_time_urgency(self, incident: Dict[str, Any]) -> float:
        """
        Derives a time-based urgency score (0-100).
        Considered: Status, timestamps, and incident-specific rules.
        """
        if not incident:
            return np.nan

        status = str(incident.get("status", "")).lower()
        timestamp_str = incident.get("timestamp")

        score = 50.0 # Baseline

        # Status modifiers
        if "reported" in status:
            score += 20.0 # Fresh reports need triage
        elif "investigating" in status:
            score += 10.0
        elif "in progress" in status:
            score += 5.0
        elif "resolved" in status or "mitigated" in status:
            score -= 40.0

        # Time sensitivity (Example: Incidents > 24h old lose immediate priority)
        if timestamp_str:
            try:
                ts = datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S")
                delta = datetime.now() - ts
                hours_old = delta.total_seconds() / 3600
                if hours_old < 2:
                    score += 15.0 # High urgency for very recent incidents
                elif hours_old > 48:
                    score -= 20.0 # Stale incidents lower priority
            except (ValueError, TypeError):
                pass

        return min(max(score, 0.0), 100.0)

    def calculate_priority(self, incident: Dict[str, Any],
                          severity_result: Optional[Dict[str, Any]] = None,
                          predictive_result: Optional[Dict[str, Any]] = None,
                          cascading_result: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Computes the priority score for a single incident.

        Args:
            incident: Raw incident data.
            severity_result: Output from SeverityScoringEngine.
            predictive_result: Output from PredictiveRiskEngine.
            cascading_result: Output from CascadingImpactEngine.
        """
        incident_id = incident.get("incident_id", "UNKNOWN")

        # 1. Extract and Normalize Factors
        # Severity Score
        sev_score = np.nan
        if severity_result and "severity_score" in severity_result:
            sev_score = self._normalize_score(severity_result["severity_score"])

        # Predicted Risk Score
        risk_score = np.nan
        if predictive_result and "cascading_probability" in predictive_result:
            # Prob (0-1) -> Score (0-100)
            risk_score = self._normalize_score(predictive_result["cascading_probability"] * 100.0)

        # Time Urgency Score
        urgency_score = self._derive_time_urgency(incident)

        # Cascading Impact Score
        casc_score = np.nan
        if cascading_result and "impact_score" in cascading_result:
            casc_score = self._normalize_score(cascading_result["impact_score"])
        elif cascading_result and "cascading_risk_flag" in cascading_result:
            # Fallback to flag if score is missing
            casc_score = 100.0 if int(cascading_result["cascading_risk_flag"]) == 1 else 0.0

        raw_factors = {
            "severity": sev_score,
            "predicted_risk": risk_score,
            "time_urgency": urgency_score,
            "cascading_impact": casc_score
        }

        available_factors = {}
        missing_factors = []
        for factor, value in raw_factors.items():
            if np.isnan(value):
                missing_factors.append(factor)
            else:
                available_factors[factor] = value

        # 2. Handle Missing Data (Weight Redistribution)
        if not available_factors:
            return {
                "incident_id": incident_id,
                "priority_score": 0.0,
                "priority_level": "UNKNOWN",
                "error": "Insufficient data to calculate priority",
                "missing_factors": missing_factors
            }

        total_weight_available = sum(self.weights[f] for f in available_factors)
        weighted_sum = 0.0
        for factor, value in available_factors.items():
            effective_weight = self.weights[factor] / total_weight_available
            weighted_sum += effective_weight * value

        final_score = round(weighted_sum, 2)

        # 3. Classification
        priority_level = "LOW"
        for threshold, level in self.classifications:
            if final_score >= threshold:
                priority_level = level
                break

        # 4. Explanation
        explanation = f"Priority {final_score} based on "
        top_factor = max(available_factors, key=lambda k: available_factors[k] * self.weights[k])
        explanation += f"highest contribution from {top_factor} ({available_factors[top_factor]})."
        if missing_factors:
            explanation += f" Missing factors: {', '.join(missing_factors)}."

        return {
            "incident_id": incident_id,
            "priority_score": final_score,
            "priority_level": priority_level,
            "component_scores": available_factors,
            "component_weights": {f: self.weights[f] for f in available_factors},
            "missing_factors": missing_factors,
            "priority_explanation": explanation,
            "scoring_version": "2.0-weighted-priority"
        }

    def rank_incidents(self, incident_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Ranks multiple incident priority results.
        Deterministic tie-breaking:
        1. Priority Score (Desc)
        2. Time Urgency (Desc)
        3. Incident ID (Asc)
        """
        # Sort by Priority Score (Descending), then Urgency (Descending), then ID (Ascending)
        # We use a lambda that returns a tuple for sorting.
        # Since sorted() is ascending, we negate numbers for descending order.

        def sort_key(item):
            score = item.get("priority_score", 0.0)
            urgency = item.get("component_scores", {}).get("time_urgency", 0.0)
            inc_id = str(item.get("incident_id", "ZZZ"))
            return (-score, -urgency, inc_id)

        sorted_list = sorted(incident_results, key=sort_key)

        # Add ranking position
        for idx, item in enumerate(sorted_list):
            item["ranking_position"] = idx + 1

        return sorted_list
