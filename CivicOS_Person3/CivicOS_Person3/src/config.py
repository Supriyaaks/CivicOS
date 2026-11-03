"""
Configuration Module for CivicOS - Person 3
---------------------------------------------
Predictive Intelligence & Urban Risk Engine

Contains centralized configuration parameters, file paths, 
and risk threshold definitions used across all engine modules.
"""

from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
RAW_DATA_PATH = DATA_DIR / "raw" / "urban_incidents.csv"
PROCESSED_DATA_DIR = DATA_DIR / "processed"

# Geospatial Parameters (Bangalore / Metro Urban Grid)
DEFAULT_CITY_CENTER = {"lat": 12.9716, "lon": 77.5946}
CITY_BOUNDS = {
    "min_lat": 12.85,
    "max_lat": 13.15,
    "min_lon": 77.45,
    "max_lon": 77.78,
}

# Risk Threshold Constants
HIGH_SEVERITY_THRESHOLD = 7.0
CRITICAL_PRIORITY_THRESHOLD = 80.0
HEAVY_RAINFALL_THRESHOLD_MM = 50.0
HIGH_WIND_THRESHOLD_KMH = 40.0
HUMIDITY_THRESHOLD_PCT = 80.0

# Zone-Specific Weather Vulnerability Weights
# These are engineering assumptions reflecting varying infrastructure resilience.
# 1.0 is neutral; > 1.0 increases risk sensitivity to weather.
ZONE_WEATHER_VULNERABILITY = {
    "Central Zone": {"rainfall": 1.1, "wind": 1.0, "temp": 1.2, "humidity": 1.0},
    "East Zone": {"rainfall": 1.0, "wind": 1.1, "temp": 1.0, "humidity": 1.1},
    "South Zone": {"rainfall": 1.3, "wind": 1.0, "temp": 1.0, "humidity": 1.2}, # Low-lying, flood-prone
    "West Zone": {"rainfall": 1.0, "wind": 1.2, "temp": 1.1, "humidity": 1.0},
    "North Zone": {"rainfall": 1.1, "wind": 1.1, "temp": 1.0, "humidity": 1.0},
}

# Default vulnerability if zone is missing or unknown
DEFAULT_WEATHER_VULNERABILITY = {"rainfall": 1.0, "wind": 1.0, "temp": 1.0, "humidity": 1.0}

# Supported Incident Types
INCIDENT_TYPES = [
    "Flooding / Waterlogging",
    "Water Main Break",
    "Power Outage",
    "Traffic Signal Failure",
    "Tree Fall",
    "Pothole / Road Damage",
    "Sewer Overflow",
    "Gas Leak Report",
    "Fire Hazard",
    "Flyover / Bridge Defect",
]

# Supported Urban Zones
URBAN_ZONES = [
    "Central Zone",
    "East Zone",
    "South Zone",
    "West Zone",
    "North Zone",
]
