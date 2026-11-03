"""
What-If Scenario Simulation Engine
----------------------------------
Feature Addressed:
- Feature 7: What-If Simulation

Provides a framework to simulate hypothetical changes to incident conditions
and evaluate the resulting impact on risk, severity, and priority.
Integrates with:
- PredictiveRiskEngine (Phase 2A)
- SeverityScoringEngine (Phase 2B)
- PriorityScoringEngine (Phase 2C)
"""

from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

class WhatIfSimulationEngine:
    """
    Simulates counterfactual urban scenarios and calculates baseline-versus-scenario deltas.
    """

    def __init__(self,
                 predictive_engine=None,
                 severity_engine=None,
                 priority_engine=None):
        self.predictive_engine = predictive_engine
        self.severity_engine = severity_engine
        self.priority_engine = priority_engine

    def _validate_inputs(self, params: Dict[str, Any]):
        """Validates scenario parameters."""
        if "additional_rainfall" in params and params["additional_rainfall"] < 0:
            raise ValueError("Additional rainfall cannot be negative.")
        if "response_delay_hours" in params and params["response_delay_hours"] < 0:
            raise ValueError("Response delay cannot be negative.")
        if "additional_wind_speed" in params and params["additional_wind_speed"] < 0:
            raise ValueError("Additional wind speed cannot be negative.")
        if "humidity_delta" in params and (params["humidity_delta"] < -100 or params["humidity_delta"] > 100):
            raise ValueError("Humidity delta must be between -100 and 100.")
        if "temperature_delta" in params and abs(params["temperature_delta"]) > 50:
            raise ValueError("Temperature delta exceeds physical limits.")

    def _run_intelligence_pipeline(self, incident: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes the sequential intelligence flow:
        Predictive -> Severity -> Priority
        """
        # 1. Predictive Risk
        pred_res = {}
        if self.predictive_engine:
            pred_res = self.predictive_engine.predict(incident)

        # 2. Severity (Depends on Predictive output for cascading probability)
        sev_res = {}
        if self.severity_engine:
            # We create a temporary incident object that includes the predicted probability
            # so the severity engine can use it as the 'cascading' factor.
            pipeline_incident = incident.copy()
            pipeline_incident["cascading_probability"] = pred_res.get("cascading_probability")
            sev_res = self.severity_engine.calculate_severity(pipeline_incident)

        # 3. Priority (Depends on Severity and Predictive output)
        prio_res = {}
        if self.priority_engine:
            prio_res = self.priority_engine.calculate_priority(
                incident,
                severity_result=sev_res,
                predictive_result=pred_res
            )

        return {
            "predictive": pred_res,
            "severity": sev_res,
            "priority": prio_res
        }

    def simulate_scenario(self,
                          incident: Dict[str, Any],
                          scenario_params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes a what-if simulation on a specific incident.
        """
        self._validate_inputs(scenario_params)

        # 1. Calculate Baseline
        baseline = self._run_intelligence_pipeline(incident)

        # 2. Create Modified Incident Copy
        sim_incident = incident.copy()
        contributions = []

        # Scenario A: Rainfall Increase
        if "additional_rainfall" in scenario_params:
            rain_inc = scenario_params["additional_rainfall"]
            current_rain = float(sim_incident.get("rainfall_mm", 0.0))
            sim_incident["rainfall_mm"] = current_rain + rain_inc

            # Heuristic: Extreme rain also increases raw intensity/severity_score
            current_sev = float(sim_incident.get("severity_score", 5.0))
            sim_incident["severity_score"] = min(current_sev + (rain_inc / 20.0), 10.0)
            contributions.append(f"Increased rainfall by {rain_inc}mm (increases intensity)")

        # Scenario B: Wind Speed Increase
        if "additional_wind_speed" in scenario_params:
            wind_inc = scenario_params["additional_wind_speed"]
            current_wind = float(sim_incident.get("wind_speed_kmh", 0.0))
            sim_incident["wind_speed_kmh"] = current_wind + wind_inc
            contributions.append(f"Increased wind speed by {wind_inc}km/h")

        # Scenario C: Temperature Delta
        if "temperature_delta" in scenario_params:
            temp_delta = scenario_params["temperature_delta"]
            current_temp = float(sim_incident.get("temperature_c", 25.0))
            sim_incident["temperature_c"] = current_temp + temp_delta
            contributions.append(f"Temperature shifted by {temp_delta}C")

        # Scenario D: Humidity Delta
        if "humidity_delta" in scenario_params:
            hum_delta = scenario_params["humidity_delta"]
            current_hum = float(sim_incident.get("humidity_pct", 65.0))
            sim_incident["humidity_pct"] = max(0.0, min(100.0, current_hum + hum_delta))
            contributions.append(f"Humidity shifted by {hum_delta}%")

        # Scenario E: Response Delay
        if "response_delay_hours" in scenario_params:
            delay = scenario_params["response_delay_hours"]
            if "timestamp" in sim_incident:
                try:
                    ts = datetime.strptime(sim_incident["timestamp"], "%Y-%m-%d %H:%M:%S")
                    new_ts = ts - timedelta(hours=delay)
                    sim_incident["timestamp"] = new_ts.strftime("%Y-%m-%d %H:%M:%S")
                    contributions.append(f"Simulated response delay of {delay} hours")
                except Exception:
                    contributions.append("Response delay requested but timestamp invalid")
            else:
                contributions.append("Response delay requested but no timestamp available")

        # Scenario F: Preventive Intervention
        if "intervention" in scenario_params:
            intervention = scenario_params["intervention"]
            if intervention == "drainage_clearance":
                current_rain = float(sim_incident.get("rainfall_mm", 0.0))
                sim_incident["rainfall_mm"] = current_rain * 0.5
                # Also reduce the base intensity
                current_sev = float(sim_incident.get("severity_score", 5.0))
                sim_incident["severity_score"] = max(current_sev * 0.8, 1.0)
                contributions.append("Intervention: Drainage clearance (reduces rainfall & intensity)")
            elif intervention == "road_closure":
                current_radius = float(sim_incident.get("impact_radius_meters", 0.0))
                sim_incident["impact_radius_meters"] = current_radius * 0.7
                contributions.append("Intervention: Road closure (reduces geographical impact)")
            else:
                contributions.append(f"Intervention {intervention} applied (no specific model impact defined)")

        # 3. Calculate Simulated Metrics
        sim_results = self._run_intelligence_pipeline(sim_incident)

        # 4. Compare Baseline vs Simulation
        diffs = {}
        direction = "UNCHANGED"

        # Compare Priority Score
        b_prio = baseline["priority"].get("priority_score", 0.0)
        s_prio = sim_results["priority"].get("priority_score", 0.0)
        diffs["priority_score"] = {
            "baseline": b_prio,
            "simulated": s_prio,
            "abs_diff": round(s_prio - b_prio, 2),
            "pct_diff": round(((s_prio - b_prio) / b_prio * 100), 2) if b_prio != 0 else 0.0
        }

        # Compare Severity Score
        b_sev = baseline["severity"].get("severity_score", 0.0)
        s_sev = sim_results["severity"].get("severity_score", 0.0)
        diffs["severity_score"] = {
            "baseline": b_sev,
            "simulated": s_sev,
            "abs_diff": round(s_sev - b_sev, 2),
            "pct_diff": round(((s_sev - b_sev) / b_sev * 100), 2) if b_sev != 0 else 0.0
        }

        # Compare Risk Prob
        b_prob = baseline["predictive"].get("cascading_probability", 0.0)
        s_prob = sim_results["predictive"].get("cascading_probability", 0.0)
        diffs["cascading_probability"] = {
            "baseline": b_prob,
            "simulated": s_prob,
            "abs_diff": round(s_prob - b_prob, 4),
            "pct_diff": round(((s_prob - b_prob) / b_prob * 100), 2) if b_prob != 0 else 0.0
        }

        if diffs["priority_score"]["abs_diff"] > 0.1:
            direction = "INCREASED"
        elif diffs["priority_score"]["abs_diff"] < -0.1:
            direction = "DECREASED"

        return {
            "simulation_id": f"SIM-{int(datetime.now().timestamp())}",
            "scenario_type": "Composite Urban Shock",
            "scenario_parameters": scenario_params,
            "affected_incident_id": incident.get("incident_id", "UNKNOWN"),
            "baseline_results": baseline,
            "simulated_results": sim_results,
            "score_differences": diffs,
            "risk_change_direction": direction,
            "contributing_factors": contributions,
            "assumptions": "Simulation assumes linear scaling of intervention effects and a static urban environment.",
            "limitations": "Simulation only updates features supported by the predictive and scoring engines.",
            "simulation_timestamp": datetime.now().isoformat()
        }
