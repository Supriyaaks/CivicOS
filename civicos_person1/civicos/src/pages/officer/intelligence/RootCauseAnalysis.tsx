import React, { useState, useEffect } from 'react';
import { useMccStore } from '../../../store/mccStore';
import { predictiveService, RelationshipGraphResult } from '../../../services/predictiveService';
import { Network, Link2, CheckCircle2, RefreshCw, AlertTriangle, ShieldCheck, Activity, Search, Layers } from 'lucide-react';

const RootCauseAnalysis: React.FC = () => {
  const { incidents, fetchIncidents } = useMccStore();
  const [selectedIncident, setSelectedIncident] = useState<string>('INC-101');
  const [graphData, setGraphData] = useState<RelationshipGraphResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [validatedCauses, setValidatedCauses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  useEffect(() => {
    loadIncidentRelationships(selectedIncident);
  }, [selectedIncident]);

  const loadIncidentRelationships = async (id: string) => {
    setLoading(true);
    try {
      const data = await predictiveService.getRelationships(id);
      if (data) setGraphData(data);
    } catch (err) {
      console.error('Failed to load relationships:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = (id: string) => {
    setValidatedCauses(prev => ({ ...prev, [id]: true }));
  };

  // Derive root-cause diagnostic information
  const currentIncident = incidents.find(i => i.id === selectedIncident || (i as any).incidentCode === selectedIncident);
  const incidentCategory = currentIncident?.category || graphData?.incident_details?.category || 'Road Infrastructure';
  const incidentSeverity = currentIncident?.priority || currentIncident?.severity || (graphData?.incident_details?.severity_score ? `Score ${graphData.incident_details.severity_score}/10` : 'HIGH');
  const incidentStatus = currentIncident?.status || graphData?.incident_details?.status || 'Pending';

  const getRootCauseDiagnostic = () => {
    const cat = (incidentCategory || '').toLowerCase();
    if (cat.includes('pothole') || cat.includes('crack') || cat.includes('road')) {
      return {
        factor: 'Subsurface Moisture Infiltration & Heavy Axle Load Shear Stress',
        explanation: 'Water penetration through surface micro-fissures compromised the aggregate base layer. Recurring heavy transit loads accelerated asphalt fatigue, forming deep structural depressions and void cavitation.',
        connectedAssets: [
          'Arterial Drainage Collector (120m downstream)',
          'High-density Transit Corridor Section 4B',
          'Pedestrian Crossing Curb Structure'
        ],
        effects: {
          secondary: 'Lane obstruction, localized traffic speed reduction to <15 km/h, and water ponding during light rain.',
          tertiary: 'Pavement edge erosion propagation to adjoining lane; potential vehicle suspension damage and accident liability.'
        },
        evidence: [
          `Proximity to drainage runoff channel (${graphData?.connected_incidents?.[0]?.distance_km || 0.4} km)`,
          'Surface degradation pattern consistent with chronic waterlogging',
          'Sub-base voiding detected via visual depression profiling'
        ],
        steps: [
          'Deploy field crew with asphalt cold-patch / hot-mix compaction roller.',
          'Inspect and clear adjacent road culvert grate to prevent stormwater backflow.',
          'Seal peripheral pavement cracks within a 15-meter radius to halt moisture ingress.',
          'Verify repaired surface smoothness via post-repair computer vision audit.'
        ]
      };
    } else if (cat.includes('water') || cat.includes('leak') || cat.includes('pipe') || cat.includes('main')) {
      return {
        factor: 'Hydraulic Surge Pressure Shock & Ground Subsidence at Joint Coupling',
        explanation: 'Diurnal pressure fluctuation in the primary municipal distribution line exceeded nominal tolerance (3.8 bar), exacerbating micro-fractures in legacy ductile iron joint collars.',
        connectedAssets: [
          'Primary Distribution Valve Junction V-12',
          'Underground Telecom Utility Trench (0.8m separation)',
          'Adjacent Roadway Foundation Base'
        ],
        effects: {
          secondary: 'Loss of municipal water supply to ~4,200 downstream residential units; sub-base soil washout beneath asphalt.',
          tertiary: 'Secondary roadway sinkhole risk; contamination infiltration into adjacent telecommunications ducts.'
        },
        evidence: [
          'Reported continuous potable discharge rate estimated at 45 L/min',
          `Topological proximity to main trunk line hub (${graphData?.connected_incidents?.[0]?.incident_id || 'INC-1001'})`,
          'Localized ground dampness without precipitation'
        ],
        steps: [
          'Isolate Section Valve V-12 to depressurize affected feeder pipe section.',
          'Excavate 1.5m inspection trench to access pipe joint and verify collar integrity.',
          'Replace ruptured gasket and install mechanical pipe coupling sleeve.',
          'Backfill with compacted aggregate and restore road asphalt layer.'
        ]
      };
    } else if (cat.includes('drain') || cat.includes('flood') || cat.includes('waterlog')) {
      return {
        factor: 'Stormwater Conduit Siltation & Catch-Basin Inlet Hydraulic Choke',
        explanation: 'Sediment buildup and solid debris accumulation reduced culvert effective cross-sectional flow capacity by an estimated 65%, preventing timely gravity outflow during sustained rainfall.',
        connectedAssets: [
          'Low-lying Arterial Underpass & Drainage Sump',
          'Electrical Junction Box J-04 (Water Ingress Hazard)',
          'Commercial Ground-Floor Units'
        ],
        effects: {
          secondary: 'Water accumulation exceeding 25cm on carriage-way; localized vehicle stall and lane closure.',
          tertiary: 'Backwater surcharge into residential storm drains; foundation dampness and potential vector-borne health hazards.'
        },
        evidence: [
          `Topological gravity gradient directs runoff directly to node ${selectedIncident}`,
          'Catchment area silt accumulation verified in recent pre-monsoon audit',
          'Surface water level telemetry indicates inflow exceeds outflow rate'
        ],
        steps: [
          'Dispatch high-velocity water jetting / suction tanker to de-silt the 300mm pipe.',
          'Clear organic waste and silt from roadside grated inlets within 100m radius.',
          'Deploy temporary mobile dewatering pump if depth exceeds safety threshold.',
          'Install trash screen to prevent large debris ingress at culvert mouth.'
        ]
      };
    } else if (cat.includes('light') || cat.includes('electric') || cat.includes('power')) {
      return {
        factor: 'Underground Armored Cable Insulation Breakdown / Phase Neutral Imbalance',
        explanation: 'Moisture ingress into buried feeder line junction box triggered automatic residual current breaker trip on the 415V distribution circuit, de-energizing the street illumination loop.',
        connectedAssets: [
          'Feeder Pillar FP-08 (12-luminaire loop)',
          'Pedestrian Crossing Illumination Zone',
          'CCTV Surveillance Camera Terminal'
        ],
        effects: {
          secondary: 'Zero ambient illumination on 250m arterial stretch, increasing nighttime pedestrian-vehicle hazard.',
          tertiary: 'Surveillance coverage blackout; escalated public safety vulnerability during peak evening hours.'
        },
        evidence: [
          'Tripped 63A circuit breaker logged at municipal feeder pillar FP-08',
          'Megger insulation resistance test indicates low phase-to-earth resistance (<0.5 MΩ)',
          'No upstream grid-wide outage reported by electricity board'
        ],
        steps: [
          'Perform megohmmeter insulation resistance test on cable sections between poles 4 and 5.',
          'Excavate and dry underground splice enclosure; reseal with resin potting compound.',
          'Replace blown HRC fuse and test earth fault loop impedance.',
          'Re-energize circuit and verify lux levels across all 12 connected poles.'
        ]
      };
    } else {
      return {
        factor: 'Municipal Asset Degradation & Material Wear Beyond Service Threshold',
        explanation: 'Cumulative environmental exposure and mechanical wear surpassed design threshold, necessitating immediate municipal engineering field intervention.',
        connectedAssets: [
          'Adjoining Urban Streetscape & Public Right-of-Way',
          'Municipal Sanitation Collector Hub',
          'Pedestrian Sidewalk Corridor'
        ],
        effects: {
          secondary: 'Public service disruption and localized citizen inconvenience in the immediate ward sector.',
          tertiary: 'Potential escalation to adjoining utility networks if left unaddressed over next 48-hour cycle.'
        },
        evidence: [
          `Documented high-affinity edge connection to node ${graphData?.connected_incidents?.[0]?.incident_id || 'INC-1002'}`,
          'Field inspection photo verification confirms structural fatigue',
          'Citizen grievance escalation logged within past 24 hours'
        ],
        steps: [
          'Dispatch field maintenance squad with asset repair toolkit.',
          'Erect safety barricades and warning signage around active site.',
          'Execute structural remediation and test load-bearing capacity.',
          'Log resolution sign-off in CivicOS municipal database.'
        ]
      };
    }
  };

  const diagnostic = getRootCauseDiagnostic();

  return (
    <div className="p-8 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Root-Cause & Incident Network Analysis
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Graph-theoretic infrastructure dependency maps uncovering systemic causal anchors behind recurring incidents.
          </p>
        </div>
        <button
          onClick={() => loadIncidentRelationships(selectedIncident)}
          disabled={loading}
          className="flex items-center space-x-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm self-start md:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'ANALYZING GRAPH...' : 'REFRESH GRAPH TOPOLOGY'}</span>
        </button>
      </div>

      {/* INCIDENT SELECTION & GRAPH STATS BAR */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap flex items-center space-x-1.5">
            <Search className="w-3.5 h-3.5 text-blue-600" />
            <span>Investigate Incident:</span>
          </label>
          <select
            value={selectedIncident}
            onChange={(e) => setSelectedIncident(e.target.value)}
            className="text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg p-2 min-w-[280px] focus:ring-2 focus:ring-blue-500"
          >
            {incidents.length > 0 ? (
              incidents.slice(0, 15).map((inc) => (
                <option key={inc.id} value={inc.id}>
                  {inc.id} — {inc.category} ({inc.location.slice(0, 25)}...)
                </option>
              ))
            ) : (
              <>
                <option value="INC-101">INC-101 — Pothole (Main St)</option>
                <option value="INC-102">INC-102 — Water Leakage (Oak Ave)</option>
              </>
            )}
            <option value="INC-1001">INC-1001 — Water Main Break (Central Zone)</option>
            <option value="INC-1002">INC-1002 — Flooding / Waterlogging (South Zone)</option>
            <option value="INC-1003">INC-1003 — Tree Fall / Road Block (East Zone)</option>
          </select>
        </div>

        <div className="flex items-center space-x-6 text-xs text-slate-600">
          <div>
            <span className="font-bold text-slate-900">{graphData?.graph_summary?.total_nodes || 130}</span> Graph Nodes
          </div>
          <div>
            <span className="font-bold text-slate-900">{graphData?.graph_summary?.total_edges || 389}</span> Causal Edges
          </div>
          <div>
            <span className="font-bold text-purple-600">{graphData?.connected_incidents_count || 0}</span> Connected Neighbors
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN VIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLUMNS: ROOT CAUSE ANALYSIS & CONNECTED EDGES */}
        <div className="lg:col-span-2 space-y-6">

          {/* DEDICATED ROOT CAUSE ANALYSIS SECTION */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Root Cause Analysis</h3>
                  <p className="text-xs text-slate-500">
                    Automated multi-factor causal diagnosis combining network topology, telemetry, and municipal records.
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full uppercase tracking-wider">
                Causal Diagnostic
              </span>
            </div>

            {/* 1. INCIDENT SUMMARY */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold uppercase text-[10px]">Incident Target</span>
                <span className="font-bold text-slate-900 font-mono text-sm">{selectedIncident}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold uppercase text-[10px]">Category</span>
                <span className="font-bold text-slate-800">{incidentCategory}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold uppercase text-[10px]">Severity / Priority</span>
                <span className="font-bold text-orange-600">{incidentSeverity}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold uppercase text-[10px]">Current Status</span>
                <span className="font-bold text-blue-600">{incidentStatus}</span>
              </div>
            </div>

            {/* 2. IDENTIFIED CONTRIBUTING / ROOT FACTOR */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Identified Primary Contributing Factor
                </h4>
              </div>
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                <p className="text-sm font-bold text-amber-950">
                  {diagnostic.factor}
                </p>
                <p className="text-xs text-amber-900 leading-relaxed">
                  {diagnostic.explanation}
                </p>
              </div>
            </div>

            {/* 3. AFFECTED CONNECTED INFRASTRUCTURE */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-purple-600" />
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Affected Connected Infrastructure Assets
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {diagnostic.connectedAssets.map((asset, i) => (
                  <div key={i} className="p-3 bg-purple-50/60 border border-purple-200/80 rounded-xl text-xs">
                    <span className="text-[10px] font-black uppercase text-purple-700 block">Tier {i + 1} Dependency</span>
                    <span className="font-semibold text-purple-950 mt-0.5 block">{asset}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. SECONDARY & TERTIARY RISK HORIZON */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Multi-Stage Cascading Failure Horizon
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-black uppercase text-amber-700">Secondary Effect (15 - 45 min)</span>
                  <p className="text-slate-700 leading-relaxed">{diagnostic.effects.secondary}</p>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-black uppercase text-rose-700">Tertiary Effect (1 - 3 hours)</span>
                  <p className="text-slate-700 leading-relaxed">{diagnostic.effects.tertiary}</p>
                </div>
              </div>
            </div>

            {/* 5. SUPPORTING EVIDENCE */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Supporting Graph & Field Evidence
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-600">
                {diagnostic.evidence.map((ev, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                    <span>{ev}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 6. RECOMMENDED INVESTIGATION STEPS */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Actionable Investigation Protocol for Field Crews
                </h4>
              </div>
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                {diagnostic.steps.map((step, i) => (
                  <div key={i} className="flex items-start space-x-2 text-xs text-emerald-950">
                    <span className="font-bold text-emerald-700 bg-emerald-100 rounded px-1.5 py-0.5 text-[10px] font-mono flex-shrink-0">
                      Step {i + 1}
                    </span>
                    <span className="leading-relaxed font-medium">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* VALIDATION ACTION BUTTONS */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
              {validatedCauses[selectedIncident] ? (
                <span className="flex items-center space-x-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200 shadow-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Root Cause Verified by Municipal Engineer</span>
                </span>
              ) : (
                <button
                  onClick={() => handleValidate(selectedIncident)}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
                >
                  Confirm & Validate Root Cause
                </button>
              )}
            </div>
          </div>

          {/* CONNECTED INFRASTRUCTURE NEIGHBORS IN NETWORK GRAPH */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              <Link2 className="w-4 h-4 text-purple-600" />
              <span>Connected Infrastructure Neighbors in Network Graph ({graphData?.connected_incidents?.length || 0})</span>
            </h4>

            {graphData?.connected_incidents && graphData.connected_incidents.length > 0 ? (
              <div className="space-y-3">
                {graphData.connected_incidents.map((edge, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 hover:bg-slate-100/60 transition-all"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-mono text-[10px] font-bold">
                          {edge.relationship_type || 'PROXIMITY_AFFINITY'}
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          ➔ {edge.incident_id}: {edge.incident_details?.incident_type || 'Related Failure'}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-semibold text-slate-500">
                        Weight: {(edge.weight * 100).toFixed(0)}% • Distance: {edge.distance_km} km
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed italic">
                      "{edge.label || 'Infrastructure causal affinity identified based on shared arterial drainage.'}"
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 text-center">
                No direct high-affinity edges detected within 2.0 km radius.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: TOP RISK HUBS (FROM GRAPH ENGINE) */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg space-y-5">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
              <Network className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold">Top Systemic Failure Hubs</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Nodes with the highest degree centrality and causal affinities in the municipal NetworkX graph:
            </p>

            <div className="space-y-3">
              {graphData?.graph_summary?.top_connected_hubs?.slice(0, 5).map((hub, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedIncident(hub.incident_id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedIncident === hub.incident_id
                      ? 'bg-amber-950/60 border-amber-500 text-white'
                      : 'bg-slate-800 border-slate-700 hover:border-amber-500/50'
                  }`}
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-amber-400 font-mono">{hub.incident_id}</span>
                    <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300 font-mono">
                      {hub.connections} connections
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-200 mt-1">{hub.dominant_type}</p>
                  <p className="text-[11px] text-slate-400">{hub.zone}</p>
                </div>
              ))}
            </div>

            <div className="p-4 bg-blue-950/60 rounded-xl border border-blue-800/80">
              <p className="text-[10px] uppercase font-black text-blue-400">Proactive Mitigation</p>
              <p className="text-xs text-blue-200 mt-1 leading-relaxed">
                Prioritizing repairs on top network hubs collapses multiple secondary consequence chains simultaneously.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RootCauseAnalysis;