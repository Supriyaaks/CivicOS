"""
CivicOS - Person 3: Predictive Intelligence & Urban Risk Engine
Synthetic Dataset Generator
"""

import csv
import random
from datetime import datetime, timedelta
from pathlib import Path

# Fix seed for reproducibility
random.seed(42)

# Incident taxonomy definitions
INCIDENT_TYPES = [
    {
        "type": "Flooding / Waterlogging",
        "category": "Environmental",
        "impact_radius_range": (300, 1500),
        "affected_pop_range": (1500, 12000),
        "severity_range": (6.5, 9.5),
        "actions": [
            "Deploy High-Capacity Dewatering Pumps",
            "Clear Stormwater Drain Inlets",
            "Issue Local Flood Advisory & Evacuation Warning",
        ],
        "economic_range": (200000, 2500000),
    },
    {
        "type": "Water Main Break",
        "category": "Utilities",
        "impact_radius_range": (100, 600),
        "affected_pop_range": (800, 7000),
        "severity_range": (5.0, 8.5),
        "actions": [
            "Isolate Sector Valve & Dispatch Pipe Repair Crew",
            "Deploy Emergency Drinking Water Tankers",
            "Reinforce Road Sub-base Around Leak",
        ],
        "economic_range": (150000, 1200000),
    },
    {
        "type": "Power Outage",
        "category": "Utilities",
        "impact_radius_range": (500, 2500),
        "affected_pop_range": (3000, 25000),
        "severity_range": (5.5, 8.8),
        "actions": [
            "Dispatch Substation Line Repair Crew",
            "Reroute Feeder Grid Line",
            "Activate Critical Facility Backup Generators",
        ],
        "economic_range": (300000, 3500000),
    },
    {
        "type": "Traffic Signal Failure",
        "category": "Traffic & Transport",
        "impact_radius_range": (50, 300),
        "affected_pop_range": (1200, 10000),
        "severity_range": (4.0, 7.5),
        "actions": [
            "Deploy Manual Traffic Marshals immediately",
            "Reset UPS / Power Supply Unit",
            "Reroute Heavy Vehicles via Bypass",
        ],
        "economic_range": (50000, 500000),
    },
    {
        "type": "Tree Fall",
        "category": "Infrastructure",
        "impact_radius_range": (20, 150),
        "affected_pop_range": (200, 3000),
        "severity_range": (4.5, 8.0),
        "actions": [
            "Dispatch Forestry / Tree Clearance Team with Chainsaws",
            "Isolate Fallen Overhead Cables",
            "Cordon Road Section and Divert Traffic",
        ],
        "economic_range": (30000, 400000),
    },
    {
        "type": "Pothole / Road Damage",
        "category": "Infrastructure",
        "impact_radius_range": (10, 80),
        "affected_pop_range": (500, 5000),
        "severity_range": (3.0, 6.5),
        "actions": [
            "Deploy Cold-Mix Asphalt Quick Patch Crew",
            "Install Reflective Warning Barricades",
            "Schedule Milling and Full Resurfacing",
        ],
        "economic_range": (25000, 300000),
    },
    {
        "type": "Sewer Overflow",
        "category": "Public Safety",
        "impact_radius_range": (50, 250),
        "affected_pop_range": (400, 3500),
        "severity_range": (5.0, 7.8),
        "actions": [
            "Dispatch Jetting & Super Sucker Vacuum Trucks",
            "Disinfect Surrounding Public Walkway",
            "Inspect Downstream Trunk Line Blockage",
        ],
        "economic_range": (80000, 600000),
    },
    {
        "type": "Gas Leak Report",
        "category": "Public Safety",
        "impact_radius_range": (150, 800),
        "affected_pop_range": (1000, 8000),
        "severity_range": (7.5, 9.8),
        "actions": [
            "Immediate 300m Perimeter Cordon & Evacuation",
            "Shut Off Distribution Sector Valve",
            "Deploy Gas Detection & Hazmat Fire Unit",
        ],
        "economic_range": (500000, 4500000),
    },
    {
        "type": "Fire Hazard",
        "category": "Public Safety",
        "impact_radius_range": (100, 600),
        "affected_pop_range": (800, 9000),
        "severity_range": (7.0, 9.9),
        "actions": [
            "Dispatch Water Tenders & Fire Rescue Units",
            "Cut Local Power Grid Feed",
            "Establish Green Corridor for Emergency Vehicles",
        ],
        "economic_range": (600000, 5000000),
    },
    {
        "type": "Flyover / Bridge Defect",
        "category": "Infrastructure",
        "impact_radius_range": (200, 1200),
        "affected_pop_range": (5000, 30000),
        "severity_range": (6.8, 9.4),
        "actions": [
            "Immediate Lane Restriction / Heavy Vehicle Ban",
            "Deploy Structural Engineering Inspection Crew",
            "Install Structural Health Sensor Array",
        ],
        "economic_range": (1000000, 8000000),
    },
]

