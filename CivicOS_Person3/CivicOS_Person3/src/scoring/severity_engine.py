"""
Impact and Severity Scoring Engine
----------------------------------
Feature Addressed:
- Feature 5: Impact and Severity Scoring

This module implements a normalized weighted scoring model to determine the
severity of urban incidents based on multiple physical and systemic factors.
"""

from typing import Dict, Any, List, Tuple, Optional
import numpy as np

class SeverityScoringEngine:
    """
    Computes a normalized severity score (0-100) based on weighted incident factors.
    """

    def __init__(self):
        # Configurable weights (Must sum to 1.0)
        self.weights = {
            "intensity": 0.25,
            "population": 0.20,
            "geographical": 0.15,
            "urgency": 0.15,
            "cascading": 0.25
        }

        # Configurable thresholds for normalization
        self.thresholds = {
            "max_population": 20000,
            "max_radius": 2500,
            "intensity_scale": 10.0
        }

        # Severity Level Classification
        self.classifications = [
            (85, "CRITICAL"),
            (60, "HIGH"),
            (30, "MODERATE"),
            (0, "LOW")
        ]

    def _normalize_intensity(self, val: Any) -> float:
        """Normalizes raw severity score (0-10) to (0-100)."""
        try:
            v = float(val)
            if v < 0: return np.nan
            return min(max(v * 10.0, 0.0), 100.0)
        except (TypeError, ValueError):
            return np.nan

    def _normalize_population(self, val: Any) -> float:
        """Normalizes affected population to (0-100)."""
        try:
            v = float(val)
            if v < 0: return np.nan
            return min(max((v / self.thresholds["max_population"]) * 100.0, 0.0), 100.0)
        except (TypeError, ValueError):
            return np.nan

    def _normalize_geographical(self, val: Any) -> float:
        """Normalizes impact radius (meters) to (0-100)."""
        try:
            v = float(val)
            if v < 0: return np.nan
            return min(max((v / self.thresholds["max_radius"]) * 100.0, 0.0), 100.0)
        except (TypeError, ValueError):
            return np.nan

    def _derive_urgency(self, incident: Dict[str, Any]) -> float:
        """
        Derives urgency score (0-100) based on incident type and status.
        """
        if not incident:
            return np.nan

        type_val = str(incident.get("incident_type", "")).lower()
        status_val = str(incident.get("status", "")).lower()

        if not type_val and not status_val:
            return np.nan

        score = 50.0  # Base urgency

        high_urgency = ["gas leak", "fire hazard", "power outage", "flooding"]
        if any(t in type_val for t in high_urgency):
            score += 30.0

        if "in progress" in status_val:
            score += 10.0
        elif "reported" in status_val:
            score += 5.0

        return min(max(score, 0.0), 100.0)

    def _normalize_cascading(self, val: Any) -> float:
        """Normalizes cascading probability (0-1) or flag (0-1) to (0-100)."""
        try:
            v = float(val)
            if v < 0: return np.nan
            return min(max(v * 100.0, 0.0), 100.0)
        except (TypeError, ValueError):
            return np.nan

    def calculate_severity(self, incident: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main entry point to calculate the incident severity score.
        """
        incident_id = incident.get("incident_id", "UNKNOWN")

        # 1. Extract and Normalize Factors
        cascading_val = incident.get("cascading_probability")
        if cascading_val is None:
            cascading_val = incident.get("cascading_risk_flag")

        # IMPORTANT: We use the 'severity_score' as the raw intensity.
        # In a simulation, we might adjust this if the intensity changes.
        raw_factors = {
            "intensity": self._normalize_intensity(incident.get("severity_score")),
            "population": self._normalize_population(incident.get("affected_population")),
            "geographical": self._normalize_geographical(incident.get("impact_radius_meters")),
            "urgency": self._derive_urgency(incident),
            "cascading": self._normalize_cascading(cascading_val)
        }

        available_factors = {}
        missing_factors = []
        for factor, value in raw_factors.items():
            if np.isnan(value):
                missing_factors.append(factor)
            else:
                available_factors[factor] = value

        if not available_factors:
            return {
                "incident_id": incident_id,
                "severity_score": 0.0,
                "severity_level": "UNKNOWN",
                "error": "Insufficient data to calculate severity",
                "available_factors": [],
                "missing_factors": missing_factors
            }

        total_weight_available = sum(self.weights[f] for f in available_factors)
        weighted_sum = 0.0
        for factor, value in available_factors.items():
            effective_weight = self.weights[factor] / total_weight_available
            weighted_sum += effective_weight * value

        final_score = round(weighted_sum, 2)
        severity_level = "LOW"
        for threshold, level in self.classifications:
            if final_score >= threshold:
                severity_level = level
                break

        explanation = f"Calculated using {len(available_factors)} factors. "
        if missing_factors:
            explanation += f"Missing: {', '.join(missing_factors)}. Weights redistributed."
        else:
            explanation += "All factors present."

        return {
            "incident_id": incident_id,
            "severity_score": final_score,
            "severity_level": severity_level,
            "factor_scores": available_factors,
            "factor_weights": {f: self.weights[f] for f in available_factors},
            "available_factors": list(available_factors.keys()),
            "missing_factors": missing_factors,
            "calculation_explanation": explanation,
            "scoring_version": "2.0-weighted-normalized"
        }
