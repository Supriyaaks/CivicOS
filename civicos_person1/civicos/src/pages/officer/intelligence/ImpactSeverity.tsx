import React, { useState, useEffect } from 'react';
import { useMccStore } from '../../../store/mccStore';
import { predictiveService, ScoringResult } from '../../../services/predictiveService';
import { Award, Sliders } from 'lucide-react';

const ImpactSeverity: React.FC = () => {
  const { incidents } = useMccStore();
  const [severityScore, setSeverityScore] = useState<number>(8.5);
  const [impactRadius, setImpactRadius] = useState<number>(1500);
  const [affectedPopulation, setAffectedPopulation] = useState<number>(12000);
  const [cascadingFlag, setCascadingFlag] = useState<number>(1);
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    evaluateCompositeScore();
  }, [severityScore, impactRadius, affectedPopulation, cascadingFlag]);

  const evaluateCompositeScore = async () => {
    setLoading(true);
    try {
      const res = await predictiveService.evaluateScores({
        severityScore,
        impactRadiusMeters: impactRadius,
        affectedPopulation,
        cascadingRiskFlag: cascadingFlag,
      });
      if (res) setScoringResult(res);
    } catch (err) {
      console.error('Failed to evaluate score:', err);
    } finally {
      setLoading(false);
    }
  };

  const evalData = scoringResult?.incident_evaluation;

  return (
    <div className="p-8 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Impact, Severity & Smart Priority Engine
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Dynamic municipal impact scoring combining physical damage radius, demographic exposure, and cascading risk multipliers.
          </p>
        </div>
      </div>

      {/* EVALUATION CALCULATOR BAR */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-orange-600" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Interactive Composite Score Calculator
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">{loading ? 'Calculating...' : 'Real-time recalculation'}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-2">
          <div>
            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
              <span>Input Severity (1-10)</span>
              <span className="font-mono text-orange-600">{severityScore.toFixed(1)}</span>
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
            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
              <span>Impact Radius (Meters)</span>
              <span className="font-mono text-blue-600">{impactRadius}m</span>
            </div>
            <input
              type="range"
              min="100"
              max="5000"
              step="100"
              value={impactRadius}
              onChange={(e) => setImpactRadius(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
              <span>Affected Population</span>
              <span className="font-mono text-purple-600">{affectedPopulation.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min="500"
              max="30000"
              step="500"
              value={affectedPopulation}
              onChange={(e) => setAffectedPopulation(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
              <span>Cascading Risk Multiplier</span>
              <span className="font-mono text-red-600">{cascadingFlag ? 'ACTIVE (1.0)' : 'OFF (0.0)'}</span>
            </div>
            <button
              onClick={() => setCascadingFlag(prev => (prev === 1 ? 0 : 1))}
              className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-all border ${
                cascadingFlag === 1
                  ? 'bg-red-50 text-red-700 border-red-300'
                  : 'bg-slate-100 text-slate-600 border-slate-300'
              }`}
            >
              {cascadingFlag === 1 ? 'Cascading Multiplier ENABLED' : 'Cascading Multiplier DISABLED'}
            </button>
          </div>
        </div>

        {/* RESULTS GAUGES */}
        {evalData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl text-center">
              <span className="text-[10px] uppercase font-black text-orange-700 tracking-wider">Composite Severity Score</span>
              <div className="text-3xl font-black text-orange-600 font-mono mt-1">
                {evalData.severity_score} <span className="text-xs font-normal text-slate-500">/ 100</span>
              </div>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-200 text-orange-800">
                Tier: {evalData.severity_tier}
              </span>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl text-center">
              <span className="text-[10px] uppercase font-black text-purple-700 tracking-wider">Smart Dispatch Priority</span>
              <div className="text-3xl font-black text-purple-600 font-mono mt-1">
                {evalData.priority_score} <span className="text-xs font-normal text-slate-500">/ 100</span>
              </div>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-200 text-purple-800">
                Tier: {evalData.priority_tier}
              </span>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-700">
              <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider block">Factor Contribution Weights</span>
              <div className="flex justify-between">
                <span>Physical Intensity:</span>
                <span className="font-mono font-bold">{evalData.factors?.intensity}%</span>
              </div>
              <div className="flex justify-between">
                <span>Population Exposure:</span>
                <span className="font-mono font-bold">{evalData.factors?.population}%</span>
              </div>
              <div className="flex justify-between">
                <span>Geographical Spread:</span>
                <span className="font-mono font-bold">{evalData.factors?.geographical}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CITY-WIDE IMPACT MATRIX TABLE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">City-Wide Incident Impact Roster (PostgreSQL)</h3>
            <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-bold">
              {incidents.length} Live Incidents
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5 font-bold uppercase">Incident ID</th>
                  <th className="px-3 py-2.5 font-bold uppercase">Category</th>
                  <th className="px-3 py-2.5 font-bold uppercase">Assessed Severity</th>
                  <th className="px-3 py-2.5 font-bold uppercase">Impact Score</th>
                  <th className="px-3 py-2.5 font-bold uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 font-bold text-slate-900 font-mono">{inc.id}</td>
                    <td className="px-3 py-2.5 text-slate-700">{inc.category}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        inc.severity === 'Critical' ? 'bg-red-100 text-red-700' : inc.severity === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-slate-800">{inc.impactScore || 50}/100</span>
                        <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              (inc.impactScore || 50) > 70 ? 'bg-red-500' : (inc.impactScore || 50) > 40 ? 'bg-orange-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${inc.impactScore || 50}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{inc.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SUMMARY STATS */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg space-y-4">
          <h3 className="text-base font-bold flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Award className="w-5 h-5 text-amber-400" />
            <span>Severity & Priority Invariants</span>
          </h3>

          <div className="space-y-3">
            <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
              <p className="text-[10px] uppercase font-bold text-slate-400">Scoring Algorithm</p>
              <p className="text-xs font-mono text-emerald-400 mt-1">2.0-weighted-normalized</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Weights: Intensity (25%), Population (20%), Geo (15%), Cascade (25%), Urgency (15%).
              </p>
            </div>

            <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
              <p className="text-[10px] uppercase font-bold text-slate-400">Database Grounding</p>
              <p className="text-xs text-slate-300 mt-1">
                Calculated composite scores are written to the <code className="text-amber-400 font-mono">impactScore</code> column in PostgreSQL.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImpactSeverity;
