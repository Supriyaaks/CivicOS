"""
CivicOS - Person 3: Predictive Intelligence & Urban Risk Engine
Weather Risk Test Suite
"""

import sys
from pathlib import Path
import unittest

# Setup sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.weather.weather_risk_engine import WeatherRiskEngine
from src.config import HUMIDITY_THRESHOLD_PCT

class TestWeatherRiskEngine(unittest.TestCase):
    def setUp(self):
        self.engine = WeatherRiskEngine()

    def test_baseline_normal_conditions(self):
        """Test that normal weather returns GREEN / NORMAL threat level."""
        result = self.engine.evaluate_weather_risk(
            rainfall_mm=0.0,
            wind_speed_kmh=10.0,
            temperature_c=25.0,
            humidity_pct=50.0,
            zone="Central Zone"
        )
        self.assertEqual(result["threat_level"], "GREEN / NORMAL")
        self.assertEqual(result["risk_multiplier"], 1.0)

    def test_rainfall_thresholds(self):
        """Test rainfall boundaries and zone weighting."""
        # South Zone has rainfall weight 1.3. 30mm * 1.3 = 39.0 (Above 30.0 warning)
        res_south = self.engine.evaluate_weather_risk(
            rainfall_mm=30.0, wind_speed_kmh=10.0, temperature_c=25.0, zone="South Zone"
        )
        self.assertIn("WARNING: Moderate rainfall", res_south["active_alerts"][0])
        self.assertGreater(res_south["risk_multiplier"], 1.0)

        # 70mm * 1.3 = 91.0 (Above 70.0 critical)
        res_critical = self.engine.evaluate_weather_risk(
            rainfall_mm=70.0, wind_speed_kmh=10.0, temperature_c=25.0, zone="South Zone"
        )
        self.assertIn("CRITICAL: Severe precipitation", res_critical["active_alerts"][0])
        self.assertEqual(res_critical["threat_level"], "AMBER WARNING") # Multiplier ~ 1.6

    def test_wind_thresholds(self):
        """Test wind speed boundaries."""
        # 40kmh * 1.0 (Central) = 40.0 (Above 30.0 advisory)
        res_advisory = self.engine.evaluate_weather_risk(
            rainfall_mm=0.0, wind_speed_kmh=40.0, temperature_c=25.0
        )
        self.assertIn("ADVISORY: Breezy/gusty winds", res_advisory["active_alerts"][0])

        # 60kmh * 1.0 = 60.0 (Above 50.0 critical)
        res_critical = self.engine.evaluate_weather_risk(
            rainfall_mm=0.0, wind_speed_kmh=60.0, temperature_c=25.0
        )
        self.assertIn("CRITICAL: High wind alert", res_critical["active_alerts"][0])

    def test_humidity_impact(self):
        """Test humidity as a standalone risk factor."""
        res_low_hum = self.engine.evaluate_weather_risk(
            0.0, 10.0, 25.0, humidity_pct=40.0
        )
        res_high_hum = self.engine.evaluate_weather_risk(
            0.0, 10.0, 25.0, humidity_pct=HUMIDITY_THRESHOLD_PCT + 5
        )
        self.assertGreater(res_high_hum["risk_multiplier"], res_low_hum["risk_multiplier"])
        self.assertIn("ADVISORY: High humidity", res_high_hum["active_alerts"][0])

    def test_compound_risk_rain_humidity(self):
        """Test interaction: High Rain + High Humidity."""
        # Rain 40mm (impact > 30) + Humidity 80%
        result = self.engine.evaluate_weather_risk(
            rainfall_mm=40.0,
            wind_speed_kmh=10.0,
            temperature_c=25.0,
            humidity_pct=80.0
        )
        # Should have both the rainfall warning AND the compound risk warning
        alerts = result["active_alerts"]
        self.assertTrue(any("Moderate rainfall" in a for a in alerts))
        self.assertTrue(any("Compound Risk - High humidity exacerbating waterlogging" in a for a in alerts))

    def test_compound_risk_heat_humidity(self):
        """Test interaction: Extreme Heat + High Humidity."""
        # Temp 40C (impact > 35) + Humidity 80%
        result = self.engine.evaluate_weather_risk(
            rainfall_mm=0.0,
            wind_speed_kmh=10.0,
            temperature_c=40.0,
            humidity_pct=80.0
        )
        alerts = result["active_alerts"]
        self.assertTrue(any("Heatwave alert" in a for a in alerts))
        self.assertTrue(any("Compound Risk - High heat index" in a for a in alerts))

    def test_red_alert_threshold(self):
        """Test that extreme combined conditions trigger RED ALERT."""
        # High Rain (0.6) + High Wind (0.4) + High Temp (0.25) + Humidity (0.1) + Interaction (0.15)
        # Total approx 1.5 + 1.0 = 2.5
        result = self.engine.evaluate_weather_risk(
            rainfall_mm=100.0,
            wind_speed_kmh=80.0,
            temperature_c=42.0,
            humidity_pct=90.0,
            zone="South Zone"
        )
        self.assertEqual(result["threat_level"], "RED ALERT")
        self.assertGreaterEqual(result["risk_multiplier"], 1.7)

if __name__ == "__main__":
    unittest.main()
