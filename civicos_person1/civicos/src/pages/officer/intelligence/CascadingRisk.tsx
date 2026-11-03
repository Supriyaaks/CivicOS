import React, { useState, useEffect, useCallback } from 'react';
import { useMccStore } from '../../../store/mccStore';
import { predictiveService, CascadeResult } from '../../../services/predictiveService';
import { AlertTriangle, ShieldCheck, Zap, RefreshCw, ArrowRight, CornerDownRight, CheckCircle2 } from 'lucide-react';

const CascadingRisk: React.FC = () => {
  const { incidents, fetchIncidents } = useMccStore();
  const [selectedIncidentCode, setSelectedIncidentCode] = useState<string>('INC-101');
  const [incidentType, setIncidentType] = useState<string>('Flooding / Waterlogging');
  const [severityScore, setSeverityScore] = useState<number>(8.5);
  const [rainfallMm, setRainfallMm] = useState<number>(65.0);
  const [windSpeedKmh, setWindSpeedKmh] = useState<number>(35.0);
  const [loading, setLoading] = useState<boolean>(false);
  const [cascadeResult, setCascadeResult] = useState<CascadeResult | null>(null);
  const [lastRunTime, setLastRunTime] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const incidentTypes = [
    'Flooding / Waterlogging',
    'Water Main Break',
    'Power Outage / Grid Failure',
    'Tree Fall / Blocked Arterial',
    'Sewage Overflow',
    'Traffic Signal Malfunction',
  ];

  // Fetch live incidents on mount
  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  // Synchronize target incident selection
  const handleIncidentSelect = (code: string) => {
    setSelectedIncidentCode(code);
    const inc = incidents.find(i => i.id === code || (i as any).incidentCode === code);
    if (inc) {
      const cat = (inc.category || '').toLowerCase();
      let matchedType = 'Flooding / Waterlogging';
      if (cat.includes('road') || cat.includes('pothole') || cat.includes('crack')) {
        matchedType = 'Tree Fall / Blocked Arterial';
      } else if (cat.includes('water') || cat.includes('drain') || cat.includes('flood')) {
        matchedType = 'Flooding / Waterlogging';
      } else if (cat.includes('electric') || cat.includes('power') || cat.includes('light')) {
        matchedType = 'Power Outage / Grid Failure';
      } else if (cat.includes('waste') || cat.includes('sewage') || cat.includes('garbage')) {
        matchedType = 'Sewage Overflow';
      } else if (cat.includes('traffic') || cat.includes('signal')) {
        matchedType = 'Traffic Signal Malfunction';
      }
      setIncidentType(matchedType);

      const p = (inc.priority || inc.severity || '').toUpperCase();
      const sev = p === 'CRITICAL' ? 9.2 : p === 'HIGH' ? 7.8 : p === 'MEDIUM' ? 5.5 : 3.8;
      setSeverityScore(sev);
    }
  };

  const fetchCascadePrediction = useCallback(async () => {
    setLoading(true);
    setFeedbackMsg(null);
    try {
      const result = await predictiveService.predictCascade({
        incidentId: selectedIncidentCode,
        incidentType,
        severityScore,
        rainfallMm,
        windSpeedKmh,
        cascadingRiskFlag: 1,
      });
      if (result) {
        setCascadeResult(result);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastRunTime(timeStr);
        setFeedbackMsg(`Simulation updated (${timeStr}): Computed ${result.total_consequences_predicted} cascading failure dominoes across municipal sectors.`);
      }
    } catch (err) {
      console.error('Cascade simulation failed:', err);
      setFeedbackMsg('Simulation failed: unable to calculate cascading failure matrix.');
    } finally {
      setLoading(false);
    }
  }, [selectedIncidentCode, incidentType, severityScore, rainfallMm, windSpeedKmh]);

  useEffect(() => {
    fetchCascadePrediction();
  }, [selectedIncidentCode, incidentType]);

  const secondaryConsequences = cascadeResult?.consequences.filter(c => c.stage === 'Secondary') || [];
  const tertiaryConsequences = cascadeResult?.consequences.filter(c => c.stage === 'Tertiary') || [];

  return (
    <div className="p-8 space-y-6">
      {/* MUNICIPAL HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Cascading Risk Prediction
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Dynamic infrastructure failure tree modeling secondary and tertiary domino impacts across municipal assets.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {lastRunTime && (
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              Last simulated: {lastRunTime}
            </span>
          )}
          <button
            onClick={fetchCascadePrediction}
            disabled={loading}
            className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'CALCULATING DOMINO RISK...' : 'RERUN CASCADE SIMULATION'}</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {feedbackMsg && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="font-medium">{feedbackMsg}</span>
          </div>
          <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
            Rain: {rainfallMm}mm/h • Wind: {windSpeedKmh}km/h
          </span>
        </div>
      )}

      {/* CONTROLS BAR */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
            Target Incident (PostgreSQL)
          </label>
          <select
            value={selectedIncidentCode}
            onChange={(e) => handleIncidentSelect(e.target.value)}
            className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
          >
            {incidents.length > 0 ? (
              incidents.slice(0, 15).map((inc) => (
                <option key={inc.id} value={inc.id}>
                  {inc.id} — {inc.category} ({inc.location.slice(0, 20)}...)
                </option>
              ))
            ) : (
              <>
                <option value="INC-101">INC-101 — Pothole (Main St...)</option>
                <option value="INC-102">INC-102 — Water Leakage (Oak Ave...)</option>
                <option value="INC-1001">INC-1001 — Water Main Break (Central Zone)</option>
              </>
            )}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
            Simulated Hazard Type
          </label>
          <select
            value={incidentType}
            onChange={(e) => setIncidentType(e.target.value)}
            className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
          >
            {incidentTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex justify-between text-[11px] font-bold text-slate-600 uppercase mb-1">
            <span>Severity Score</span>
            <span className="text-orange-600 font-mono">{severityScore.toFixed(1)} / 10</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            step="0.1"
            value={severityScore}
            onChange={(e) => setSeverityScore(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
          />
        </div>

        <div>
          <div className="flex justify-between text-[11px] font-bold text-slate-600 uppercase mb-1">
            <span>Rainfall Telemetry</span>
            <span className="text-blue-600 font-mono">{rainfallMm} mm/h</span>
          </div>
          <input
            type="range"
            min="0"
            max="120"
            step="5"
            value={rainfallMm}
            onChange={(e) => setRainfallMm(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        <div>
          <div className="flex justify-between text-[11px] font-bold text-slate-600 uppercase mb-1">
            <span>Wind Speed</span>
            <span className="text-teal-600 font-mono">{windSpeedKmh} km/h</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={windSpeedKmh}
            onChange={(e) => setWindSpeedKmh(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
          />
        </div>
      </div>

      {/* CASCADE PROPAGATION TREE & METRICS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* ROOT INCIDENT BANNER */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="p-2 bg-red-100 text-red-700 rounded-lg font-bold">
                  <AlertTriangle className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Root Failure Anchor: {cascadeResult?.root_incident_id || selectedIncidentCode}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Trigger: <span className="font-semibold text-slate-800">{cascadeResult?.root_incident_type || incidentType}</span> (Severity {cascadeResult?.root_severity || severityScore})
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-full uppercase tracking-wider">
                {cascadeResult?.overall_threat_level || 'CRITICAL CASCADE RISK'}
              </span>
            </div>

            {/* VISUAL HOP FLOW */}
            <div className="flex items-center space-x-3 overflow-x-auto py-3">
              <div className="flex-shrink-0 w-36 p-3 bg-red-50 border border-red-200 rounded-xl text-center">
                <p className="text-[10px] uppercase font-black text-red-600">Depth 0 (Root)</p>
                <p className="text-xs font-bold text-slate-900 truncate mt-1">{incidentType}</p>
                <span className="text-[10px] text-red-700 font-mono mt-0.5 inline-block">Initial Shock</span>
              </div>

              <ArrowRight className="w-5 h-5 text-slate-400 flex-shrink-0" />

              <div className="flex-shrink-0 w-48 p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                <p className="text-[10px] uppercase font-black text-amber-700">
                  Depth 1 ({secondaryConsequences.length} Secondary)
                </p>
                <p className="text-xs font-bold text-slate-900 truncate mt-1">
                  {secondaryConsequences[0]?.name || 'Surface Inundation'}
                </p>
                <span className="text-[10px] text-amber-700 font-mono mt-0.5 inline-block">
                  Horizon: {secondaryConsequences[0]?.time_horizon || '15-45m'}
                </span>
              </div>

              <ArrowRight className="w-5 h-5 text-slate-400 flex-shrink-0" />

              <div className="flex-shrink-0 w-48 p-3 bg-purple-50 border border-purple-200 rounded-xl text-center">
                <p className="text-[10px] uppercase font-black text-purple-700">
                  Depth 2 ({tertiaryConsequences.length} Tertiary)
                </p>
                <p className="text-xs font-bold text-slate-900 truncate mt-1">
                  {tertiaryConsequences[0]?.name || 'Transit Gridlock'}
                </p>
                <span className="text-[10px] text-purple-700 font-mono mt-0.5 inline-block">
                  Horizon: {tertiaryConsequences[0]?.time_horizon || '1-3h'}
                </span>
              </div>
            </div>
          </div>

          {/* DETAILED CONSEQUENCE BREAKDOWN CARDS */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
              <CornerDownRight className="w-4 h-4 text-slate-500" />
              <span>Multi-Stage Propagation Consequence Cards ({cascadeResult?.total_consequences_predicted || 0} Predicted)</span>
            </h4>

            {cascadeResult?.consequences.map((c, idx) => (
              <div
                key={idx}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 hover:border-slate-300 transition-all"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                      c.stage === 'Secondary' ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {c.stage} Consequence (Depth {c.depth})
                    </span>
                    <span className="text-xs font-bold text-slate-700">{c.subsystem}</span>
                  </div>
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold ${
                    c.risk_level === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {c.risk_level} • {c.time_horizon}
                  </span>
                </div>

                <h4 className="text-base font-bold text-slate-900">{c.name}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{c.reason}</p>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">
                      Preventive Cascade Breaker Action
                    </span>
                    <p className="text-xs font-semibold text-emerald-900 mt-0.5">
                      {c.preventive_break_action}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RISK SUMMARY SIDEBAR */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg space-y-5">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
              <Zap className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold">Cascading Threat Profile</h3>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                <p className="text-[10px] uppercase font-bold text-slate-400">Total Predicted Domino Failures</p>
                <p className="text-2xl font-black text-amber-400 mt-1">
                  {cascadeResult?.total_consequences_predicted || 0}
                </p>
                <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                  <span>Critical: {cascadeResult?.critical_consequences_count || 0}</span>
                  <span>High: {cascadeResult?.high_consequences_count || 0}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                <p className="text-[10px] uppercase font-bold text-slate-400">Amplification Telemetry</p>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Weather Amplified:</span>
                    <span className={`font-mono font-bold ${cascadeResult?.weather_amplified ? 'text-red-400' : 'text-slate-400'}`}>
                      {cascadeResult?.weather_amplified ? 'YES (+Rain/Wind)' : 'BASELINE'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Graph Proximity Boost:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {cascadeResult?.connected_causal_nodes_count || 0} Connected Nodes
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-orange-950/60 rounded-xl border border-orange-800/80">
                <p className="text-[10px] uppercase font-black text-orange-400">Municipal Dispatch Action</p>
                <p className="text-xs text-orange-200 mt-1 leading-relaxed">
                  Apply cascade breaker actions immediately before <strong>{secondaryConsequences[0]?.time_horizon || '45 mins'}</strong> window closes to avoid secondary system failure.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CascadingRisk;
