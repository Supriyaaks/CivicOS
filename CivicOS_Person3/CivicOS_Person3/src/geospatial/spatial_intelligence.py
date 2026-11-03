"""
Geospatial Intelligence Engine
------------------------------
Feature Addressed:
- Feature 2: Geospatial Intelligence

This module provides:
1. GPS mapping and GeoJSON layer generation for all urban incidents.
2. Spatial impact-radius buffer circle geometry generation.
3. Spatial hotspot detection and clustering using DBSCAN with haversine distance.
4. Municipal zonal and ward-level incident density aggregation.
5. Interactive Plotly OpenStreetMap visualization.
"""

import math
from typing import Dict, List, Optional, Any, Tuple
import numpy as np
import pandas as pd
import plotly.graph_objects as go
from sklearn.cluster import DBSCAN


def _scatter_map(**kwargs):
    if hasattr(go, "Scattermap"):
        return go.Scattermap(**kwargs)
    elif hasattr(go, "Scattermapbox"):
        return go.Scattermapbox(**kwargs)
    return go.Scatter(**kwargs)


class SpatialIntelligenceEngine:
    """
    GIS and Spatial Analytics engine for CivicOS urban incidents.
    """

    def __init__(self, data_path: Optional[str] = None):
        self.data_path = data_path

    # -----------------------------------------------------------------------
    # 1. Hotspot Clustering via DBSCAN (Haversine Metric)
    # -----------------------------------------------------------------------
    def detect_spatial_hotspots(
        self,
        df: pd.DataFrame,
        eps_km: float = 1.5,
        min_samples: int = 3
    ) -> Tuple[pd.DataFrame, List[Dict[str, Any]]]:
        """
        Identify geographic incident clusters and high-risk hotspots using DBSCAN.
        
        Args:
            df: DataFrame containing 'latitude' and 'longitude'
            eps_km: Maximum distance in kilometers between two points to be considered neighbors
            min_samples: Minimum number of incidents required to form a cluster
            
        Returns:
            Tuple of (DataFrame with 'cluster_id' column, List of cluster summary dicts)
        """
        if df.empty or not {"latitude", "longitude"}.issubset(df.columns):
            return df.copy(), []

        df_clustered = df.copy()

        # Convert decimal degrees to radians for haversine distance
        coords_rad = np.radians(df_clustered[["latitude", "longitude"]].values)
        
        # Earth radius in kilometers
        earth_radius_km = 6371.0
        eps_rad = eps_km / earth_radius_km

        dbscan = DBSCAN(eps=eps_rad, min_samples=min_samples, metric="haversine")
        df_clustered["cluster_id"] = dbscan.fit_predict(coords_rad)

        # Summarize detected clusters (cluster_id >= 0; -1 denotes noise / isolated incidents)
        hotspot_summaries = []
        cluster_groups = df_clustered[df_clustered["cluster_id"] >= 0].groupby("cluster_id")

        for cluster_id, group in cluster_groups:
            center_lat = float(group["latitude"].mean())
            center_lon = float(group["longitude"].mean())
            avg_severity = float(group["severity_score"].mean()) if "severity_score" in group.columns else 5.0
            
            # Determine hotspot risk level
            if avg_severity >= 7.8:
                risk_tier = "CRITICAL HOTSPOT"
            elif avg_severity >= 6.5:
                risk_tier = "HIGH RISK HOTSPOT"
            else:
                risk_tier = "MODERATE HOTSPOT"

            # Dominant incident type in cluster
            dominant_type = str(group["incident_type"].mode()[0]) if "incident_type" in group.columns else "Mixed"
            zones = group["zone"].unique().tolist() if "zone" in group.columns else []
            wards = group["ward"].unique().tolist() if "ward" in group.columns else []
            total_pop = int(group["affected_population"].sum()) if "affected_population" in group.columns else 0

            hotspot_summaries.append({
                "cluster_id": int(cluster_id),
                "center_latitude": round(center_lat, 5),
                "center_longitude": round(center_lon, 5),
                "incident_count": len(group),
                "average_severity": round(avg_severity, 2),
                "risk_tier": risk_tier,
                "dominant_incident_type": dominant_type,
                "zones_covered": zones,
                "wards_covered": wards,
                "total_affected_population": total_pop,
                "incident_ids": group["incident_id"].tolist() if "incident_id" in group.columns else []
            })

        # Sort hotspots by incident count descending
        hotspot_summaries.sort(key=lambda x: (x["incident_count"], x["average_severity"]), reverse=True)
        return df_clustered, hotspot_summaries

    # -----------------------------------------------------------------------
    # 2. Municipal Zone and Ward Incident Density
    # -----------------------------------------------------------------------
    def get_zone_density_summary(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Aggregate incident counts, average severity, and population exposure by municipal zone.
        """
        if df.empty or "zone" not in df.columns:
            return []

        summaries = []
        for zone_name, group in df.groupby("zone"):
            high_sev_count = int((group["severity_score"] >= 7.0).sum()) if "severity_score" in group.columns else 0
            cascading_count = int((group["cascading_risk_flag"] == 1).sum()) if "cascading_risk_flag" in group.columns else 0
            avg_sev = float(group["severity_score"].mean()) if "severity_score" in group.columns else 0.0
            total_pop = int(group["affected_population"].sum()) if "affected_population" in group.columns else 0

            summaries.append({
                "zone": str(zone_name),
                "incident_count": len(group),
                "average_severity": round(avg_sev, 2),
                "high_severity_count": high_sev_count,
                "cascading_incidents_count": cascading_count,
                "total_affected_population": total_pop,
                "total_population": total_pop,
                "unique_wards": group["ward"].nunique() if "ward" in group.columns else 0
            })

        summaries.sort(key=lambda x: x["incident_count"], reverse=True)
        return summaries

    # -----------------------------------------------------------------------
    # 3. GeoJSON Map Layers Generator
    # -----------------------------------------------------------------------
    def generate_map_layers_geojson(self, df: pd.DataFrame, eps_km: float = 1.5) -> Dict[str, Any]:
        """
        Serializes incident points and hotspot clusters into standard GeoJSON FeatureCollection.
        """
        df_clustered, hotspots = self.detect_spatial_hotspots(df, eps_km=eps_km)
        features = []

        for _, row in df_clustered.iterrows():
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [float(row["longitude"]), float(row["latitude"])]
                },
                "properties": {
                    "incident_id": str(row.get("incident_id")),
                    "incident_type": str(row.get("incident_type")),
                    "category": str(row.get("category")),
                    "zone": str(row.get("zone")),
                    "ward": str(row.get("ward")),
                    "severity_score": float(row.get("severity_score", 5.0)),
                    "priority_score": float(row.get("priority_score", 50.0)),
                    "impact_radius_meters": float(row.get("impact_radius_meters", 100)),
                    "affected_population": int(row.get("affected_population", 500)),
                    "status": str(row.get("status", "Reported")),
                    "cluster_id": int(row.get("cluster_id", -1))
                }
            })

        return {
            "type": "FeatureCollection",
            "metadata": {
                "total_features": len(features),
                "hotspots_detected": len(hotspots),
                "hotspot_summaries": hotspots
            },
            "features": features
        }

    # -----------------------------------------------------------------------
    # 4. Impact Radius Buffer Coordinates Calculator
    # -----------------------------------------------------------------------
    @staticmethod
    def create_circle_buffer_coordinates(
        lat: float,
        lon: float,
        radius_meters: float,
        num_points: int = 32
    ) -> Tuple[List[float], List[float]]:
        """
        Generates boundary polygon coordinates (lat, lon) for an impact radius circle.
        """
        # Approximations: 1 deg lat ~ 111,320 meters; 1 deg lon ~ 111,320 * cos(lat)
        lat_step = radius_meters / 111320.0
        lon_step = radius_meters / (111320.0 * math.cos(math.radians(lat)))

        circle_lats = []
        circle_lons = []
        for i in range(num_points + 1):
            theta = 2.0 * math.pi * (i / num_points)
            circle_lats.append(lat + lat_step * math.sin(theta))
            circle_lons.append(lon + lon_step * math.cos(theta))

        return circle_lats, circle_lons

    # -----------------------------------------------------------------------
    # 5. Interactive Plotly OpenStreetMap Figure
    # -----------------------------------------------------------------------
    def generate_plotly_map(
        self,
        df: pd.DataFrame,
        show_impact_buffers: bool = True,
        enable_hotspots: bool = True,
        eps_km: float = 1.5,
        min_samples: int = 3,
        highlight_incident_id: Optional[str] = None
    ) -> go.Figure:
        """
        Renders an interactive OpenStreetMap figure with:
        - Category-based incident markers sized by severity
        - Semi-transparent impact radius buffer boundaries
        - Hotspot cluster centroid indicators
        """
        if df.empty:
            fig = go.Figure()
            fig.update_layout(title="No incident locations available to map.")
            return fig

        # Run hotspot clustering
        if enable_hotspots:
            df_plot, hotspots = self.detect_spatial_hotspots(df, eps_km=eps_km, min_samples=min_samples)
        else:
            df_plot = df.copy()
            df_plot["cluster_id"] = -1
            hotspots = []

        fig = go.Figure()

        # Category palette
        category_palette = {
            "Environmental": "#0284C7",      # Blue
            "Utilities": "#F59E0B",          # Amber
            "Infrastructure": "#10B981",     # Green
            "Traffic & Transport": "#8B5CF6",# Purple
            "Public Safety": "#EF4444",      # Red
        }

        # 5a. Impact Radius Buffer Circles (if enabled)
        if show_impact_buffers:
            buffer_lat = []
            buffer_lon = []
            
            # Take incidents (or high severity ones if dataset is dense)
            sample_for_buffers = df_plot.sort_values(by="severity_score", ascending=False) if hasattr(df_plot, "sort_values") else df_plot
            for _, row in sample_for_buffers.iterrows():
                radius = float(row.get("impact_radius_meters", 150))
                clats, clons = self.create_circle_buffer_coordinates(
                    float(row["latitude"]),
                    float(row["longitude"]),
                    radius_meters=radius,
                    num_points=24
                )
                buffer_lat.extend(clats + [None])
                buffer_lon.extend(clons + [None])

            buffer_trace = _scatter_map(
                lat=buffer_lat,
                lon=buffer_lon,
                mode="lines",
                line=dict(width=1.2, color="rgba(239, 68, 68, 0.45)"),
                hoverinfo="none",
                name="Impact Radius Buffers",
                showlegend=True
            )
            fig.add_trace(buffer_trace)

        # 5b. Incident Markers Grouped by Category
        categories = df_plot["category"].unique() if "category" in df_plot.columns else ["General"]
        for cat in sorted(categories):
            cat_df = df_plot[df_plot["category"] == cat]
            color = category_palette.get(cat, "#64748B")

            hover_text = []
            sizes = []
            for _, row in cat_df.iterrows():
                inc_id = row.get("incident_id")
                sev = row.get("severity_score", 5.0)
                pri = row.get("priority_score", 50.0)
                cluster = row.get("cluster_id", -1)
                cluster_label = f"Hotspot #{cluster}" if cluster >= 0 else "Isolated Point"
                
                tooltip = (
                    f"<b>ID:</b> {inc_id}<br>"
                    f"<b>Type:</b> {row.get('incident_type')}<br>"
                    f"<b>Category:</b> {cat}<br>"
                    f"<b>Ward:</b> {row.get('ward')} ({row.get('zone')})<br>"
                    f"<b>Severity:</b> {sev}/10 | <b>Priority:</b> {pri}/100<br>"
                    f"<b>Impact Radius:</b> {row.get('impact_radius_meters')}m<br>"
                    f"<b>Affected Pop:</b> {row.get('affected_population'):,}<br>"
                    f"<b>Status:</b> {row.get('status')}<br>"
                    f"<b>Cluster:</b> {cluster_label}"
                )
                hover_text.append(tooltip)
                sizes.append(max(int(sev * 2.2), 9))

            cat_trace = _scatter_map(
                lat=cat_df["latitude"],
                lon=cat_df["longitude"],
                mode="markers",
                marker=dict(
                    size=sizes,
                    color=color,
                    opacity=0.90,
                ),
                text=hover_text,
                hoverinfo="text",
                name=f"{cat} ({len(cat_df)})",
                showlegend=True
            )
            fig.add_trace(cat_trace)

        # 5c. Hotspot Centroid Indicators
        if enable_hotspots and hotspots:
            h_lats = [h["center_latitude"] for h in hotspots]
            h_lons = [h["center_longitude"] for h in hotspots]
            h_text = [
                f"<b>🔥 HOTSPOT #{h['cluster_id']}</b><br>"
                f"<b>Tier:</b> {h['risk_tier']}<br>"
                f"<b>Incidents:</b> {h['incident_count']}<br>"
                f"<b>Avg Severity:</b> {h['average_severity']}/10<br>"
                f"<b>Dominant Hazard:</b> {h['dominant_incident_type']}<br>"
                f"<b>Affected Pop:</b> {h['total_affected_population']:,}"
                for h in hotspots
            ]

            hotspot_trace = _scatter_map(
                lat=h_lats,
                lon=h_lons,
                mode="markers+text",
                text=[f"🔥 #{h['cluster_id']}" for h in hotspots],
                textposition="top right",
                textfont=dict(size=12, color="#B91C1C", family="Arial Black"),
                marker=dict(
                    size=16,
                    color="#DC2626",
                    symbol="circle"
                ),
                hovertext=h_text,
                hoverinfo="text",
                name="Hotspot Centers",
                showlegend=True
            )
            fig.add_trace(hotspot_trace)

        # Map Center & Layout (OpenStreetMap - no token needed)
        center_lat = float(df_plot["latitude"].mean()) if not df_plot.empty else 12.9716
        center_lon = float(df_plot["longitude"].mean()) if not df_plot.empty else 77.5946

        map_config = dict(
            style="open-street-map",
            center=dict(lat=center_lat, lon=center_lon),
            zoom=11.2,
        )
        layout_kwargs = dict(
            margin=dict(l=0, r=0, t=35, b=0),
            title="Geospatial Incident Intelligence & Spatial Hotspots (OpenStreetMap)",
            title_font=dict(size=15),
            legend=dict(
                x=0.01,
                y=0.99,
                bgcolor="rgba(255, 255, 255, 0.88)",
                bordercolor="#E2E8F0",
                borderwidth=1
            )
        )
        if hasattr(go, "Scattermap"):
            layout_kwargs["map"] = map_config
        else:
            layout_kwargs["mapbox"] = map_config
        fig.update_layout(**layout_kwargs)

        return fig
