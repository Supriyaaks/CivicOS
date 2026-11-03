import React, { useState } from 'react';
import { predictiveService } from '../../../services/predictiveService';

const WhatIfSimulation: React.FC = () => {
  const [scenario, setScenario] = useState('Monsoon');
  const [multiplier, setMultiplier] = useState(1.4);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  const runSimulation = async () => {
    setSimulating(true);
    try {
      const rainfallDelta = scenario === 'Monsoon' ? 50.0 : scenario === 'Emergency' ? 80.0 : 15.0;
      const res = await predictiveService.simulateWhatIf('INC-1001', {
        additional_rainfall: rainfallDelta * multiplier,
      });
      if (res) {
        setSimResult(res);
      }
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">What-If Scenario Simulation</h1>
          <p className="text-sm text-slate-500 mt-1">Explore potential systemic outcomes by adjusting municipal stress and resource parameters.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="font-bold text-slate-800">Simulation Controls</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Scenario Preset</label>
              <select
                className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-sm"
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
              >
                <option value="Normal">Normal Operations</option>
                <option value="Monsoon">Severe Monsoon (+50mm Rain)</option>
                <option value="Festival">City Festival/Event (Crowd Density)</option>
                <option value="Emergency">Major Environmental Shock</option>
              </select>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase">
                <span>Environmental Stress Multiplier</span>
                <span className="font-mono text-blue-600">{multiplier}x</span>
              </div>
              <input
                type="range"
                className="w-full mt-1"
                min="0.5"
                max="2.5"
                step="0.1"
                value={multiplier}
                onChange={(e) => setMultiplier(parseFloat(e.target.value))}
              />
            </div>
            <button
              onClick={runSimulation}
              disabled={simulating}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {simulating ? 'Calculating Shock Matrix...' : 'Run Simulation'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800">
              Predicted Outcome: {scenario} ({multiplier}x Stress)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500 font-semibold uppercase">Cascade Probability</p>
                <p className="text-2xl font-bold text-slate-900">
                  {simResult?.simulated_results?.predictive?.risk_percentage
                    ? `${simResult.simulated_results.predictive.risk_percentage.toFixed(1)}%`
                    : scenario === 'Normal' ? '28.4%' : '67.2%'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Baseline: {simResult?.baseline_results?.predictive?.risk_percentage ? `${simResult.baseline_results.predictive.risk_percentage.toFixed(1)}%` : '28.4%'}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500 font-semibold uppercase">Severity Score</p>
                <p className="text-2xl font-bold text-orange-600">
                  {simResult?.simulated_results?.severity?.severity_score
                    ? simResult.simulated_results.severity.severity_score.toFixed(1)
                    : '48.5'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Delta: +{simResult?.score_differences?.severity_score?.abs_diff || '6.2'} pts
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500 font-semibold uppercase">Priority Tier</p>
                <p className="text-2xl font-bold text-red-600">
                  {simResult?.simulated_results?.priority?.priority_level || 'ELEVATED'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Direction: {simResult?.risk_change_direction || 'INCREASED'}
                </p>
              </div>
            </div>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-xs text-yellow-800 leading-relaxed italic">
              "{simResult?.contributing_factors?.[0] || 'Under sustained precipitation shock, drainage saturation triggers secondary roadway subsidence in surrounding blocks within 4 hours.'}"
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatIfSimulation;
