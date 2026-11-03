
"""
CivicOS - Universal Location Intelligence Engine
Stage 1: Location selection and geographic filtering.
"""

import math
import pandas as pd


class LocationIntelligenceEngine:

    REQUIRED_COLUMNS = [
        "incident_id",
        "zone",
        "ward",
        "latitude",
        "longitude"
    ]

    def __init__(self, incidents_df):

        self.df = incidents_df.copy()

        missing = [
            col for col in self.REQUIRED_COLUMNS
            if col not in self.df.columns
        ]

        if missing:
            raise ValueError(
                f"Dataset is missing required columns: {missing}"
            )

        self.df["latitude"] = pd.to_numeric(
            self.df["latitude"], errors="coerce"
        )

        self.df["longitude"] = pd.to_numeric(
            self.df["longitude"], errors="coerce"
        )

        self.df = self.df.dropna(
            subset=["latitude", "longitude"]
        )

        self.df = self.df[
            self.df["latitude"].between(-90, 90)
            & self.df["longitude"].between(-180, 180)
        ]

    @staticmethod
    def haversine_distance(lat1, lon1, lat2, lon2):

        earth_radius_km = 6371.0

        lat1, lon1, lat2, lon2 = map(
            math.radians,
            [lat1, lon1, lat2, lon2]
        )

        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(lat1)
            * math.cos(lat2)
            * math.sin(dlon / 2) ** 2
        )

        return 2 * earth_radius_km * math.asin(
            math.sqrt(a)
        )

    def get_location_options(self):

        return {
            "available_location_levels": [
                "zone",
                "ward",
                "radius",
                "bounding_box"
            ],
            "zones": sorted(
                self.df["zone"].dropna().astype(str).unique().tolist()
            ),
            "wards": sorted(
                self.df["ward"].dropna().astype(str).unique().tolist()
            ),
            "data_source": "Current CivicOS incidents dataset"
        }

    def filter_by_zone(self, zone):

        if not zone or not zone.strip():
            raise ValueError("Zone name cannot be empty")

        result = self.df[
            self.df["zone"].astype(str).str.casefold()
            == zone.strip().casefold()
        ]

        if result.empty:
            raise ValueError(f"No incidents found for zone: {zone}")

        return result.copy()

    def filter_by_ward(self, ward):

        if not ward or not ward.strip():
            raise ValueError("Ward name cannot be empty")

        result = self.df[
            self.df["ward"].astype(str).str.casefold()
            == ward.strip().casefold()
        ]

        if result.empty:
            raise ValueError(f"No incidents found for ward: {ward}")

        return result.copy()

    def filter_by_radius(
        self, latitude, longitude, radius_km
    ):

        if not -90 <= latitude <= 90:
            raise ValueError("Latitude must be between -90 and 90")

        if not -180 <= longitude <= 180:
            raise ValueError("Longitude must be between -180 and 180")

        if not 0 < radius_km <= 500:
            raise ValueError("Radius must be greater than 0 and at most 500 km")

        distances = self.df.apply(
            lambda row: self.haversine_distance(
                latitude,
                longitude,
                row["latitude"],
                row["longitude"]
            ),
            axis=1
        )

        result = self.df[distances <= radius_km].copy()
        result["distance_from_selected_location_km"] = (
            distances[distances <= radius_km].values
        )

        return result

    def filter_by_bounding_box(
        self, min_lat, min_lon, max_lat, max_lon
    ):

        if not (
            -90 <= min_lat <= 90
            and -90 <= max_lat <= 90
            and -180 <= min_lon <= 180
            and -180 <= max_lon <= 180
        ):
            raise ValueError("Invalid geographic coordinates")

        if min_lat > max_lat or min_lon > max_lon:
            raise ValueError("Minimum coordinates cannot exceed maximum coordinates")

        result = self.df[
            self.df["latitude"].between(min_lat, max_lat)
            & self.df["longitude"].between(min_lon, max_lon)
        ]

        return result.copy()

    def get_location_summary(self, selected_df):

        if selected_df.empty:
            return {
                "total_incidents": 0,
                "message": "No incidents found in this location"
            }

        summary = {
            "total_incidents": int(len(selected_df)),
            "data_source": "Current CivicOS incidents dataset"
        }

        for column in [
            "category",
            "incident_type",
            "status",
            "severity_score"
        ]:
            if column in selected_df.columns:

                if column == "severity_score":
                    summary["average_severity"] = round(
                        float(selected_df[column].mean()), 2
                    )
                else:
                    summary[column + "_distribution"] = (
                        selected_df[column]
                        .value_counts()
                        .to_dict()
                    )

        return summary
