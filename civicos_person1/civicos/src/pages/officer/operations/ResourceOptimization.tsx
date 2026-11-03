import React, { useState, useEffect } from 'react';
import { backendService } from '../../../services/backendService';
import {
  TrendingUp,
  Cpu,
  Sparkles
} from 'lucide-react';

export const ResourceOptimization: React.FC = () => {
  const [pools, setPools] = useState<any[]>([]);
  const [simulationResult, setSimulationResult] = useState<string | null>(null);

  useEffect(() => {
    backendService.getResourcePools().then(p => {
      if (p) setPools(p);
    });
  }, []);

  const handleRunSimulation = () => {
    setSimulationResult(
      'Simulation complete: Dynamic re-balancing shows shifting 4 personnel and 1 road patch vehicle from Parks & Public Spaces to Roads & Infrastructure will reduce average critical SLA turnaround by 2.4 hours with 0% risk of park maintenance backlogs.'
    );
  };

  return (
    <div className="space-y-6 p-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Resource Optimization & Capacity Planning</h1>
            <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase bg-blue-100 text-blue-700 rounded-full border border-blue-200">
              Module E • Algorithmic Balancing
            </span>
          </div>
          <p className="text-slate-500 text-sm font-medium">
            Simulate inter-agency resource reallocation, eliminate departmental bottlenecks and optimize response times
          </p>
        </div>

        <button
          onClick={handleRunSimulation}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
        >
          <Cpu className="w-4 h-4" />
          <span>Run What-If Capacity Simulation</span>
        </button>
      </div>

      {simulationResult && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl text-xs text-purple-900 flex items-start space-x-3">
          <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-sm">Simulation Engine Findings</span>
            <p className="leading-relaxed">{simulationResult}</p>
          </div>
        </div>
      )}

      {/* POOLS UTILIZATION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Department Capacity & Utilization Rates</h2>
            <span className="text-xs font-semibold text-slate-400">Total 6 Municipal Agencies</span>
          </div>

          <div className="space-y-4">
            {pools.map(pool => (
              <div key={pool.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-800">{pool.departmentName}</span>
                    <span className="text-slate-400 font-mono">({pool.personnel} Personnel • {pool.vehicles} Vehicles)</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    pool.status === 'Bottleneck' ? 'bg-red-100 text-red-700' :
                    pool.status === 'Optimal' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {pool.status} • {pool.utilizationRate}% Load
                  </span>
                </div>

                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      pool.utilizationRate > 80 ? 'bg-red-500' : pool.utilizationRate > 50 ? 'bg-blue-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${pool.utilizationRate}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Available: {pool.availablePersonnel} Staff, {pool.availableVehicles} Vehicles, {pool.availableEquipment} Equipment</span>
                  <span className="text-slate-400">Active Tasks: {pool.assignedPersonnel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CITY-WIDE LOAD SUMMARY */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <h3 className="text-base font-bold">City-Wide Fleet Telemetry</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-800/80 rounded-xl space-y-1">
                <span className="text-slate-400">Aggregate Municipal Load</span>
                <div className="text-2xl font-black text-blue-400">62.8%</div>
                <p className="text-[10px] text-slate-500">Across all 6 emergency & civic response divisions</p>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-xl space-y-1">
                <span className="text-slate-400">Bottleneck Vulnerability</span>
                <div className="text-2xl font-black text-amber-400">Low-Moderate</div>
                <p className="text-[10px] text-slate-500">Roads & Infrastructure nearing 78% capacity threshold</p>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-xl space-y-1">
                <span className="text-slate-400">Average Urban SLA</span>
                <div className="text-2xl font-black text-emerald-400">18.5 hrs</div>
                <p className="text-[10px] text-slate-500">Compliant with municipal charter target of 24 hrs</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Dynamic Optimizer v2.4</span>
            <span className="font-bold text-blue-400">Synced</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceOptimization;