ZONES = [
    {"name": "Central Zone", "lat_center": 12.9716, "lon_center": 77.5946, "wards": ["Ward-101 (MG Road)", "Ward-102 (Shivajinagar)", "Ward-103 (Sampangiram)"]},
    {"name": "East Zone", "lat_center": 12.9850, "lon_center": 77.6400, "wards": ["Ward-111 (Indiranagar)", "Ward-112 (HAL)", "Ward-113 (Whitefield)"]},
    {"name": "South Zone", "lat_center": 12.9250, "lon_center": 77.5850, "wards": ["Ward-121 (Jayanagar)", "Ward-122 (JP Nagar)", "Ward-123 (BTM Layout)"]},
    {"name": "West Zone", "lat_center": 12.9600, "lon_center": 77.5400, "wards": ["Ward-131 (Rajajinagar)", "Ward-132 (Malleshwaram)", "Ward-133 (Vijayanagar)"]},
    {"name": "North Zone", "lat_center": 13.0300, "lon_center": 77.5900, "wards": ["Ward-141 (Hebbal)", "Ward-142 (Yelahanka)", "Ward-143 (Peenya)"]},
]

WEATHER_CONDITIONS = [
    {"condition": "Clear", "rain_range": (0.0, 0.0), "wind_range": (5.0, 15.0), "temp_range": (24.0, 34.0), "humidity_range": (30.0, 50.0)},
    {"condition": "Light Rain", "rain_range": (2.0, 12.0), "wind_range": (10.0, 25.0), "temp_range": (22.0, 28.0), "humidity_range": (60.0, 80.0)},
    {"condition": "Heavy Rain", "rain_range": (35.0, 75.0), "wind_range": (20.0, 45.0), "temp_range": (20.0, 25.0), "humidity_range": (80.0, 95.0)},
    {"condition": "Thunderstorm", "rain_range": (50.0, 115.0), "wind_range": (35.0, 70.0), "temp_range": (19.0, 24.0), "humidity_range": (85.0, 100.0)},
    {"condition": "High Winds", "rain_range": (0.0, 15.0), "wind_range": (40.0, 65.0), "temp_range": (22.0, 30.0), "humidity_range": (40.0, 70.0)},
    {"condition": "Extreme Heat", "rain_range": (0.0, 0.0), "wind_range": (4.0, 12.0), "temp_range": (35.0, 41.0), "humidity_range": (20.0, 40.0)},
]

STATUSES = ["Reported", "Investigating", "In Progress", "Mitigated", "Resolved"]

