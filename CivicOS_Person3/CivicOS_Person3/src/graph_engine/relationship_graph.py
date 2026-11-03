"""
Urban Incident Relationship Graph & Cascading Impact Engine
-----------------------------------------------------------
Features Addressed:
- Feature 1: Urban Incident Relationship Graph
- Feature 4: Cascading Impact Prediction

This module uses NetworkX to:
1. Build an urban incident relationship network based on:
   - Recorded parent-child triggers
   - Known problem causal relationships
   - Geographical proximity (Haversine distance)
   - Shared ward and municipal zone affinity
2. Generate interactive Plotly network visualizations.
3. Compute rule-based cascading impact predictions (Secondary and Tertiary
   consequences with reasons, risk levels, loop prevention, and tree visualization).
"""

import math
from typing import Dict, List, Optional, Tuple, Any, Set
import networkx as nx
import pandas as pd
import plotly.graph_objects as go


# ===========================================================================
# 1. GEOGRAPHICAL UTILITIES
# ===========================================================================

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance between two GPS points on Earth
    using the Haversine formula. Returns distance in kilometers (km).
    """
    earth_radius_km = 6371.0

    # Convert decimal degrees to radians
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    # Haversine formula
    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    distance_km = earth_radius_km * c
    return round(distance_km, 3)


# ===========================================================================
# 2. KNOWN URBAN CAUSAL RELATIONSHIPS CATALOG
# ===========================================================================

# Defines documented domain cause-and-effect pairings between urban infrastructure issues
KNOWN_CAUSAL_AFFINITIES: Dict[str, List[str]] = {
    "Flooding / Waterlogging": [
        "Traffic Signal Failure",
        "Power Outage",
        "Pothole / Road Damage",
        "Sewer Overflow",
    ],
    "Tree Fall": [
        "Power Outage",
        "Traffic Signal Failure",
        "Pothole / Road Damage",
    ],
    "Water Main Break": [
        "Flooding / Waterlogging",
        "Pothole / Road Damage",
        "Sewer Overflow",
    ],
    "Power Outage": [
        "Traffic Signal Failure",
        "Flooding / Waterlogging",  # Pumping station failure
    ],
    "Gas Leak Report": [
        "Fire Hazard",
        "Power Outage",  # Emergency shutoff
    ],
    "Fire Hazard": [
        "Power Outage",
        "Flyover / Bridge Defect",
    ],
    "Flyover / Bridge Defect": [
        "Traffic Signal Failure",
        "Pothole / Road Damage",
    ],
    "Sewer Overflow": [
        "Flooding / Waterlogging",
        "Pothole / Road Damage",
    ],
    "Pothole / Road Damage": [
        "Traffic Signal Failure",
    ],
    "Traffic Signal Failure": [],
}


# ===========================================================================
# 3. FEATURE 1: URBAN INCIDENT RELATIONSHIP GRAPH ENGINE
# ===========================================================================

class IncidentGraphEngine:
    """
    NetworkX-powered engine to build, analyze, and query urban incident relationship graphs.
    """

    def __init__(self):
        # We use a directed graph so causal propagation has a clear direction
        self.graph = nx.DiGraph()
        self.incidents_df: Optional[pd.DataFrame] = None

    def build_graph_from_dataframe(
        self,
        df: pd.DataFrame,
        max_proximity_km: float = 2.0,
        min_weight_threshold: float = 0.35,
    ) -> nx.DiGraph:
        """
        Build the relationship graph from an incidents DataFrame.
        
        Links are established through:
        1. Explicit parent-child triggers (`parent_incident_id`) -> Weight 1.00
        2. Known problem affinity within geographical proximity (< 2.0 km) -> Weight 0.85
        3. Immediate spatial proximity (< 1.0 km) -> Weight 0.65
        4. Same Ward & related category cluster -> Weight 0.50
        """
        self.incidents_df = df.copy()
        self.graph.clear()

        # Step 1: Add all incidents as nodes with rich metadata
        for _, row in df.iterrows():
            inc_id = str(row["incident_id"]).strip()
            self.graph.add_node(
                inc_id,
                incident_id=inc_id,
                incident_type=str(row.get("incident_type", "Unknown")),
                category=str(row.get("category", "General")),
                zone=str(row.get("zone", "Citywide")),
                ward=str(row.get("ward", "N/A")),
                latitude=float(row.get("latitude", 0.0)),
                longitude=float(row.get("longitude", 0.0)),
                severity_score=float(row.get("severity_score", 5.0)),
                priority_score=float(row.get("priority_score", 50.0)),
                impact_radius_meters=float(row.get("impact_radius_meters", 100)),
                affected_population=int(row.get("affected_population", 500)),
                weather_condition=str(row.get("weather_condition", "Clear")),
                rainfall_mm=float(row.get("rainfall_mm", 0.0)),
                wind_speed_kmh=float(row.get("wind_speed_kmh", 0.0)),
                status=str(row.get("status", "Reported")),
                recommended_action=str(row.get("recommended_action", "Investigate")),
                parent_incident_id=str(row.get("parent_incident_id", "")).strip(),
                timestamp=str(row.get("timestamp", ""))
            )

        # Step 2: Establish edges
        nodes = list(self.graph.nodes(data=True))

        for i in range(len(nodes)):
            id_a, data_a = nodes[i]
            parent_a = data_a.get("parent_incident_id", "")

            # 2a. Direct Parent-Child link (if recorded in historical logs)
            if parent_a and parent_a != "nan" and parent_a in self.graph:
                self.graph.add_edge(
                    parent_a,
                    id_a,
                    relationship_type="PARENT_TRIGGER",
                    label="Direct Trigger",
                    weight=1.00,
                    distance_km=calculate_haversine_distance(
                        self.graph.nodes[parent_a]["latitude"],
                        self.graph.nodes[parent_a]["longitude"],
                        data_a["latitude"],
                        data_a["longitude"],
                    ),
                    description=f"{self.graph.nodes[parent_a]['incident_type']} directly triggered {data_a['incident_type']}"
                )

            # 2b. Evaluate pairwise spatial and problem affinity relationships
            for j in range(i + 1, len(nodes)):
                id_b, data_b = nodes[j]

                # Fast filter: skip comparing across different zones to prevent quadratic explosion
                if data_a["zone"] != data_b["zone"]:
                    continue

                dist_km = calculate_haversine_distance(
                    data_a["latitude"], data_a["longitude"],
                    data_b["latitude"], data_b["longitude"]
                )

                type_a = data_a["incident_type"]
                type_b = data_b["incident_type"]
                same_ward = (data_a["ward"] == data_b["ward"])

                # Check if type_a is known to trigger type_b
                a_triggers_b = type_b in KNOWN_CAUSAL_AFFINITIES.get(type_a, [])
                b_triggers_a = type_a in KNOWN_CAUSAL_AFFINITIES.get(type_b, [])

                # Case A: Known Causal Affinity + Geographical Proximity (< max_proximity_km)
                if a_triggers_b and dist_km <= max_proximity_km:
                    weight = round(0.85 - (dist_km / max_proximity_km) * 0.15, 2)
                    if weight >= min_weight_threshold and not self.graph.has_edge(id_a, id_b):
                        self.graph.add_edge(
                            id_a,
                            id_b,
                            relationship_type="CAUSAL_AFFINITY_PROXIMATE",
                            label=f"Causal Risk ({dist_km} km)",
                            weight=weight,
                            distance_km=dist_km,
                            description=f"{type_a} typically induces {type_b} within spatial proximity"
                        )

                elif b_triggers_a and dist_km <= max_proximity_km:
                    weight = round(0.85 - (dist_km / max_proximity_km) * 0.15, 2)
                    if weight >= min_weight_threshold and not self.graph.has_edge(id_b, id_a):
                        self.graph.add_edge(
                            id_b,
                            id_a,
                            relationship_type="CAUSAL_AFFINITY_PROXIMATE",
                            label=f"Causal Risk ({dist_km} km)",
                            weight=weight,
                            distance_km=dist_km,
                            description=f"{type_b} typically induces {type_a} within spatial proximity"
                        )

                # Case B: Close Spatial Proximity (< 0.8 km) regardless of known affinity
                elif dist_km <= 0.8:
                    weight = round(0.65 - (dist_km / 0.8) * 0.20, 2)
                    if weight >= min_weight_threshold and not self.graph.has_edge(id_a, id_b):
                        self.graph.add_edge(
                            id_a,
                            id_b,
                            relationship_type="SPATIAL_PROXIMITY",
                            label=f"Spatial Close ({dist_km} km)",
                            weight=weight,
                            distance_km=dist_km,
                            description=f"Close geographical co-location ({dist_km} km) in {data_a['ward']}"
                        )

                # Case C: Same Ward + Same Category
                elif same_ward and data_a["category"] == data_b["category"]:
                    weight = 0.50
                    if weight >= min_weight_threshold and not self.graph.has_edge(id_a, id_b):
                        self.graph.add_edge(
                            id_a,
                            id_b,
                            relationship_type="WARD_CATEGORY_CLUSTER",
                            label=f"Same Ward Cluster",
                            weight=weight,
                            distance_km=dist_km,
                            description=f"Co-located in {data_a['ward']} sharing '{data_a['category']}' domain"
                        )

        return self.graph

    def get_connected_incidents(self, incident_id: str) -> List[Dict[str, Any]]:
        """
        Retrieve all incidents connected to a given incident (both incoming and outgoing).
        """
        if incident_id not in self.graph:
            return []

        connected = []

        # Outgoing edges (incidents this incident affects)
        for successor in self.graph.successors(incident_id):
            edge_data = self.graph.get_edge_data(incident_id, successor) or {}
            target_data = self.graph.nodes[successor]
            connected.append({
                "incident_id": successor,
                "incident_type": target_data.get("incident_type"),
                "direction": "Outgoing (Triggers / Affects)",
                "relationship_type": edge_data.get("relationship_type", "RELATED"),
                "label": edge_data.get("label", "Connected"),
                "weight": edge_data.get("weight", 0.5),
                "distance_km": edge_data.get("distance_km", 0.0),
                "description": edge_data.get("description", ""),
                "zone": target_data.get("zone"),
                "ward": target_data.get("ward"),
                "severity_score": target_data.get("severity_score"),
                "priority_score": target_data.get("priority_score"),
                "status": target_data.get("status"),
            })

        # Incoming edges (incidents affecting this incident)
        for predecessor in self.graph.predecessors(incident_id):
            edge_data = self.graph.get_edge_data(predecessor, incident_id) or {}
            source_data = self.graph.nodes[predecessor]
            connected.append({
                "incident_id": predecessor,
                "incident_type": source_data.get("incident_type"),
                "direction": "Incoming (Triggered / Influenced By)",
                "relationship_type": edge_data.get("relationship_type", "RELATED"),
                "label": edge_data.get("label", "Connected"),
                "weight": edge_data.get("weight", 0.5),
                "distance_km": edge_data.get("distance_km", 0.0),
                "description": edge_data.get("description", ""),
                "zone": source_data.get("zone"),
                "ward": source_data.get("ward"),
                "severity_score": source_data.get("severity_score"),
                "priority_score": source_data.get("priority_score"),
                "status": source_data.get("status"),
            })

        # Sort by relationship weight descending
        connected.sort(key=lambda x: x["weight"], reverse=True)
        return connected

    def get_graph_summary(self) -> Dict[str, Any]:
        """
        Return structural metrics and top connected hubs of the graph.
        """
        if self.graph.number_of_nodes() == 0:
            return {"total_nodes": 0, "total_edges": 0}

        in_degrees = dict(self.graph.in_degree())
        out_degrees = dict(self.graph.out_degree())
        total_degrees = {k: in_degrees.get(k, 0) + out_degrees.get(k, 0) for k in self.graph.nodes()}

        top_hubs = sorted(total_degrees.items(), key=lambda item: item[1], reverse=True)[:5]
        top_hubs_info = [
            {
                "incident_id": node_id,
                "incident_type": self.graph.nodes[node_id].get("incident_type"),
                "dominant_type": self.graph.nodes[node_id].get("incident_type"),
                "connections": count,
                "severity_score": self.graph.nodes[node_id].get("severity_score"),
                "ward": self.graph.nodes[node_id].get("ward"),
                "zone": self.graph.nodes[node_id].get("zone", self.graph.nodes[node_id].get("ward")),
            }
            for node_id, count in top_hubs
        ]

        return {
            "total_nodes": self.graph.number_of_nodes(),
            "total_edges": self.graph.number_of_edges(),
            "graph_density": round(nx.density(self.graph), 4),
            "density": round(nx.density(self.graph), 4),
            "is_directed": self.graph.is_directed(),
            "top_connected_incidents": top_hubs_info,
            "top_connected_hubs": top_hubs_info,
        }

    def generate_plotly_figure(
        self,
        selected_incident_id: Optional[str] = None,
        max_nodes_to_display: int = 50,
        subgraph_only: bool = False,
    ) -> go.Figure:
        """
        Generate an interactive 2D node-link Plotly figure of the graph.
        
        Highlights selected incident and its immediate ego-network.
        """
        # Determine nodes to display
        if selected_incident_id and selected_incident_id in self.graph:
            if subgraph_only:
                # Extract ego subgraph (depth 1 neighborhood)
                sub_nodes = set([selected_incident_id])
                sub_nodes.update(self.graph.successors(selected_incident_id))
                sub_nodes.update(self.graph.predecessors(selected_incident_id))
                display_graph = self.graph.subgraph(sub_nodes).copy()
            else:
                display_graph = self.graph.copy()
        else:
            display_graph = self.graph.copy()

        # If too many nodes, sample top connected nodes
        if display_graph.number_of_nodes() > max_nodes_to_display and not subgraph_only:
            degrees = dict(display_graph.degree())
            top_nodes = sorted(degrees, key=degrees.get, reverse=True)[:max_nodes_to_display]
            if selected_incident_id and selected_incident_id not in top_nodes:
                top_nodes.append(selected_incident_id)
            display_graph = display_graph.subgraph(top_nodes).copy()

        if display_graph.number_of_nodes() == 0:
            fig = go.Figure()
            fig.update_layout(title="No incidents available to visualize.")
            return fig

        # Compute 2D layout coordinates using fixed seed for stable visual orientation
        pos = nx.spring_layout(display_graph, k=0.45, iterations=50, seed=42)

        # 1. Build Edge Traces
        edge_x = []
        edge_y = []

        highlight_edge_x = []
        highlight_edge_y = []

        for edge in display_graph.edges(data=True):
            u, v, data = edge
            x0, y0 = pos[u]
            x1, y1 = pos[v]

            is_connected_to_selection = (
                selected_incident_id and (u == selected_incident_id or v == selected_incident_id)
            )

            if is_connected_to_selection:
                highlight_edge_x.extend([x0, x1, None])
                highlight_edge_y.extend([y0, y1, None])
            else:
                edge_x.extend([x0, x1, None])
                edge_y.extend([y0, y1, None])

        normal_edges_trace = go.Scatter(
            x=edge_x,
            y=edge_y,
            line=dict(width=1.0, color="#CBD5E1"),
            hoverinfo="none",
            mode="lines",
            showlegend=False,
        )

        highlight_edges_trace = go.Scatter(
            x=highlight_edge_x,
            y=highlight_edge_y,
            line=dict(width=2.5, color="#EF4444"),
            hoverinfo="none",
            mode="lines",
            name="Selected Incident Links",
            showlegend=True,
        )

        # 2. Build Node Traces
        node_x = []
        node_y = []
        node_text = []
        node_colors = []
        node_sizes = []

        category_palette = {
            "Environmental": "#0284C7",      # Blue
            "Utilities": "#F59E0B",          # Amber
            "Infrastructure": "#10B981",     # Emerald
            "Traffic & Transport": "#8B5CF6",# Purple
            "Public Safety": "#EF4444",      # Red
        }

        for node in display_graph.nodes():
            x, y = pos[node]
            node_x.append(x)
            node_y.append(y)

            data = display_graph.nodes[node]
            inc_type = data.get("incident_type", "Incident")
            severity = data.get("severity_score", 5.0)
            priority = data.get("priority_score", 50.0)
            zone = data.get("zone", "Citywide")
            ward = data.get("ward", "N/A")
            cat = data.get("category", "General")
            status = data.get("status", "Reported")
            in_deg = display_graph.in_degree(node)
            out_deg = display_graph.out_degree(node)

            # Node size proportional to severity
            size = max(int(severity * 2.8), 12)
            if node == selected_incident_id:
                size += 10

            node_sizes.append(size)

            # Pick color from category palette
            node_colors.append(category_palette.get(cat, "#64748B"))

            tooltip = (
                f"<b>ID:</b> {node}<br>"
                f"<b>Type:</b> {inc_type}<br>"
                f"<b>Category:</b> {cat}<br>"
                f"<b>Ward:</b> {ward} ({zone})<br>"
                f"<b>Severity:</b> {severity}/10<br>"
                f"<b>Priority:</b> {priority}/100<br>"
                f"<b>Status:</b> {status}<br>"
                f"<b>Connections:</b> {in_deg} in / {out_deg} out"
            )
            node_text.append(tooltip)

        nodes_trace = go.Scatter(
            x=node_x,
            y=node_y,
            mode="markers+text",
            text=[node if (display_graph.number_of_nodes() <= 20 or node == selected_incident_id) else "" for node in display_graph.nodes()],
            textposition="top center",
            textfont=dict(size=10, color="#1E293B"),
            hoverinfo="text",
            hovertext=node_text,
            marker=dict(
                size=node_sizes,
                color=node_colors,
                line=dict(width=1.5, color="#FFFFFF"),
                opacity=0.92,
            ),
            name="Urban Incidents",
            showlegend=True,
        )

        fig = go.Figure(data=[normal_edges_trace, highlight_edges_trace, nodes_trace])
        fig.update_layout(
            title="Urban Incident Relationship Graph (NetworkX)",
            title_font=dict(size=16),
            showlegend=True,
            hovermode="closest",
            margin=dict(b=20, l=20, r=20, t=50),
            xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            plot_bgcolor="#F8FAFC",
            paper_bgcolor="#FFFFFF",
            legend=dict(x=0.01, y=0.99, bgcolor="rgba(255,255,255,0.85)")
        )

        return fig


# ===========================================================================
# 4. FEATURE 4: CASCADING IMPACT PREDICTION ENGINE (RULE-BASED)
# ===========================================================================

# Detailed Rule-Based Consequence Playbook for Urban Consequence Propagation
# Defines Secondary and Tertiary consequences with reasons and subsystems
CASCADING_RULES: Dict[str, Dict[str, Any]] = {
    "Flooding / Waterlogging": {
        "secondary": [
            {
                "consequence": "Road Surface Inundation & Lane Submersion",
                "subsystem": "Surface Transportation",
                "reason": "Water accumulates beyond curb capacity, submerging carriageways and stalling vehicular traffic.",
                "base_risk": "HIGH",
                "time_horizon": "15 - 45 mins",
                "preventive_break_action": "Deploy dewatering suction pumps to low underpasses and clear drain trash racks.",
                "tertiary": [
                    {
                        "consequence": "Severe Arterial Gridlock & Emergency Vehicle Delay",
                        "subsystem": "Emergency Services & Transit",
                        "reason": "Impassable flooded corridors force traffic diversions onto parallel feeder roads causing network gridlock.",
                        "base_risk": "CRITICAL",
                        "time_horizon": "1 - 3 hours",
                        "preventive_break_action": "Broadcast digital traffic detours via VMS boards and station traffic wardens at key junctions.",
                    },
                    {
                        "consequence": "Asphalt Sub-base Potholing & Structural Weakening",
                        "subsystem": "Road Infrastructure",
                        "reason": "Prolonged standing water seeps into bitumen binder, rapidly creating deep potholes under traffic load.",
                        "base_risk": "MODERATE",
                        "time_horizon": "3 - 8 hours",
                        "preventive_break_action": "Barricade submerged lanes to prevent heavy vehicle axel stress on softened pavement.",
                    }
                ]
            },
            {
                "consequence": "Underground Transformer Vault & Feeder Tripping",
                "subsystem": "Power Distribution Grid",
                "reason": "Stormwater seepage into subterranean conduits trips moisture-sensitive electrical switchgear.",
                "base_risk": "HIGH",
                "time_horizon": "30 - 90 mins",
                "preventive_break_action": "Remotely inspect vault telemetry and engage sump pump systems in underground chambers.",
                "tertiary": [
                    {
                        "consequence": "Critical Facility (Hospitals / Water Pumps) Blackout",
                        "subsystem": "Essential Public Utilities",
                        "reason": "Feeder failure cuts power to downstream pumping stations and clinics relying on grid stability.",
                        "base_risk": "CRITICAL",
                        "time_horizon": "1 - 4 hours",
                        "preventive_break_action": "Auto-switch essential feeders to auxiliary substation and start diesel backup generators.",
                    }
                ]
            }
        ]
    },
    "Tree Fall": {
        "secondary": [
            {
                "consequence": "Downed Overhead Electrical & Telecom Cables",
                "subsystem": "Electrical & Telecom Utilities",
                "reason": "Heavy branches snap high-tension overhead distribution lines and fiber telecom cables.",
                "base_risk": "CRITICAL",
                "time_horizon": "Immediate (< 15 mins)",
                "preventive_break_action": "Trigger automated feeder isolation at the zonal substation to prevent electrocution hazards.",
                "tertiary": [
                    {
                        "consequence": "Multi-Ward Localized Power Outage",
                        "subsystem": "Power Distribution Grid",
                        "reason": "Snapped trunk line forces substation breakers open, cutting power to neighboring domestic sectors.",
                        "base_risk": "HIGH",
                        "time_horizon": "30 mins - 2 hours",
                        "preventive_break_action": "Deploy rapid line-repair crews with cherry-pickers to splice and re-string cables.",
                    }
                ]
            },
            {
                "consequence": "Full Carriageway Blockage",
                "subsystem": "Road Transportation",
                "reason": "Tree trunk blocks both lanes of the corridor, halting public transport and car traffic.",
                "base_risk": "HIGH",
                "time_horizon": "Immediate",
                "preventive_break_action": "Deploy forestry chain-saw team with front-loader to slice and shift trunk to shoulder.",
                "tertiary": [
                    {
                        "consequence": "Mass Transit Bus Rerouting & Bottleneck Congestion",
                        "subsystem": "Public Transit",
                        "reason": "Bus routes must divert into narrow residential bypasses unable to handle heavy axle traffic.",
                        "base_risk": "MODERATE",
                        "time_horizon": "1 - 3 hours",
                        "preventive_break_action": "Enforce dynamic one-way flow on alternate streets using traffic marshals.",
                    }
                ]
            }
        ]
    },
    "Water Main Break": {
        "secondary": [
            {
                "consequence": "High-Pressure Sub-Surface Soil Erosion & Void Formation",
                "subsystem": "Civil Infrastructure",
                "reason": "Pressurized water washouts soil ballast beneath asphalt, forming invisible subterranean caverns.",
                "base_risk": "HIGH",
                "time_horizon": "30 mins - 2 hours",
                "preventive_break_action": "Shut sector isolation valve immediately to arrest continuous pressurized soil washout.",
                "tertiary": [
                    {
                        "consequence": "Catastrophic Road Cave-In / Sinkhole",
                        "subsystem": "Road Safety",
                        "reason": "Unsupported asphalt shell collapses under vehicular weight creating a sudden hazardous sinkhole.",
                        "base_risk": "CRITICAL",
                        "time_horizon": "2 - 6 hours",
                        "preventive_break_action": "Deploy concrete perimeter barricades around the leak perimeter to ban heavy vehicular transit.",
                    }
                ]
            },
            {
                "consequence": "Drinking Water Contamination & Domestic Supply Cutoff",
                "subsystem": "Potable Water Supply",
                "reason": "Loss of water pressure creates negative pipe vacuum, drawing in surrounding groundwater and sewage.",
                "base_risk": "HIGH",
                "time_horizon": "1 - 3 hours",
                "preventive_break_action": "Issue boil-water advisory and mobilize civic potable water tankers to affected residential blocks.",
                "tertiary": [
                    {
                        "consequence": "Public Health Waterborne Disease Cluster Risk",
                        "subsystem": "Public Health",
                        "reason": "Ingestion of back-siphoned contaminated tap water causes localized gastroenteritis cases.",
                        "base_risk": "CRITICAL",
                        "time_horizon": "12 - 24 hours",
                        "preventive_break_action": "Perform high-dose chlorine flush and lab sampling before certifying water line restoration.",
                    }
                ]
            }
        ]
    },
    "Power Outage": {
        "secondary": [
            {
                "consequence": "Simultaneous Traffic Signal Deactivation at Major Intersections",
                "subsystem": "Traffic Systems",
                "reason": "UPS batteries deplete after 30 minutes, turning key traffic signal heads completely dark.",
                "base_risk": "HIGH",
                "time_horizon": "30 - 60 mins",
                "preventive_break_action": "Dispatch traffic police to direct manual flow and install portable solar battery packs.",
                "tertiary": [
                    {
                        "consequence": "Intersection Chaos, Gridlock & Vehicle T-Bone Accidents",
                        "subsystem": "Public Safety & Traffic",
                        "reason": "Absence of signal phasing leads to competitive vehicle entry and side-impact collision risk.",
                        "base_risk": "CRITICAL",
                        "time_horizon": "1 - 3 hours",
                        "preventive_break_action": "Convert 4-way junctions to temporary roundabout priority rules with reflective cones.",
                    }
                ]
            },
            {
                "consequence": "Municipal Stormwater & Sewer Lift Pumping Stations Inoperable",
                "subsystem": "Sanitation & Drainage",
                "reason": "Lift station pumps require 3-phase grid power to evacuate effluent out of low basins.",
                "base_risk": "HIGH",
                "time_horizon": "1 - 2 hours",
                "preventive_break_action": "Activate on-site diesel generator sets and verify fuel reserves at lift stations.",
                "tertiary": [
                    {
                        "consequence": "Raw Sewage Backflow into Residential Basements",
                        "subsystem": "Urban Sanitation",
                        "reason": "Non-functioning pumps cause sewer trunk lines to surcharge and back up into ground floor plumbing.",
                        "base_risk": "CRITICAL",
                        "time_horizon": "2 - 5 hours",
                        "preventive_break_action": "Deploy mobile bypass jetting pumps to divert wastewater into open storm channels as emergency relief.",
                    }
                ]
            }
        ]
    },
    "Gas Leak Report": {
        "secondary": [
            {
                "consequence": "Flammable Vapor Cloud Accumulation in Low Confined Spaces",
                "subsystem": "Hazardous Materials & Safety",
                "reason": "Natural gas / LPG leaks settle into stormwater drains, basements, and utility conduits.",
                "base_risk": "CRITICAL",
                "time_horizon": "Immediate (< 15 mins)",
                "preventive_break_action": "Establish 300-meter exclusion zone and ban vehicle ignition, smoking, and cell phones.",
                "tertiary": [
                    {
                        "consequence": "Vapor Cloud Flash Fire or Explosion",
                        "subsystem": "Urban Safety & Fire Protection",
                        "reason": "Any electrical spark, vehicle starter, or open flame ignites trapped gas mixture.",
                        "base_risk": "CRITICAL",
                        "time_horizon": "15 - 45 mins",
                        "preventive_break_action": "Mist fine water curtains into cloud to disperse vapors and shut main pipeline transmission valve.",
                    }
                ]
            }
        ]
    },
    "Fire Hazard": {
        "secondary": [
            {
                "consequence": "Structural Compromise & Smoke Plume Dispersion",
                "subsystem": "Public Health & Structures",
                "reason": "Radiant heat degrades load-bearing masonry/steel while toxic smoke drifts into nearby communities.",
                "base_risk": "HIGH",
                "time_horizon": "15 - 45 mins",
                "preventive_break_action": "Evacuate downwind buildings and set up structural cooling monitor nozzles.",
                "tertiary": [
                    {
                        "consequence": "Structural Wall Collapse onto Public Roadway",
                        "subsystem": "Infrastructure & Transport",
                        "reason": "Thermal expansion buckles steel columns leading to facade collapse onto the street.",
                        "base_risk": "CRITICAL",
                        "time_horizon": "1 - 3 hours",
                        "preventive_break_action": "Establish 1.5x building height collapse buffer zone and cordon off roadway.",
                    }
                ]
            }
        ]
    },
    "Flyover / Bridge Defect": {
        "secondary": [
            {
                "consequence": "Structural Bearing Strain & Emergency Lane Closure",
                "subsystem": "Bridge Infrastructure",
                "reason": "Expansion joint rupture or deck spalling forces lane restrictions to avoid live load failure.",
                "base_risk": "HIGH",
                "time_horizon": "Immediate",
                "preventive_break_action": "Prohibit heavy commercial vehicles (> 3 axles) and enforce 20 km/h speed limit.",
                "tertiary": [
                    {
                        "consequence": "Major Urban Transit Corridor Paralysis",
                        "subsystem": "Regional Transportation",
                        "reason": "Closing a grade-separated bridge pushes 40,000+ daily commuter vehicles onto surface intersections.",
                        "base_risk": "CRITICAL",
                        "time_horizon": "2 - 6 hours",
                        "preventive_break_action": "Establish dynamic contra-flow on the healthy bridge span and activate signal bypass timing.",
                    }
                ]
            }
        ]
    },
    "Sewer Overflow": {
        "secondary": [
            {
                "consequence": "Bacterial Contamination of Pedestrian Sidewalks & Roads",
                "subsystem": "Public Sanitation",
                "reason": "Raw sewage carrying pathogens spills onto public walkways, posing immediate biohazard.",
                "base_risk": "HIGH",
                "time_horizon": "30 mins - 1 hour",
                "preventive_break_action": "Deploy high-pressure vacuum trucks and spray sodium hypochlorite disinfectant.",
                "tertiary": [
                    {
                        "consequence": "Contaminated Drainage Runoff Infiltrating Open Lakes",
                        "subsystem": "Environmental Ecosystem",
                        "reason": "Spilled sewage enters roadside stormwater inlets that discharge untreated into urban lakes.",
                        "base_risk": "MODERATE",
                        "time_horizon": "2 - 6 hours",
                        "preventive_break_action": "Install temporary sandbag check-dams to block effluent from lake entry points.",
                    }
                ]
            }
        ]
    },
    "Traffic Signal Failure": {
        "secondary": [
            {
                "consequence": "Intersection Deadlock & Transit Delays",
                "subsystem": "Traffic Operations",
                "reason": "Without phased right-of-way, conflicting vehicle streams lock junction center.",
                "base_risk": "MODERATE",
                "time_horizon": "15 - 30 mins",
                "preventive_break_action": "Station two manual traffic marshals with whistle and hand signals immediately.",
                "tertiary": [
                    {
                        "consequence": "Multi-Kilometer Queue Spillback onto Ring Road",
                        "subsystem": "Arterial Network",
                        "reason": "Junction gridlock prevents clearance of feeder approaches, backing up arterial highway traffic.",
                        "base_risk": "HIGH",
                        "time_horizon": "1 - 2 hours",
                        "preventive_break_action": "Adjust upstream green timings to throttle incoming vehicle flow until junction clears.",
                    }
                ]
            }
        ]
    },
    "Pothole / Road Damage": {
        "secondary": [
            {
                "consequence": "Sudden Vehicular Braking & Two-Wheeler Skid Accidents",
                "subsystem": "Traffic Safety",
                "reason": "Motorcyclists swerve abruptly or hit submerged rim-bending craters, causing skids.",
                "base_risk": "HIGH",
                "time_horizon": "Immediate",
                "preventive_break_action": "Place retro-reflective warning barrels and deploy rapid cold-mix asphalt patch team.",
                "tertiary": [
                    {
                        "consequence": "Corridor Throughput Drop & Tailback Congestion",
                        "subsystem": "Urban Mobility",
                        "reason": "Vehicles slowing to crawling speed to navigate road depressions causes phantom traffic jams.",
                        "base_risk": "MODERATE",
                        "time_horizon": "1 - 3 hours",
                        "preventive_break_action": "Smooth lane transition by temporary rubber ramp placement until night paving crew arrives.",
                    }
                ]
            }
        ]
    }
}


class CascadingImpactEngine:
    """
    Rule-based cascading impact prediction engine.
    
    Explains the causal chain from root incident through secondary and tertiary
    consequences with explicit reasons, loop prevention, risk levels, and tree visuals.
    Supports graph-aware risk evaluation through IncidentGraphEngine integration.
    """

    def __init__(self, graph_engine: Optional[Any] = None):
        self.graph_engine = graph_engine

    def predict_cascade(
        self,
        incident_type: str,
        severity_score: float = 7.0,
        rainfall_mm: float = 0.0,
        wind_speed_kmh: float = 0.0,
        cascading_risk_flag: int = 1,
        root_id: str = "ROOT-01",
        graph_engine: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Evaluate and return the full multi-stage cascading consequences.
        
        Guaranteed:
        - Transparent rule-based logic (no fake ML claims).
        - No infinite loops (strictly DAG-bounded depth).
        - No duplicate consequences (unique set tracker).
        - Graph-aware risk evaluation when IncidentGraphEngine is provided.
        - Selective amplification: only structural PARENT_TRIGGER or strong CAUSAL_AFFINITY
          amplify risk. Spatial proximity alone does not arbitrarily amplify risk.
        """
        # Look up rule playbook for this incident type (fallback to Flooding if unknown)
        rule_data = CASCADING_RULES.get(incident_type, CASCADING_RULES["Flooding / Waterlogging"])

        consequences: List[Dict[str, Any]] = []
        visited_consequences: Set[str] = set()

        # Weather and severity amplifier
        is_weather_severe = (rainfall_mm >= 50.0 or wind_speed_kmh >= 45.0)

        # Graph-aware risk evaluation
        active_graph_engine = graph_engine or self.graph_engine
        graph_amplified = False
        graph_context = "No relationship graph engine attached; relying strictly on domain rules."
        connected_causal_nodes: List[Dict[str, Any]] = []

        if active_graph_engine is not None and hasattr(active_graph_engine, "graph"):
            if root_id in active_graph_engine.graph:
                connected = active_graph_engine.get_connected_incidents(root_id)
                # Selective risk amplification:
                # Only PARENT_TRIGGER or strong CAUSAL_AFFINITY (weight >= 0.70) amplify risk.
                # Spatial proximity alone does NOT amplify cascading risk.
                for edge in connected:
                    rel_type = edge.get("relationship_type", "")
                    weight = edge.get("weight", 0.0)
                    direction = edge.get("direction", "")
                    if "Outgoing" in direction and (rel_type == "PARENT_TRIGGER" or (rel_type == "CAUSAL_AFFINITY" and weight >= 0.70)):
                        connected_causal_nodes.append(edge)

                if connected_causal_nodes:
                    graph_amplified = True
                    node_ids = [n["incident_id"] for n in connected_causal_nodes[:3]]
                    graph_context = (
                        f"Graph risk amplification active: {len(connected_causal_nodes)} causal triggers "
                        f"identified ({', '.join(node_ids)})."
                    )
                else:
                    graph_context = (
                        "Incident present in graph, but no high-affinity causal triggers found. "
                        "Risk not amplified by graph topology."
                    )
            else:
                graph_context = f"Incident '{root_id}' not found in active graph topology; standard domain rules applied."

        def determine_adjusted_risk(base_risk: str, depth: int) -> str:
            """Adjust consequence risk level based on root severity, weather, and graph topology."""
            if severity_score >= 8.5 or (is_weather_severe and depth == 1) or (graph_amplified and depth == 1 and base_risk == "HIGH"):
                return "CRITICAL"
            if severity_score >= 6.5 or is_weather_severe or (graph_amplified and depth == 1):
                return "HIGH" if base_risk != "CRITICAL" else "CRITICAL"
            return base_risk

        # Step 1: Process Secondary Consequences (Stage 1 from Root)
        sec_idx = 1
        for sec in rule_data.get("secondary", []):
            conseq_name = sec["consequence"]
            if conseq_name in visited_consequences:
                continue
            visited_consequences.add(conseq_name)

            sec_id = f"SEC-{sec_idx}"
            sec_risk = determine_adjusted_risk(sec["base_risk"], depth=1)

            sec_node = {
                "consequence_id": sec_id,
                "parent_id": root_id,
                "stage": "Secondary",
                "depth": 1,
                "name": conseq_name,
                "subsystem": sec["subsystem"],
                "reason": sec["reason"],
                "risk_level": sec_risk,
                "time_horizon": sec["time_horizon"],
                "preventive_break_action": sec["preventive_break_action"],
            }
            consequences.append(sec_node)

            # Step 2: Process Tertiary Consequences (Stage 2 from Secondary)
            tert_idx = 1
            for tert in sec.get("tertiary", []):
                tert_name = tert["consequence"]
                if tert_name in visited_consequences:
                    continue
                visited_consequences.add(tert_name)

                tert_id = f"TERT-{sec_idx}-{tert_idx}"
                tert_risk = determine_adjusted_risk(tert["base_risk"], depth=2)

                tert_node = {
                    "consequence_id": tert_id,
                    "parent_id": sec_id,
                    "stage": "Tertiary",
                    "depth": 2,
                    "name": tert_name,
                    "subsystem": tert["subsystem"],
                    "reason": tert["reason"],
                    "risk_level": tert_risk,
                    "time_horizon": tert["time_horizon"],
                    "preventive_break_action": tert["preventive_break_action"],
                }
                consequences.append(tert_node)
                tert_idx += 1

            sec_idx += 1

        # Summary calculations
        critical_count = sum(1 for c in consequences if c["risk_level"] == "CRITICAL")
        high_count = sum(1 for c in consequences if c["risk_level"] == "HIGH")

        overall_threat = (
            "CRITICAL CASCADE DANGER" if critical_count >= 2
            else "HIGH PROPAGATION RISK" if (critical_count >= 1 or high_count >= 2)
            else "MODERATE CONSTRAINED CASCADE"
        )

        return {
            "root_incident_id": root_id,
            "root_incident_type": incident_type,
            "root_severity": severity_score,
            "weather_amplified": is_weather_severe,
            "graph_amplified": graph_amplified,
            "graph_context": graph_context,
            "connected_causal_nodes_count": len(connected_causal_nodes),
            "overall_threat_level": overall_threat,
            "total_consequences_predicted": len(consequences),
            "critical_consequences_count": critical_count,
            "high_consequences_count": high_count,
            "consequences": consequences,
            "prediction_type": "Deterministic Domain Rule-Based Simulation (Transparent Causal Modeling)"
        }

    def generate_cascade_tree_plotly(self, cascade_result: Dict[str, Any]) -> go.Figure:
        """
        Generate an interactive tree graph visualization of the cascade propagation.
        
        Root (Level 0) -> Secondary (Level 1) -> Tertiary (Level 2).
        """
        root_type = cascade_result.get("root_incident_type", "Root Incident")
        root_id = cascade_result.get("root_incident_id", "ROOT")
        consequences = cascade_result.get("consequences", [])

        if not consequences:
            fig = go.Figure()
            fig.update_layout(title="No cascade consequences to display.")
            return fig

        # Organize by depth levels for clean tree positioning
        level_nodes: Dict[int, List[Dict[str, Any]]] = {0: [{"id": root_id, "name": root_type, "risk": "ROOT"}], 1: [], 2: []}

        for c in consequences:
            depth = c["depth"]
            level_nodes[depth].append({
                "id": c["consequence_id"],
                "parent_id": c["parent_id"],
                "name": c["name"],
                "risk": c["risk_level"],
                "subsystem": c["subsystem"],
                "reason": c["reason"],
                "time_horizon": c["time_horizon"],
                "break_action": c["preventive_break_action"],
            })

        # Calculate coordinates: X represents level (0, 1, 2); Y distributes nodes vertically
        node_coords: Dict[str, Tuple[float, float]] = {root_id: (0.0, 0.5)}

        for level in [1, 2]:
            nodes = level_nodes[level]
            count = len(nodes)
            for i, n in enumerate(nodes):
                y = (i + 1.0) / (count + 1.0)
                node_coords[n["id"]] = (float(level), y)

        # Build Edges
        edge_x = []
        edge_y = []
        for c in consequences:
            cid = c["consequence_id"]
            pid = c["parent_id"]
            if pid in node_coords and cid in node_coords:
                x0, y0 = node_coords[pid]
                x1, y1 = node_coords[cid]
                edge_x.extend([x0, x1, None])
                edge_y.extend([y0, y1, None])

        edges_trace = go.Scatter(
            x=edge_x,
            y=edge_y,
            mode="lines",
            line=dict(width=2.0, color="#94A3B8"),
            hoverinfo="none",
            showlegend=False,
        )

        # Build Nodes
        node_x = []
        node_y = []
        node_text = []
        node_colors = []
        node_labels = []

        risk_color_map = {
            "ROOT": "#0F172A",       # Dark slate
            "CRITICAL": "#DC2626",   # Bright Red
            "HIGH": "#EA580C",       # Orange
            "MODERATE": "#0284C7",   # Blue
            "LOW": "#10B981",        # Emerald
        }

        # 1. Root Node
        rx, ry = node_coords[root_id]
        node_x.append(rx)
        node_y.append(ry)
        node_colors.append(risk_color_map["ROOT"])
        node_labels.append(f"Root: {root_type}")
        node_text.append(f"<b>Root Incident:</b> {root_type}<br><b>ID:</b> {root_id}")

        # 2. Consequence Nodes
        for c in consequences:
            cid = c["consequence_id"]
            cx, cy = node_coords[cid]
            node_x.append(cx)
            node_y.append(cy)

            color = risk_color_map.get(c["risk_level"], "#64748B")
            node_colors.append(color)

            # Short label for canvas
            words = c["name"].split()
            short_label = " ".join(words[:3]) + "..." if len(words) > 3 else c["name"]
            node_labels.append(f"[{c['risk_level']}] {short_label}")

            tooltip = (
                f"<b>Stage:</b> {c['stage']} Consequence<br>"
                f"<b>Consequence:</b> {c['name']}<br>"
                f"<b>Subsystem:</b> {c['subsystem']}<br>"
                f"<b>Risk Level:</b> {c['risk_level']}<br>"
                f"<b>Time Horizon:</b> {c['time_horizon']}<br>"
                f"<b>Causal Reason:</b> {c['reason']}<br>"
                f"<b>Cascade Breaker Action:</b> {c['preventive_break_action']}"
            )
            node_text.append(tooltip)

        nodes_trace = go.Scatter(
            x=node_x,
            y=node_y,
            mode="markers+text",
            text=node_labels,
            textposition="top center",
            textfont=dict(size=10, color="#0F172A"),
            hoverinfo="text",
            hovertext=node_text,
            marker=dict(
                size=[24 if i == 0 else 18 for i in range(len(node_x))],
                color=node_colors,
                line=dict(width=2, color="#FFFFFF"),
            ),
            showlegend=False,
        )

        fig = go.Figure(data=[edges_trace, nodes_trace])
        fig.update_layout(
            title="Cascading Consequence Propagation Tree (Root ➔ Secondary ➔ Tertiary)",
            title_font=dict(size=15),
            margin=dict(b=30, l=40, r=40, t=50),
            xaxis=dict(
                tickmode="array",
                tickvals=[0, 1, 2],
                ticktext=["Root Incident", "Secondary Impact (0 - 2 hrs)", "Tertiary Knock-On (2 - 8 hrs)"],
                showgrid=True,
                zeroline=False,
                range=[-0.25, 2.35]
            ),
            yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            plot_bgcolor="#F8FAFC",
            paper_bgcolor="#FFFFFF",
        )

        return fig
