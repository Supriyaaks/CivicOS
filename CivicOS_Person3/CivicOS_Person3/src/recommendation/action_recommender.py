"""
Preventive Action Recommendation Engine
---------------------------------------
Feature Addressed:
- Feature 8: Preventive Action Recommendation

This module generates context-aware, evidence-based mitigation recommendations
by integrating results from the Predictive, Severity, and Priority engines.
"""

from typing import Dict, List, Any, Optional, Tuple
import numpy as np
from datetime import datetime

class ActionRecommendationEngine:
    """
    Recommends operational responses based on systemic risk and incident characteristics.
    """

    def __init__(self):
        # Knowledge Base: Mapping incident types to potential actions and their triggers
        # Format: { incident_type: [ { action: str, category: str, trigger_factor: str, min_severity: float } ] }
        self.action_catalog = {
            "Flooding / Waterlogging": [
                {
                    "action": "Deploy high-capacity dewatering pumps to low-lying underpasses",
                    "category": "Emergency Response",
                    "trigger_factor": "severity",
                    "min_severity": 60.0,
                    "expected_outcome": "Reduction in water levels to allow transit"
                },
                {
                    "action": "Inspect and clear storm drain inlets in the affected zone",
                    "category": "Preventive Maintenance",
                    "trigger_factor": "rainfall",
                    "min_severity": 0.0,
                    "expected_outcome": "Prevention of secondary flooding in adjacent areas"
                },
                {
                    "action": "Issue civic advisories and detour commercial transit",
                    "category": "Public Safety",
                    "trigger_factor": "population",
                    "min_severity": 40.0,
                    "expected_outcome": "Reduced congestion and improved safety"
                }
            ],
            "Water Main Break": [
                {
                    "action": "Remotely isolate distribution sector valve",
                    "category": "Operational Control",
                    "trigger_factor": "intensity",
                    "min_severity": 70.0,
                    "expected_outcome": "Immediate cessation of water loss"
                },
                {
                    "action": "Dispatch rapid pipe-welding crew with replacement sleeves",
                    "category": "Infrastructure Repair",
                    "trigger_factor": "intensity",
                    "min_severity": 0.0,
                    "expected_outcome": "Restoration of water supply"
                },
                {
                    "action": "Station potable drinking water tankers in affected ward",
                    "category": "Citizen Support",
                    "trigger_factor": "population",
                    "min_severity": 50.0,
                    "expected_outcome": "Mitigation of water shortage"
                }
            ],
            "Power Outage": [
                {
                    "action": "Switch feeder lines to auxiliary substation circuit",
                    "category": "Operational Control",
                    "trigger_factor": "cascading",
                    "min_severity": 60.0,
                    "expected_outcome": "Restoration of power to critical services"
                },
                {
                    "action": "Deploy mobile diesel generators to hospitals and water pumping stations",
                    "category": "Critical Infrastructure",
                    "trigger_factor": "severity",
                    "min_severity": 80.0,
                    "expected_outcome": "Prevention of life-threatening service failure"
                },
                {
                    "action": "Dispatch overhead line repair teams",
                    "category": "Infrastructure Repair",
                    "trigger_factor": "intensity",
                    "min_severity": 0.0,
                    "expected_outcome": "Permanent power restoration"
                }
            ],
            "Traffic Signal Failure": [
                {
                    "action": "Deploy manual traffic enforcement officers immediately",
                    "category": "Public Safety",
                    "trigger_factor": "urgency",
                    "min_severity": 40.0,
                    "expected_outcome": "Prevention of gridlock and accidents"
                },
                {
                    "action": "Dispatch signal technicians to check UPS battery backup",
                    "category": "Technical Repair",
                    "trigger_factor": "intensity",
                    "min_severity": 0.0,
                    "expected_outcome": "Restoration of automated signal control"
                },
                {
                    "action": "Coordinate signal timing changes on adjacent corridors",
                    "category": "Traffic Management",
                    "trigger_factor": "cascading",
                    "min_severity": 50.0,
                    "expected_outcome": "Reduction of cascading congestion"
                }
            ],
            "Tree Fall": [
                {
                    "action": "Dispatch tree cutting team equipped with chainsaws and hydraulic crane",
                    "category": "Emergency Response",
                    "trigger_factor": "intensity",
                    "min_severity": 0.0,
                    "expected_outcome": "Clearance of roadway"
                },
                {
                    "action": "Isolate downed power/telecom wires before cutting",
                    "category": "Public Safety",
                    "trigger_factor": "cascading",
                    "min_severity": 0.0,
                    "expected_outcome": "Prevention of electrocution"
                },
                {
                    "action": "Clear arterial lanes for ambulance and bus and access",
                    "category": "Traffic Management",
                    "trigger_factor": "population",
                    "min_severity": 60.0,
                    "expected_outcome": "Restored access for emergency vehicles"
                }
            ],
            "Fire Hazard": [
                {
                    "action": "Dispatch Water Tenders & Fire Rescue Units",
                    "category": "Emergency Response",
                    "trigger_factor": "intensity",
                    "min_severity": 0.0,
                    "expected_outcome": "Containment and extinguishment of fire"
                },
                {
                    "action": "Establish a safety perimeter and evacuate immediate area",
                    "category": "Public Safety",
                    "trigger_factor": "population",
                    "min_severity": 50.0,
                    "expected_outcome": "Prevention of casualties"
                },
                {
                    "action": "Inspect nearby vulnerable infrastructure for heat transfer",
                    "category": "Preventive Maintenance",
                    "trigger_factor": "cascading",
                    "min_severity": 40.0,
                    "expected_outcome": "Prevention of secondary fires"
                }
            ]
        }

    def _calculate_confidence(self, incident: Dict[str, Any], factor_availability: List[str]) -> str:
        """
        Determines the confidence of the recommendation based on available evidence.
        """
        available_count = len(factor_availability)
        total_needed = 5 # Predictive, Severity, Priority, Type, Status

        ratio = available_count / total_needed
        if ratio >= 0.8:
            return "HIGH"
        elif ratio >= 0.5:
            return "MEDIUM"
        elif ratio >= 0.2:
            return "LOW"
        else:
            return "INSUFFICIENT DATA"

    def recommend(self,
                  incident: Dict[str, Any],
                  predictive_res: Optional[Dict[str, Any]] = None,
                  severity_res: Optional[Dict[str, Any]] = None,
                  priority_res: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Generate evidence-based recommendations for a specific incident.
        """
        incident_id = incident.get("incident_id", "UNKNOWN")
        itype = incident.get("incident_type", "Unknown")

        # 1. Identify potential actions from the catalog
        potential_actions = self.action_catalog.get(itype, [
            {
                "action": "Deploy municipal assessment squad",
                "category": "General Assessment",
                "trigger_factor": "general",
                "min_severity": 0.0,
                "expected_outcome": "Situational awareness"
            }
        ])

        # 2. Filter and Score Recommendations
        final_recommendations = []

        sev_score = severity_res.get("severity_score", 0.0) if severity_res else 0.0
        risk_prob = predictive_res.get("cascading_probability", 0.0) if predictive_res else 0.0
        prio_score = priority_res.get("priority_score", 0.0) if priority_res else 0.0

        available_evidence = []
        if severity_res: available_evidence.append("severity")
        if predictive_res: available_evidence.append("predictive")
        if priority_res: available_evidence.append("priority")
        available_evidence.append("type")
        available_evidence.append("status")

        for idx, act_def in enumerate(potential_actions):
            triggered = False
            reason = ""

            trigger = act_def["trigger_factor"]
            min_sev = act_def["min_severity"]

            if trigger == "severity" and sev_score >= min_sev:
                triggered = True
                reason = f"High severity score ({sev_score}) exceeds threshold ({min_sev})"
            elif trigger == "intensity" and sev_score >= min_sev:
                triggered = True
                reason = f"High incident intensity ({sev_score}) detected"
            elif trigger == "cascading" and (risk_prob > 0.4 or sev_score >= min_sev):
                triggered = True
                reason = f"High cascading risk probability ({risk_prob}) or systemic impact"
            elif trigger == "population" and incident.get("affected_population", 0) > 5000:
                triggered = True
                reason = "Significant population exposure detected"
            elif trigger == "rainfall" and float(incident.get("rainfall_mm", 0)) > 30:
                triggered = True
                reason = "Significant rainfall recorded"
            elif trigger == "general":
                triggered = True
                reason = "Standard operational procedure for this incident type"
            elif trigger == "urgency" and prio_score >= 60:
                triggered = True
                reason = f"High operational priority ({prio_score}) requires immediate action"

            if triggered:
                rec_urgency = "IMMEDIATE" if prio_score >= 85 else ("HIGH" if prio_score >= 60 else "STANDARD")

                final_recommendations.append({
                    "recommendation_id": f"REC-{incident_id}-{idx+1}",
                    "action": act_def["action"],
                    "category": act_def["category"],
                    "urgency": rec_urgency,
                    "reason": reason,
                    "supporting_factors": {
                        "severity": sev_score,
                        "risk_probability": risk_prob,
                        "priority": prio_score
                    },
                    "targeted_risk": "Cascading Failure" if trigger == "cascading" else "Immediate Impact",
                    "expected_outcome": act_def["expected_outcome"],
                    "evidence": f"Based on {trigger} and incident type {itype}",
                    "assumptions": "Assumes standard resource availability",
                    "confidence": self._calculate_confidence(incident, available_evidence)
                })

        urgency_map = {"IMMEDIATE": 3, "HIGH": 2, "STANDARD": 1}
        final_recommendations.sort(key=lambda x: urgency_map.get(x["urgency"], 0), reverse=True)

        return {
            "incident_id": incident_id,
            "incident_priority": prio_score,
            "incident_severity": sev_score,
            "predicted_risk": risk_prob,
            "recommendations": final_recommendations,
            "generated_at": datetime.now().isoformat(),
            "limitations": "Recommendations are based on rule-sets and intelligence scores; human verification is required."
        }
