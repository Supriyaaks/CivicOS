"""
CivicOS - Person 3: Predictive Intelligence & Urban Risk Engine
Interactive Command Dashboard (Streamlit & Plotly)
-----------------------------------------------------------------
Visualizes urban incident intelligence, geospatial hotspots, cascading
failure graphs, machine learning predictions, and weather risks.
"""

from pathlib import Path
import sys
import pandas as pd
import numpy as np
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go

# Ensure project root is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.graph_engine.relationship_graph import (
    IncidentGraphEngine,
    CascadingImpactEngine,
    KNOWN_CAUSAL_AFFINITIES,
)
from src.geospatial.spatial_intelligence import SpatialIntelligenceEngine
from src.predictive.risk_predictor import (
    PredictiveRiskEngine,
    NUMERICAL_FEATURES,
    CATEGORICAL_FEATURES,
    EXCLUDED_LEAKAGE_COLUMNS,
)

# 1. Page Configuration
st.set_page_config(
    page_title="CivicOS - Predictive Intelligence & Urban Risk",
    page_icon="🏙️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# 2. File Paths
DATA_PATH = BASE_DIR / "data" / "raw" / "urban_incidents.csv"

# 3. Data Loader with Caching
@st.cache_data
def load_data():
    if not DATA_PATH.exists():
        st.error(f"Dataset not found at {DATA_PATH}")
        return pd.DataFrame()
    return pd.read_csv(DATA_PATH)

df = load_data()

# 4. Engine Cache Singletons
@st.cache_resource
def get_graph_engine(_dataframe):
    engine = IncidentGraphEngine()
    engine.build_graph_from_dataframe(_dataframe)
    return engine

@st.cache_resource
def get_cascade_engine():
    return CascadingImpactEngine()

@st.cache_resource
def get_spatial_engine():
    return SpatialIntelligenceEngine()

@st.cache_resource
def get_predictive_engine(_dataframe):
    engine = PredictiveRiskEngine()
    if not _dataframe.empty:
        engine.train(_dataframe)
    return engine

if not df.empty:
    graph_engine = get_graph_engine(df)
    cascade_engine = get_cascade_engine()
    spatial_engine = get_spatial_engine()
    predictive_engine = get_predictive_engine(df)
else:
    graph_engine = None
    cascade_engine = None
    spatial_engine = None
    predictive_engine = None

# 5. Header Section
st.title("🏙️ CivicOS – Predictive Intelligence & Urban Risk Engine")
st.markdown(
    "**Person 3 Decision Support Microservice**: Urban Incident Relationships, "
    "DBSCAN Geospatial Hotspots, Scikit-learn Risk Forecasting, and Cascading Failure Simulation."
)
st.divider()

if df.empty:
    st.warning("No incident data available. Please generate or check the CSV dataset.")
    st.stop()

# 6. Top KPI Summary Metrics
col1, col2, col3, col4, col5 = st.columns(5)
with col1:
    st.metric("Total Incidents", len(df))
with col2:
    high_sev = len(df[df["severity_score"] >= 7.0])
    st.metric("High Severity (>=7.0)", high_sev, delta=f"{int(high_sev/len(df)*100)}% of total")
with col3:
    cascading = len(df[df["cascading_risk_flag"] == 1])
    st.metric("Cascading Risks Flagged", cascading)
with col4:
    avg_priority = round(df["priority_score"].mean(), 1)
    st.metric("Avg Priority Score", avg_priority)
with col5:
    avg_prevention = round(df["prevention_impact_score"].mean(), 1)
    st.metric("Avg Prevention Impact", avg_prevention)

st.divider()

# 7. Sidebar Navigation & Filtering
st.sidebar.header("🎯 Navigation & View Mode")
feature_selection = st.sidebar.selectbox(
    "Select System View",
    [
        "Overview & Incident Explorer",
        "Feature 1: Relationship Graph",
        "Feature 2: Geospatial Intelligence",
        "Feature 3: Predictive Intelligence",
        "Feature 4: Cascading Impact Prediction",
        "Feature 5: Impact & Severity Scoring",
        "Feature 6: Smart Priority Engine",
        "Feature 7: What-If Simulation",
        "Feature 8: Preventive Action Recommendation",
        "Feature 9: Prevention Impact Score",
        "Feature 10: Weather-Based Risk Analysis"
    ]
)

# Municipal Zone filter for global slices
all_zones = sorted(df["zone"].dropna().unique().tolist())
selected_zones = st.sidebar.multiselect(
    "Filter by Municipal Zone",
    options=all_zones,
    default=all_zones
)

filtered_df = df[df["zone"].isin(selected_zones)]


# ===========================================================================
# VIEW 1: OVERVIEW & INCIDENT EXPLORER
# ===========================================================================
if feature_selection == "Overview & Incident Explorer":
    st.subheader("📍 Overview & Municipal Incident Registry")
    st.markdown("Explore citywide municipal incidents, categorical distributions, and zone densities.")
    
    col_left, col_right = st.columns(2)
    with col_left:
        fig_type = px.bar(
            filtered_df["incident_type"].value_counts().reset_index(),
            x="incident_type",
            y="count",
            color="count",
            title="Incidents by Category & Problem Type",
            labels={"incident_type": "Incident Type", "count": "Frequency"},
            color_continuous_scale="Blues"
        )
        fig_type.update_layout(xaxis_tickangle=-45)
        st.plotly_chart(fig_type, use_container_width=True)
        
    with col_right:
        fig_zone = px.pie(
            filtered_df,
            names="zone",
            title="Incident Distribution Across Municipal Zones",
            hole=0.42,
            color_discrete_sequence=px.colors.qualitative.Pastel
        )
        st.plotly_chart(fig_zone, use_container_width=True)

    st.markdown("### 📋 Municipal Incident Records")
    st.dataframe(filtered_df, use_container_width=True, height=350)


# ===========================================================================
# VIEW 2: FEATURE 1 – URBAN INCIDENT RELATIONSHIP GRAPH
# ===========================================================================
elif feature_selection == "Feature 1: Relationship Graph":
    st.subheader("🕸️ Feature 1: Urban Incident Relationship Graph")
    st.markdown(
        "Analyzes interdependent infrastructure relationships using **NetworkX**. "
        "Edges represent historical causal triggers, known problem domain affinities, "
        "and geographical proximity within urban wards."
    )

    search_col1, search_col2, search_col3 = st.columns([2, 1, 1])

    incident_options = [
        f"{row['incident_id']} | {row['incident_type']} ({row['ward']}) [Sev: {row['severity_score']}]"
        for _, row in df.iterrows()
    ]
    incident_id_map = {opt: opt.split(" | ")[0] for opt in incident_options}

    with search_col1:
        selected_display = st.selectbox(
            "🔍 Search Incident Node",
            options=incident_options,
            index=0
        )
        selected_id = incident_id_map[selected_display]

    with search_col2:
        subgraph_mode = st.radio(
            "Graph View Mode",
            ["Focused Ego-Subgraph (Direct Links)", "Citywide Relationship Graph"],
            index=0
        )
        is_subgraph = (subgraph_mode == "Focused Ego-Subgraph (Direct Links)")

    with search_col3:
        max_dist_slider = st.slider("Proximity Threshold (km)", 0.5, 4.0, 2.0, 0.5)

    graph_engine.build_graph_from_dataframe(df, max_proximity_km=max_dist_slider)

    selected_node_data = graph_engine.graph.nodes[selected_id]
    connected_list = graph_engine.get_connected_incidents(selected_id)

    st.markdown("#### 📌 Selected Incident Profile")
    mcol1, mcol2, mcol3, mcol4, mcol5 = st.columns(5)
    with mcol1:
        st.metric("Incident ID", selected_id)
    with mcol2:
        st.metric("Type", selected_node_data.get("incident_type"))
    with mcol3:
        st.metric("Severity", f"{selected_node_data.get('severity_score')} / 10")
    with mcol4:
        st.metric("Ward", selected_node_data.get("ward"))
    with mcol5:
        st.metric("Connected Incidents", len(connected_list))

    st.markdown("#### 🌐 Interactive Network Visualization")
    fig_network = graph_engine.generate_plotly_figure(
        selected_incident_id=selected_id,
        subgraph_only=is_subgraph
    )
    st.plotly_chart(fig_network, use_container_width=True)

    st.markdown(f"#### 🔗 Incidents Connected to **{selected_id}** ({len(connected_list)} Connections Found)")
    if connected_list:
        conn_df = pd.DataFrame(connected_list)[
            ["direction", "incident_id", "incident_type", "relationship_type", "weight", "distance_km", "ward", "severity_score", "status"]
        ]
        conn_df.columns = ["Direction", "Related Incident ID", "Incident Type", "Relationship Type", "Weight (0-1)", "Distance (km)", "Ward", "Severity", "Status"]
        st.dataframe(conn_df, use_container_width=True)
    else:
        st.info("No direct relationships found for this incident at the current proximity threshold.")

    with st.expander("📊 Global Graph Topology & Top Connected Hubs"):
        summary = graph_engine.get_graph_summary()
        gcol1, gcol2, gcol3 = st.columns(3)
        with gcol1:
            st.metric("Total Network Nodes", summary.get("total_nodes"))
        with gcol2:
            st.metric("Total Relationships (Edges)", summary.get("total_edges"))
        with gcol3:
            st.metric("Graph Density", summary.get("graph_density"))

        st.markdown("**Top 5 Urban Risk Hubs (Highest Interconnectivity):**")
        hubs_df = pd.DataFrame(summary.get("top_connected_incidents", []))
        if not hubs_df.empty:
            hubs_df.columns = ["Incident ID", "Incident Type", "Total Connections", "Severity", "Ward"]
            st.table(hubs_df)


# ===========================================================================
# VIEW 3: FEATURE 2 – GEOSPATIAL INTELLIGENCE
# ===========================================================================
elif feature_selection == "Feature 2: Geospatial Intelligence":
    st.subheader("🗺️ Feature 2: Geospatial Intelligence & Spatial Hotspots")
    st.markdown(
        "Interactive GIS mapping displaying incident locations, category-coded markers, "
        "impact-radius buffer boundaries, and **DBSCAN** spatial clustering for municipal hotspot detection."
    )

    # Control Filters
    geo_col1, geo_col2, geo_col3, geo_col4 = st.columns([1.5, 1, 1, 1])
    with geo_col1:
        cat_options = ["All Categories"] + sorted(df["category"].dropna().unique().tolist())
        selected_cat = st.selectbox("Category Filter", cat_options, index=0)

    with geo_col2:
        min_sev = st.slider("Min Severity", 1.0, 10.0, 5.0, 0.5)

    with geo_col3:
        eps_slider = st.slider("DBSCAN Neighborhood (km)", 0.8, 3.5, 1.5, 0.1)

    with geo_col4:
        min_pts_slider = st.slider("Min Cluster Size", 2, 6, 3, 1)

    toggle_col1, toggle_col2 = st.columns(2)
    with toggle_col1:
        show_buffers = st.checkbox("Show Impact Radius Circles (impact_radius_meters)", value=True)
    with toggle_col2:
        enable_hotspots = st.checkbox("Enable DBSCAN Spatial Hotspot Detection", value=True)

    # Filter data for mapping
    map_df = filtered_df[filtered_df["severity_score"] >= min_sev]
    if selected_cat != "All Categories":
        map_df = map_df[map_df["category"] == selected_cat]

    # Run Clustering & Compute Summary
    clustered_df, hotspots = spatial_engine.detect_spatial_hotspots(
        map_df,
        eps_km=eps_slider,
        min_samples=min_pts_slider
    )

    # Top KPI summary cards
    k1, k2, k3, k4 = st.columns(4)
    with k1:
        st.metric("Mapped Incidents", len(map_df))
    with k2:
        st.metric("Hotspots Identified", len(hotspots))
    with k3:
        max_rad = int(map_df["impact_radius_meters"].max()) if not map_df.empty else 0
        st.metric("Max Impact Radius", f"{max_rad:,} meters")
    with k4:
        top_ward = map_df["ward"].mode()[0] if not map_df.empty else "N/A"
        st.metric("Highest Density Ward", top_ward.split(" ")[0])

    # Plotly OpenStreetMap Figure
    st.markdown("#### 🌍 Interactive GIS Incident & Hotspot Map")
    fig_map = spatial_engine.generate_plotly_map(
        map_df,
        show_impact_buffers=show_buffers,
        enable_hotspots=enable_hotspots,
        eps_km=eps_slider,
        min_samples=min_pts_slider
    )
    st.plotly_chart(fig_map, use_container_width=True)

    # Hotspot Cluster Details Table
    st.markdown("#### 🔥 Detected High-Risk Hotspots (DBSCAN Clusters)")
    if hotspots:
        hotspots_table_data = []
        for h in hotspots:
            hotspots_table_data.append({
                "Hotspot ID": f"Hotspot #{h['cluster_id']}",
                "Risk Tier": h["risk_tier"],
                "Incident Count": h["incident_count"],
                "Avg Severity": f"{h['average_severity']} / 10",
                "Dominant Hazard": h["dominant_incident_type"],
                "Center Coordinates": f"({h['center_latitude']}, {h['center_longitude']})",
                "Zones Covered": ", ".join(h["zones_covered"]),
                "Affected Citizens": f"{h['total_affected_population']:,}"
            })
        st.dataframe(pd.DataFrame(hotspots_table_data), use_container_width=True)
    else:
        st.info("No clusters detected at current distance and cluster size settings. Try lowering 'Min Cluster Size' or increasing 'DBSCAN Neighborhood'.")

    # Zonal Density Breakdown
    st.markdown("#### 🏙️ Municipal Zone Incident Density & Severity Analysis")
    zone_summary = spatial_engine.get_zone_density_summary(map_df)
    if zone_summary:
        zdf = pd.DataFrame(zone_summary)
        zcol1, zcol2 = st.columns(2)
        with zcol1:
            fig_zcount = px.bar(
                zdf,
                x="zone",
                y="incident_count",
                color="average_severity",
                title="Incidents by Municipal Zone (Colored by Avg Severity)",
                labels={"incident_count": "Incident Count", "zone": "Zone", "average_severity": "Avg Severity"},
                color_continuous_scale="Reds"
            )
            st.plotly_chart(fig_zcount, use_container_width=True)

        with zcol2:
            fig_zpop = px.bar(
                zdf,
                x="zone",
                y="total_affected_population",
                color="high_severity_count",
                title="Population Exposure by Municipal Zone",
                labels={"total_affected_population": "Total Affected Population", "zone": "Zone", "high_severity_count": "High Severity Incidents"},
                color_continuous_scale="Purples"
            )
            st.plotly_chart(fig_zpop, use_container_width=True)


# ===========================================================================
# VIEW 4: FEATURE 3 – PREDICTIVE INTELLIGENCE
# ===========================================================================
elif feature_selection == "Feature 3: Predictive Intelligence":
    st.subheader("🧠 Feature 3: Predictive Intelligence (Machine Learning Engine)")
    st.markdown(
        "Supervised machine learning classification forecasting whether an urban incident will trigger "
        "secondary infrastructure failures (**`cascading_risk_flag`**). Features rigorous data leakage prevention, "
        "test set evaluation, and live interactive scenario inference."
    )

    # 1. Model Evaluation Metrics Banner
    st.markdown("#### 📊 Model Architecture & Test Evaluation Metrics")
    metrics = predictive_engine.metrics
    tcol1, tcol2, tcol3, tcol4, tcol5 = st.columns(5)
    with tcol1:
        st.metric("Algorithm", "Random Forest")
    with tcol2:
        acc = metrics.get("accuracy", 0.0)
        st.metric("Test Accuracy", f"{acc * 100:.1f}%")
    with tcol3:
        prec = metrics.get("precision", 0.0)
        st.metric("Test Precision", f"{prec * 100:.1f}%")
    with tcol4:
        rec = metrics.get("recall", 0.0)
        st.metric("Test Recall", f"{rec * 100:.1f}%")
    with tcol5:
        f1 = metrics.get("f1_score", 0.0)
        st.metric("Test F1-Score", f"{f1 * 100:.1f}%")

    # Data Leakage Safeguards Note
    st.info(
        "🛡️ **Zero Data Leakage Policy**: Model is trained strictly on early indicators available upon intake "
        f"(`{', '.join(NUMERICAL_FEATURES)}` + Categoricals). "
        f"Strictly excluded downstream outcome labels: `{', '.join(EXCLUDED_LEAKAGE_COLUMNS)}`. "
        f"Evaluation performed on 25% hold-out test set ({metrics.get('test_samples')} incidents)."
    )

    # Confusion Matrix and Feature Importances
    m_col1, m_col2 = st.columns(2)

    with m_col1:
        st.markdown("##### 🔍 Test Confusion Matrix")
        cm_data = metrics.get("confusion_matrix", {})
        matrix_vals = cm_data.get("matrix", [[0, 0], [0, 0]])
        
        cm_df = pd.DataFrame(
            matrix_vals,
            index=["Actual Non-Cascading (0)", "Actual Cascading (1)"],
            columns=["Pred Non-Cascading (0)", "Pred Cascading (1)"]
        )

        fig_cm = px.imshow(
            cm_df,
            text_auto=True,
            color_continuous_scale="Blues",
            labels=dict(x="Predicted Class", y="Actual Class", color="Count"),
            title=f"Hold-Out Test Confusion Matrix (N = {metrics.get('test_samples')})"
        )
        st.plotly_chart(fig_cm, use_container_width=True)

    with m_col2:
        st.markdown("##### 📈 Top Predictive Feature Importances (Gini Weight)")
        top_feats = predictive_engine.feature_importances[:8]
        feat_df = pd.DataFrame(top_feats)
        if not feat_df.empty:
            fig_feat = px.bar(
                feat_df.sort_values(by="importance", ascending=True),
                x="importance",
                y="feature",
                orientation="h",
                title="Top Predictive Risk Drivers",
                labels={"importance": "Importance Weight", "feature": "Feature"},
                color="importance",
                color_continuous_scale="Teal"
            )
            st.plotly_chart(fig_feat, use_container_width=True)

    st.divider()

    # 2. Interactive Live Prediction Playground
    st.markdown("#### ⚡ Interactive Incident Risk Prediction Simulator")
    st.markdown("Adjust municipal incident parameters to forecast real-time cascading probability and emergency response tier.")

    p_col1, p_col2, p_col3 = st.columns(3)
    with p_col1:
        p_type = st.selectbox(
            "Incident Type",
            sorted(df["incident_type"].unique().tolist()),
            index=0
        )
        p_zone = st.selectbox(
            "Municipal Zone",
            sorted(df["zone"].unique().tolist()),
            index=2
        )
        p_cat = st.selectbox(
            "Infrastructure Category",
            sorted(df["category"].unique().tolist()),
            index=0
        )

    with p_col2:
        p_sev = st.slider("Severity Score (1 to 10)", 1.0, 10.0, 8.2, 0.1)
        p_rain = st.slider("Rainfall (mm)", 0.0, 120.0, 68.0, 2.0)
        p_wind = st.slider("Wind Speed (km/h)", 0.0, 80.0, 32.0, 2.0)

    with p_col3:
        p_pop = st.slider("Affected Population", 100, 25000, 8500, 250)
        p_radius = st.slider("Impact Radius (meters)", 50, 2500, 1200, 50)
        p_temp = st.slider("Temperature (°C)", 15.0, 45.0, 23.5, 0.5)

    if st.button("🔮 Compute Cascading Risk Prediction", type="primary"):
        input_payload = {
            "incident_type": p_type,
            "category": p_cat,
            "zone": p_zone,
            "severity_score": p_sev,
            "impact_radius_meters": p_radius,
            "affected_population": p_pop,
            "rainfall_mm": p_rain,
            "wind_speed_kmh": p_wind,
            "temperature_c": p_temp
        }

        prediction_result = predictive_engine.predict(input_payload)

        st.markdown("##### 🎯 Prediction Output")
        res_col1, res_col2 = st.columns([1, 1.5])

        with res_col1:
            prob = prediction_result["cascading_probability"]
            tier = prediction_result["risk_tier"]
            tier_color = prediction_result["tier_color"]

            # Gauge Chart
            fig_gauge = go.Figure(go.Indicator(
                mode="gauge+number",
                value=prob * 100,
                title={"text": f"<b>{tier}</b>", "font": {"size": 16, "color": tier_color}},
                number={"suffix": "%", "font": {"size": 36}},
                gauge={
                    "axis": {"range": [0, 100]},
                    "bar": {"color": tier_color},
                    "steps": [
                        {"range": [0, 30], "color": "#E2E8F0"},
                        {"range": [30, 50], "color": "#BAE6FD"},
                        {"range": [50, 75], "color": "#FED7AA"},
                        {"range": [75, 100], "color": "#FECACA"},
                    ],
                    "threshold": {
                        "line": {"color": "red", "width": 4},
                        "thickness": 0.75,
                        "value": 75
                    }
                }
            ))
            fig_gauge.update_layout(margin=dict(l=20, r=20, t=30, b=20), height=240)
            st.plotly_chart(fig_gauge, use_container_width=True)

        with res_col2:
            st.markdown(f"**Predicted Cascading Class:** `{'1 (Secondary Failure Likely)' if prediction_result['cascading_risk_prediction'] == 1 else '0 (Contained / Isolated)'}`")
            st.markdown(f"**Recommended Municipal Stance:** {prediction_result['recommended_stance']}")
            st.markdown("**Top Factors Influencing this Prediction:**")
            
            factors_df = pd.DataFrame(prediction_result["influencing_features"])
            if not factors_df.empty:
                factors_df.columns = ["Predictor Factor", "Model Gini Weight", "Active Input Value"]
                st.table(factors_df)


# ===========================================================================
# VIEW 5: FEATURE 4 – CASCADING IMPACT PREDICTION
# ===========================================================================
elif feature_selection == "Feature 4: Cascading Impact Prediction":
    st.subheader("⚡ Feature 4: Cascading Impact Prediction")
    st.markdown(
        "Deterministic, rule-based simulation of secondary and tertiary failure knock-ons. "
        "Traces how localized failures (e.g. Flooding or Power Outage) propagate into transit gridlock, "
        "utility tripping, and structural emergencies. Includes explicit causal reasons and prevention break playbooks."
    )

    input_mode = st.radio(
        "Simulation Source",
        ["Select Existing Incident from Dataset", "Simulate Custom Municipal Shock Scenario"],
        horizontal=True
    )

    if input_mode == "Select Existing Incident from Dataset":
        incident_options = [
            f"{row['incident_id']} | {row['incident_type']} ({row['zone']} - {row['ward']}) [Sev: {row['severity_score']}]"
            for _, row in df.iterrows()
        ]
        selected_display = st.selectbox("Choose Target Incident", incident_options, index=0)
        target_id = selected_display.split(" | ")[0]
        row_data = df[df["incident_id"] == target_id].iloc[0]

        target_type = str(row_data["incident_type"])
        target_severity = float(row_data["severity_score"])
        target_rain = float(row_data["rainfall_mm"])
        target_wind = float(row_data["wind_speed_kmh"])
        target_cascading = int(row_data.get("cascading_risk_flag", 1))

        st.info(
            f"**Loaded Incident:** `{target_id}` | Type: `{target_type}` | Severity: `{target_severity}/10` | "
            f"Weather: `{row_data.get('weather_condition')}` (Rain: {target_rain} mm, Wind: {target_wind} km/h)"
        )

    else:
        target_id = "SYNTHETIC-SCENARIO"
        scol1, scol2 = st.columns(2)
        with scol1:
            target_type = st.selectbox(
                "Incident Type",
                list(KNOWN_CAUSAL_AFFINITIES.keys()),
                index=0
            )
            target_severity = st.slider("Severity Score", 1.0, 10.0, 8.2, 0.1)
        with scol2:
            target_rain = st.slider("Rainfall (mm)", 0.0, 120.0, 65.0, 5.0)
            target_wind = st.slider("Wind Speed (km/h)", 0.0, 80.0, 35.0, 5.0)
        target_cascading = 1

    cascade_result = cascade_engine.predict_cascade(
        incident_type=target_type,
        severity_score=target_severity,
        rainfall_mm=target_rain,
        wind_speed_kmh=target_wind,
        cascading_risk_flag=target_cascading,
        root_id=target_id
    )

    st.divider()

    threat_level = cascade_result["overall_threat_level"]
    kcol1, kcol2, kcol3, kcol4 = st.columns(4)
    with kcol1:
        st.metric("Overall Threat Level", threat_level)
    with kcol2:
        st.metric("Total Predicted Consequences", cascade_result["total_consequences_predicted"])
    with kcol3:
        st.metric("Critical Hazards", cascade_result["critical_consequences_count"])
    with kcol4:
        st.metric("Weather Multiplier Active", "Yes (Amplified)" if cascade_result["weather_amplified"] else "No (Normal)")

    st.markdown("#### 🌳 Cascading Consequence Propagation Graph")
    fig_cascade = cascade_engine.generate_cascade_tree_plotly(cascade_result)
    st.plotly_chart(fig_cascade, use_container_width=True)

    st.markdown("#### 📋 Step-by-Step Causal Cascade Analysis")
    consequences = cascade_result.get("consequences", [])
    secondary_conseqs = [c for c in consequences if c["stage"] == "Secondary"]
    tertiary_conseqs = [c for c in consequences if c["stage"] == "Tertiary"]

    tab_sec, tab_tert, tab_raw = st.tabs([
        f"⚡ Stage 1: Secondary Impacts ({len(secondary_conseqs)})",
        f"🌪️ Stage 2: Tertiary Knock-Ons ({len(tertiary_conseqs)})",
        "📄 Raw Prediction Payload"
    ])

    with tab_sec:
        st.markdown("**Direct consequences triggered within 0 – 2 hours if primary incident is uncontained:**")
        for idx, item in enumerate(secondary_conseqs, 1):
            badge = "🔴 CRITICAL" if item["risk_level"] == "CRITICAL" else "🟠 HIGH" if item["risk_level"] == "HIGH" else "🔵 MODERATE"
            with st.container(border=True):
                st.markdown(f"### {idx}. {item['name']} &nbsp; `{badge}`")
                st.markdown(f"**Target Civic Subsystem:** `{item['subsystem']}` &nbsp;|&nbsp; **Time Horizon:** `{item['time_horizon']}`")
                st.markdown(f"**🧠 Causal Rationale (Why this happens):** {item['reason']}")
                st.success(f"**🛑 Prevention Action to Break Cascade:** {item['preventive_break_action']}")

    with tab_tert:
        st.markdown("**Compound consequences resulting from secondary failures within 2 – 8 hours:**")
        for idx, item in enumerate(tertiary_conseqs, 1):
            badge = "🔴 CRITICAL" if item["risk_level"] == "CRITICAL" else "🟠 HIGH" if item["risk_level"] == "HIGH" else "🔵 MODERATE"
            with st.container(border=True):
                st.markdown(f"### {idx}. {item['name']} &nbsp; `{badge}`")
                st.markdown(f"**Parent Trigger:** `{item['parent_id']}` &nbsp;|&nbsp; **Subsystem:** `{item['subsystem']}` &nbsp;|&nbsp; **Time Horizon:** `{item['time_horizon']}`")
                st.markdown(f"**🧠 Causal Rationale (Why this happens):** {item['reason']}")
                st.warning(f"**🛑 Escalation Barrier Playbook:** {item['preventive_break_action']}")

    with tab_raw:
        st.json(cascade_result)


# ===========================================================================
# OTHER FEATURES PLACEHOLDERS (PHASE 4 & 5)
# ===========================================================================
else:
    st.info(f"⚡ Feature **{feature_selection}** will be activated in upcoming project phases.")
    st.write("Current sample records from dataset:")
    st.dataframe(filtered_df.sample(min(len(filtered_df), 10)), use_container_width=True)
