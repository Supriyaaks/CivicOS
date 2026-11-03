import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { backendService } from '../../../services/backendService';
import {
  Users,
  Edit2,
  ArrowRight
} from 'lucide-react';

export const DeptMgmt: React.FC = () => {
  const navigate = useNavigate();

  const [performanceList, setPerformanceList] = useState<any[]>([]);
  const [filterQuery, setFilterQuery] = useState('');
  const [editingDept, setEditingDept] = useState<any | null>(null);
  const [editStaffCount, setEditStaffCount] = useState<number>(30);
  const [editWorkload, setEditWorkload] = useState<string>('Medium');
  const [isSaving, setIsSaving] = useState(false);

  const loadPerformance = async () => {
    try {
      const data = await backendService.getDepartmentPerformance();
      if (data && data.length > 0) {
        setPerformanceList(data);
      }
    } catch (err) {
      console.error('Failed to load performance metrics', err);
    }
  };

  useEffect(() => {
    loadPerformance();
  }, []);

  const handleStartEdit = (dept: any) => {
    setEditingDept(dept);
    setEditStaffCount(dept.staffCount || 30);
    setEditWorkload(dept.workloadStatus || 'Medium');
  };

  const handleSaveEdit = async () => {
    if (!editingDept) return;
    setIsSaving(true);
    try {
      await backendService.updateDepartment(editingDept.id, {
        staffCount: Number(editStaffCount),
        workload: editWorkload
      });

      setPerformanceList(prev =>
        prev.map(d =>
          d.id === editingDept.id
            ? { ...d, staffCount: Number(editStaffCount), workloadStatus: editWorkload }
            : d
        )
      );

      setEditingDept(null);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredDepts = performanceList.filter(d =>
    d.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    d.code.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 p-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Department Performance & Operations</h1>
            <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase bg-blue-100 text-blue-700 rounded-full border border-blue-200">
              Module J • SLA Monitoring
            </span>
          </div>
          <p className="text-slate-500 text-sm font-medium">
            Monitor real-time assigned vs resolved volume, overdue ticket escalations, SLA turnaround & staff capacity
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="text"
            placeholder="Filter departments..."
            value={filterQuery}
            onChange={e => setFilterQuery(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* SUMMARY BANNER */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Active Municipal Agencies</span>
          <div className="text-2xl font-black text-slate-900">{performanceList.length}</div>
          <span className="text-[10px] text-slate-500 font-semibold">All Divisions Online</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-blue-500 uppercase">Total Field Staff</span>
          <div className="text-2xl font-black text-blue-600">
            {performanceList.reduce((acc, d) => acc + (d.staffCount || 0), 0)}
          </div>
          <span className="text-[10px] text-blue-600 font-semibold">Active Authorized Personnel</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-amber-500 uppercase">Citywide Pending Load</span>
          <div className="text-2xl font-black text-amber-600">
            {performanceList.reduce((acc, d) => acc + (d.pendingCount || 0), 0)}
          </div>
          <span className="text-[10px] text-amber-600 font-semibold">Active Operational Tickets</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-emerald-500 uppercase">Total Certified Fixed</span>
          <div className="text-2xl font-black text-emerald-600">
            {performanceList.reduce((acc, d) => acc + (d.resolvedCount || 0), 0)}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold">Resolved Since Inception</span>
        </div>
      </div>

      {/* DEPARTMENT CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDepts.map(dept => (
          <div
            key={dept.id}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between hover:border-blue-200 transition"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{dept.name}</h3>
                  <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {dept.code}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  dept.workloadStatus === 'High' ? 'bg-red-100 text-red-700' :
                  dept.workloadStatus === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {dept.workloadStatus} Load
                </span>
              </div>

              {/* Performance Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Pending Tickets</span>
                  <div className="text-base font-black text-amber-600">{dept.pendingCount}</div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Resolved Tickets</span>
                  <div className="text-base font-black text-emerald-600">{dept.resolvedCount}</div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">SLA Overdue ({'>'}24h)</span>
                  <div className={`text-base font-black ${dept.overdueCount > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                    {dept.overdueCount}
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Avg Resolution</span>
                  <div className="text-base font-black text-blue-600">{dept.avgResolutionHours}h</div>
                </div>
              </div>

              {/* Capacity Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                  <span>Fleet Utilization</span>
                  <span className="font-bold text-slate-700">{dept.utilizationRate}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      dept.utilizationRate > 80 ? 'bg-red-500' : dept.utilizationRate > 50 ? 'bg-blue-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${dept.utilizationRate}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono text-[11px] flex items-center space-x-1">
                <Users className="w-3 h-3 text-slate-400" />
                <span>{dept.staffCount} Staff</span>
              </span>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleStartEdit(dept)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold flex items-center space-x-1 transition"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => navigate(`/officer/incidents?dept=${encodeURIComponent(dept.name)}`)}
                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold flex items-center space-x-1 transition"
                >
                  <span>Tickets</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* EDIT MODAL */}
      {editingDept && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Edit Department Profile</h3>
              <button onClick={() => setEditingDept(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="font-bold text-slate-700">Department:</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{editingDept.name} ({editingDept.code})</p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Staff Count</label>
                <input
                  type="number"
                  min={1}
                  value={editStaffCount}
                  onChange={e => setEditStaffCount(parseInt(e.target.value) || 0)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Workload Capacity Level</label>
                <select
                  value={editWorkload}
                  onChange={e => setEditWorkload(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Overloaded">Overloaded</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                onClick={() => setEditingDept(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm transition disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeptMgmt;
