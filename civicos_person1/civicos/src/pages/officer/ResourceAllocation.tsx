import React, { useState, useEffect } from 'react';
import { useMccStore } from '../../store/mccStore';
import { backendService } from '../../services/backendService';
import {
  Truck,
  Users,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Send,
  Building2,
  ArrowRight,
  Cpu
} from 'lucide-react';

export const ResourceAllocation: React.FC = () => {
  const { incidents } = useMccStore();

  const [pools, setPools] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(incidents[0]?.id || '');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  
  // Dispatch form state
  const [personnel, setPersonnel] = useState<number>(2);
  const [vehicles, setVehicles] = useState<number>(1);
  const [equipment, setEquipment] = useState<number>(1);
  const [officerName] = useState<string>('Operations Chief');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    try {
      const p = await backendService.getResourcePools();
      if (p && p.length > 0) {
        setPools(p);
        if (!selectedDeptId && p[0]) setSelectedDeptId(p[0].departmentId);
      }

      const recs = await backendService.getResourceRecommendations();
      if (recs && recs.length > 0) setRecommendations(recs);
    } catch (err) {
      console.error('Error fetching resource data', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncidentId || !selectedDeptId) return;

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const res = await backendService.allocateResources({
        incidentId: selectedIncidentId,
        departmentId: selectedDeptId,
        personnel: Number(personnel),
        vehicles: Number(vehicles),
        equipment: Number(equipment),
        officerName
      });

      if (res && res.success) {
        setStatusMessage({
          type: 'success',
          text: `Successfully dispatched ${personnel} personnel, ${vehicles} vehicles, ${equipment} units to incident ${selectedIncidentId}.`
        });
        loadData();
      } else {
        setStatusMessage({
          type: 'error',
          text: res?.message || 'Failed to allocate resources. Check availability.'
        });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Error executing resource dispatch.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyRecommendation = (rec: any) => {
    setSelectedIncidentId(rec.incidentId);
    setSelectedDeptId(rec.departmentId);
    setPersonnel(rec.recommendedAllocation.personnel);
    setVehicles(rec.recommendedAllocation.vehicles);
    setEquipment(rec.recommendedAllocation.equipment);
  };

  const selectedPool = pools.find(p => p.departmentId === selectedDeptId);

  return (
    <div className="space-y-6 p-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Resource Management & Field Allocation</h1>
            <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase bg-blue-100 text-blue-700 rounded-full border border-blue-200">
              Module E • Fleet & Personnel
            </span>
          </div>
          <p className="text-slate-500 text-sm font-medium">
            Manage municipal field crews, heavy repair equipment, utility fleet & deploy algorithmic recommendations
          </p>
        </div>
      </div>

      {/* STATUS BANNER */}
      {statusMessage && (
        <div className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between ${
          statusMessage.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <div className="flex items-center space-x-2">
            {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </div>
      )}

      {/* DEPARTMENT RESOURCE POOLS OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pools.map((p, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-xl border transition ${
              p.departmentId === selectedDeptId
                ? 'bg-blue-50/50 border-blue-400 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-slate-900 text-xs truncate max-w-[170px]">{p.departmentName}</span>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                p.status === 'Bottleneck' ? 'bg-red-100 text-red-700' :
                p.status === 'Optimal' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {p.status} ({p.utilizationRate}%)
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 bg-slate-50 rounded-lg">
                <Users className="w-3.5 h-3.5 mx-auto text-blue-600 mb-1" />
                <span className="block font-bold text-slate-800">{p.availablePersonnel} / {p.personnel}</span>
                <span className="text-[10px] text-slate-400">Personnel</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <Truck className="w-3.5 h-3.5 mx-auto text-amber-600 mb-1" />
                <span className="block font-bold text-slate-800">{p.availableVehicles} / {p.vehicles}</span>
                <span className="text-[10px] text-slate-400">Vehicles</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <Wrench className="w-3.5 h-3.5 mx-auto text-purple-600 mb-1" />
                <span className="block font-bold text-slate-800">{p.availableEquipment} / {p.equipment}</span>
                <span className="text-[10px] text-slate-400">Equipment</span>
              </div>
            </div>

            <div className="mt-3">
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    p.utilizationRate > 80 ? 'bg-red-500' : p.utilizationRate > 50 ? 'bg-blue-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${p.utilizationRate}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DISPATCH CONTROLLER FORM */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Building2 className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Incident Resource Dispatcher</h2>
          </div>

          <form onSubmit={handleAllocate} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Select Target Incident</label>
              <select
                value={selectedIncidentId}
                onChange={e => setSelectedIncidentId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {incidents.map(inc => (
                  <option key={inc.id} value={inc.id}>
                    {inc.id} • {inc.category} ({inc.severity} Severity) - {inc.location}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Dispatching Department Pool</label>
              <select
                value={selectedDeptId}
                onChange={e => setSelectedDeptId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {pools.map(p => (
                  <option key={p.departmentId} value={p.departmentId}>
                    {p.departmentName} (Avail: {p.availablePersonnel} staff, {p.availableVehicles} vehicles, {p.availableEquipment} units)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Personnel Units</label>
                <input
                  type="number"
                  min={0}
                  max={selectedPool?.availablePersonnel || 50}
                  value={personnel}
                  onChange={e => setPersonnel(parseInt(e.target.value) || 0)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Vehicles</label>
                <input
                  type="number"
                  min={0}
                  max={selectedPool?.availableVehicles || 20}
                  value={vehicles}
                  onChange={e => setVehicles(parseInt(e.target.value) || 0)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Equipment Units</label>
                <input
                  type="number"
                  min={0}
                  max={selectedPool?.availableEquipment || 30}
                  value={equipment}
                  onChange={e => setEquipment(parseInt(e.target.value) || 0)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-sm disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Dispatching Field Units...' : 'Authorize & Dispatch Field Resources'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* AI & ALGORITHMIC RECOMMENDATIONS */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-purple-600" />
              <h2 className="text-base font-bold text-slate-900">Optimization Recommendations</h2>
            </div>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              Severity-Weighted
            </span>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {recommendations.map((rec, i) => (
              <div
                key={i}
                className="p-3.5 bg-slate-50 hover:bg-white border border-slate-200 hover:border-purple-200 rounded-xl space-y-2 transition text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900">{rec.incidentCode} • {rec.category}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    rec.urgency === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {rec.urgency}
                  </span>
                </div>

                <p className="text-slate-600 text-[11px] leading-relaxed">{rec.justification}</p>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[11px]">
                  <span className="text-slate-500 font-semibold">
                    Rec: {rec.recommendedAllocation.personnel} staff, {rec.recommendedAllocation.vehicles} veh, {rec.recommendedAllocation.equipment} equip
                  </span>

                  <button
                    onClick={() => handleApplyRecommendation(rec)}
                    className="text-purple-600 hover:text-purple-800 font-bold flex items-center space-x-1"
                  >
                    <span>Load Recommendation</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}

            {recommendations.length === 0 && (
              <div className="p-8 text-center text-slate-400">
                All high-priority incidents currently have sufficient resource allocations.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceAllocation;
