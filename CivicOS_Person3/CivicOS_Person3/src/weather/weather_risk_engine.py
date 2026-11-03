"""
Weather-Based Risk Analysis Engine
----------------------------------
Feature Addressed:
- Feature 10: Weather-Based Risk Analysis

Analyzes meteorological data (rainfall, wind, temperature, humidity)
and computes correlated urban risk multipliers across infrastructure assets.
"""

from typing import Dict, Any, List, Optional
import numpy as np
from src.config import (
    HUMIDITY_THRESHOLD_PCT,
    ZONE_WEATHER_VULNERABILITY,
    DEFAULT_WEATHER_VULNERABILITY
)

class WeatherRiskEngine:
    """
    Evaluates weather hazards and their amplifying effects on municipal infrastructure.
    """

    def __init__(self):
        pass

    def _get_zone_weights(self, zone: Optional[str]) -> Dict[str, float]:
        """Retrieves vulnerability weights for a specific zone, falling back to defaults."""
        return ZONE_WEATHER_VULNERABILITY.get(zone, DEFAULT_WEATHER_VULNERABILITY)

    def _calculate_material_stress_index(self, rainfall: float, temp: float, humidity: float, weights: Dict[str, float]) -> float:
        """
        Computes a Material Stress Index (MSI) based on environmental stress factors.
        MSI = (RainWeight * RainNormalize) + (TempWeight * TempNormalize) + (HumidWeight * HumidNormalize)

        Note: This is an engineering assumption proxy for asphalt/material degradation.
        """
        # Normalize rainfall relative to a "Severe" threshold (e.g., 100mm)
        rain_norm = min(rainfall / 100.0, 1.0)
        # Normalize temperature relative to "Extreme" (e.g., 45C)
        temp_norm = max(0, (temp - 20.0) / 25.0) if temp > 20.0 else 0.0
        # Normalize humidity relative to threshold (e.g., 90%)
        hum_norm = max(0, (humidity - 50.0) / 40.0) if humidity > 50.0 else 0.0

        msi = (weights["rainfall"] * rain_norm) + \
              (weights["temp"] * temp_norm) + \
              (weights["humidity"] * hum_norm)

        return float(msi)

    def evaluate_weather_risk(
        self,
        rainfall_mm: float,
        wind_speed_kmh: float,
        temperature_c: float,
        humidity_pct: Optional[float] = None,
        zone: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Assess municipal hazard alert level based on weather triggers and zone vulnerability.
        """
        alerts = []
        multiplier = 1.0

        # Get weights for the current zone
        weights = self._get_zone_weights(zone)

        # Handle missing humidity: use a neutral median if not provided
        effective_humidity = humidity_pct if humidity_pct is not None else 65.0

        # 1. Rainfall analysis (Weighted by zone)
        rain_impact = rainfall_mm * weights["rainfall"]
        if rain_impact >= 70.0:
            alerts.append("CRITICAL: Severe precipitation alert - flash flood risk")
            multiplier += 0.6
        elif rain_impact >= 30.0:
            alerts.append("WARNING: Moderate rainfall - waterlogging likely in low-lying zones")
            multiplier += 0.3

        # 2. Wind speed analysis (Weighted by zone)
        wind_impact = wind_speed_kmh * weights["wind"]
        if wind_impact >= 50.0:
            alerts.append("CRITICAL: High wind alert - high danger of uprooted trees & snapped lines")
            multiplier += 0.4
        elif wind_impact >= 30.0:
            alerts.append("ADVISORY: Breezy/gusty winds - secure loose structures")
            multiplier += 0.15

        # 3. Temperature analysis (Weighted by zone)
        temp_impact = temperature_c * weights["temp"]
        if temp_impact >= 39.0:
            alerts.append("WARNING: Heatwave alert - increased electrical transformer load & fire hazard")
            multiplier += 0.25

        # 4. Humidity & Interaction Effects
        # If humidity is high, it amplifies the risk of rain (waterlogging) and heat (heat index)
        if effective_humidity >= HUMIDITY_THRESHOLD_PCT:
            alerts.append("ADVISORY: High humidity - potential for increased material stress and heat index")
            multiplier += 0.1

        # Interaction: Heavy Rain + High Humidity = Higher Waterlogging Risk
        if rain_impact >= 30.0 and effective_humidity >= 70.0:
            alerts.append("WARNING: Compound Risk - High humidity exacerbating waterlogging")
            multiplier += 0.15

        # Interaction: Extreme Heat + High Humidity = Heat Stress
        if temp_impact >= 35.0 and effective_humidity >= 70.0:
            alerts.append("WARNING: Compound Risk - High heat index increasing infrastructure stress")
            multiplier += 0.1

        # Compute MSI for structural analysis (not used for the multiplier, but for reporting)
        msi = self._calculate_material_stress_index(rainfall_mm, temperature_c, effective_humidity, weights)

        # Determine overall threat level
        if multiplier >= 1.7:
            threat_level = "RED ALERT"
        elif multiplier >= 1.3:
            threat_level = "AMBER WARNING"
        else:
            threat_level = "GREEN / NORMAL"

        return {
            "threat_level": threat_level,
            "risk_multiplier": round(multiplier, 2),
            "active_alerts": alerts if alerts else ["Normal weather conditions prevailing"],
            "material_stress_index": round(msi, 3),
            "parameters": {
                "rainfall_mm": rainfall_mm,
                "wind_speed_kmh": wind_speed_kmh,
                "temperature_c": temperature_c,
                "humidity_pct": effective_humidity
            }
        }
