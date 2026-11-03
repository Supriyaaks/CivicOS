from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime
import uuid

class MetricDifference(BaseModel):
    baseline: float
    intervention: float
    absolute_reduction: float
    relative_reduction: Optional[float] = None

class PreventionImpactEvaluation(BaseModel):
    evaluation_id: str
    incident_id: str
    intervention_id: Optional[str] = None
    intervention_name: str
    evaluation_type: str = Field("SIMULATED", description="SIMULATED or MEASURED")

    baseline_metrics: Dict[str, float]
    intervention_metrics: Dict[str, float]

    metric_level_differences: Dict[str, MetricDifference]

    prevention_impact_score: float
    impact_classification: str = Field(..., description="IMPROVED, UNCHANGED, WORSENED, or INSUFFICIENT DATA")
    impact_direction: str = Field(..., description="Positive, Negative, or Neutral")

    contributing_factors: List[str]
    assumptions: str
    limitations: str
    data_quality: str
    evaluated_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class PreventionImpactRequest(BaseModel):
    incident_id: str
    intervention_name: str
    intervention_id: Optional[str] = None
    evaluation_type: str = Field("SIMULATED", description="SIMULATED or MEASURED")
    # For MEASURED interventions, provide actual observed values
    observed_metrics: Optional[Dict[str, float]] = Field(
        None,
        description="Observed values for 'cascading_probability' and 'severity_score' for MEASURED type"
    )