def generate_records(num_records=130):
    start_time = datetime(2026, 9, 1, 6, 0, 0)
    records = []

    for i in range(1, num_records + 1):
        incident_id = f"INC-{1000 + i}"

        # Pick random archetype
        archetype = random.choice(INCIDENT_TYPES)
        zone_info = random.choice(ZONES)
        ward = random.choice(zone_info["wards"])

        # Coordinates jittered slightly around zone center
        lat = round(zone_info["lat_center"] + random.uniform(-0.025, 0.025), 5)
        lon = round(zone_info["lon_center"] + random.uniform(-0.025, 0.025), 5)

        # Weather
        if archetype["type"] in ["Flooding / Waterlogging", "Tree Fall"]:
            weather = random.choice([WEATHER_CONDITIONS[2], WEATHER_CONDITIONS[3], WEATHER_CONDITIONS[4]])
        else:
            weather = random.choice(WEATHER_CONDITIONS)

        rain_mm = round(random.uniform(*weather["rain_range"]), 1)
        wind_kmh = round(random.uniform(*weather["wind_range"]), 1)
        temp_c = round(random.uniform(*weather["temp_range"]), 1)
        humidity_pct = round(random.uniform(*weather["humidity_range"]), 1)

        # Timestamp
        minutes_offset = random.randint(30, 240)
        start_time += timedelta(minutes=minutes_offset)
        timestamp_str = start_time.strftime("%Y-%m-%d %H:%M:%S")

        # Severity & Impact
        severity = round(random.uniform(*archetype["severity_range"]), 1)
        impact_radius = int(random.uniform(*archetype["impact_radius_range"]))
        affected_pop = int(random.uniform(*archetype["affected_pop_range"]))
        economic_impact = int(random.uniform(*archetype["economic_range"]))

        # Cascading relationships
        parent_id = ""
        cascading_flag = 0
        if len(records) > 5 and random.random() < 0.28:
            candidate = random.choice(records[-10:])
            parent_id = candidate["incident_id"]
            cascading_flag = 1
        elif severity >= 7.5 or weather["condition"] in ["Heavy Rain", "Thunderstorm"]:
            cascading_flag = 1 if random.random() < 0.65 else 0
        else:
            cascading_flag = 0

        # Priority score calculation
        weather_factor = 1.3 if weather["condition"] in ["Heavy Rain", "Thunderstorm"] else 1.0
        cascading_factor = 1.25 if cascading_flag == 1 else 1.0
        pop_factor = min(affected_pop / 10000.0, 2.0)

        raw_priority = (severity * 6.5) + (pop_factor * 10.0) + (cascading_factor * 8.0) * weather_factor
        priority_score = min(max(int(raw_priority), 15), 100)

        # Prevention Impact Score
        prevention_score = min(max(int(priority_score * random.uniform(0.75, 0.98)), 20), 99)

        action = random.choice(archetype["actions"])
        status = random.choice(STATUSES)

        records.append({
            "incident_id": incident_id,
            "timestamp": timestamp_str,
            "incident_type": archetype["type"],
            "category": archetype["category"],
            "zone": zone_info["name"],
            "ward": ward,
            "latitude": lat,
            "longitude": lon,
            "severity_score": severity,
            "impact_radius_meters": impact_radius,
            "affected_population": affected_pop,
            "weather_condition": weather["condition"],
            "rainfall_mm": rain_mm,
            "wind_speed_kmh": wind_kmh,
            "temperature_c": temp_c,
            "humidity_pct": humidity_pct,
            "status": status,
            "parent_incident_id": parent_id,
            "cascading_risk_flag": cascading_flag,
            "priority_score": priority_score,
            "recommended_action": action,
            "prevention_impact_score": prevention_score,
            "estimated_economic_impact_inr": economic_impact
        })

    return records

def save_csv(filename="data/raw/urban_incidents.csv", records=None):
    if records is None:
        records = generate_records(130)

    # Ensure directory exists
    file_path = Path(filename)
    file_path.parent.mkdir(parents=True, exist_ok=True)

    fieldnames = list(records[0].keys())
    with open(file_path, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)
    print(f"Successfully generated {len(records)} records in {filename}")

if __name__ == "__main__":
    save_csv()
