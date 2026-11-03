import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMccStore } from '../../store/mccStore';
import { backendService } from '../../services/backendService';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  RefreshCw,
  Filter,
  ArrowRight,
  ShieldAlert,
  Building2,
  MapPin,
  TrendingUp,
  Activity,
  UserCheck
} from 'lucide-react';

export const OfficerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { incidents, departments } = useMccStore();

  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  
  // Filter States
  const [selectedWard, setSelectedWard] = useState<string>('ALL');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<string>('ALL');

  // Backend Stats State
  const [backendStats, setBackendStats] = useState<any>(null);
  const [workloadData, setWorkloadData] = useState<any[]>([]);
  const [wardData, setWardData] = useState<any[]>([]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const stats = await backendService.getDashboardStats({
        ward: selectedWard !== 'ALL' ? selectedWard : undefined,
        departmentId: selectedDept !== 'ALL' ? selectedDept : undefined,
        severity: selectedSeverity !== 'ALL' ? selectedSeverity : undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        dateRange: dateRange !== 'ALL' ? dateRange : undefined,
      });
      if (stats) setBackendStats(stats);

      const workload = await backendService.getDashboardWorkload();
      if (workload && workload.length > 0) setWorkloadData(workload);

      const wards = await backendService.getDashboardWards();
      if (wards && wards.length > 0) setWardData(wards);

      setLastRefreshed(new Date());
    } catch (err) {
      console.warn('Could not refresh backend stats, falling back to local store', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [selectedWard, selectedDept, selectedSeverity, selectedStatus, dateRange]);

  // Derived metrics from real data (combining backend response or store)
  const filteredIncidents = incidents.filter(inc => {
    if (selectedWard !== 'ALL' && inc.ward !== selectedWard && !inc.location.includes(selectedWard)) return false;
    if (selectedDept !== 'ALL' && inc.departmentId !== selectedDept && inc.assignedDept !== selectedDept) return false;
    if (selectedSeverity !== 'ALL' && inc.severity.toLowerCase() !== selectedSeverity.toLowerCase()) return false;
    if (selectedStatus !== 'ALL' && inc.status.toLowerCase() !== selectedStatus.toLowerCase()) return false;
    return true;
  });

  const totalIncidents = backendStats?.totalIncidents ?? incidents.length;
  const pendingComplaints = backendStats?.pendingComplaints ?? incidents.filter(i => i.status === 'Pending' || i.status === 'InProgress' || i.status === 'Under Review').length;
  const resolvedComplaints = backendStats?.resolvedComplaints ?? incidents.filter(i => i.status === 'Resolved' || i.status === 'Closed' || i.status === 'Verified').length;
  const criticalIncidents = backendStats?.criticalIncidents ?? incidents.filter(i => i.severity === 'Critical').length;
  const highPriorityIncidents = backendStats?.highPriorityIncidents ?? incidents.filter(i => i.priority === 'High' || i.severity === 'High').length;
  const underInvestigation = backendStats?.underInvestigation ?? incidents.filter(i => i.status === 'InProgress' || i.status === 'Under Review').length;
  const awaitingAssignment = backendStats?.awaitingAssignment ?? incidents.filter(i => !i.assignedDept && !i.departmentId).length;
  const avgResolutionTime = backendStats ? `${backendStats.avgResolutionTimeHours} hrs` : '18.5 hrs';

  // Dynamic Wards Breakdown
  const displayedWards = wardData.length > 0 ? wardData : [
    { ward: 'Ward 14', total: 6, pending: 4, resolved: 2, critical: 2, riskLevel: 'High' },
    { ward: 'Ward 7', total: 4, pending: 2, resolved: 2, critical: 1, riskLevel: 'Medium' },
    { ward: 'Ward 3', total: 3, pending: 1, resolved: 2, critical: 1, riskLevel: 'Medium' },
    { ward: 'Ward 9', total: 2, pending: 0, resolved: 2, critical: 0, riskLevel: 'Low' },
  ];

  // Dynamic Workload Breakdown
  const displayedWorkload = workloadData.length > 0 ? workloadData : departments.map(d => ({
    id: d.id,
    name: d.name,
    code: d.name.substring(0, 3).toUpperCase(),
    staffCount: d.personnelCount || 30,
    pendingTasks: incidents.filter(i => (i.assignedDept === d.name || i.departmentId === d.id) && i.status !== 'Resolved').length,
    workload: d.workloadStatus || 'Medium'
  }));

  const handleKpiClick = (filterType: string, filterVal: string) => {
    navigate(`/officer/incidents?${filterType}=${encodeURIComponent(filterVal)}`);
  };

  return (
    <div className="space-y-6 p-4">
      {/* SECTION 1: HEADER & LIVE CONTROLS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Municipal Command Center</h1>
            <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase bg-blue-100 text-blue-700 rounded-full border border-blue-200">
              Module A • Live Operations
            </span>
          </div>
          <p className="text-slate-500 text-sm font-medium">
            Real-time urban situational awareness, cross-department incident routing & SLA monitoring
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>CivicOS Synchronized</span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Synced: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <button
            onClick={fetchStats}
            disabled={isLoading}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50"
            title="Refresh dashboard from backend database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: INTERACTIVE FILTER BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 text-slate-500 font-bold uppercase tracking-wider">
          <Filter className="w-4 h-4 text-blue-600" />
          <span>Dashboard Filters:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Ward Selector */}
          <select
            value={selectedWard}
            onChange={e => setSelectedWard(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="ALL">All Wards</option>
            <option value="Ward 14">Ward 14 (Central)</option>
            <option value="Ward 7">Ward 7 (Commercial)</option>
            <option value="Ward 3">Ward 3 (Waterfront)</option>
            <option value="Ward 9">Ward 9 (Residential)</option>
          </select>

          {/* Department Selector */}
          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="ALL">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>

          {/* Severity Selector */}
          <select
            value={selectedSeverity}
            onChange={e => setSelectedSeverity(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="ALL">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Status Selector */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="InProgress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>

          {/* Date Range Selector */}
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="ALL">All Time</option>
            <option value="today">Today</option>
            <option value="week">Past 7 Days</option>
            <option value="month">This Month</option>
          </select>

          {(selectedWard !== 'ALL' || selectedDept !== 'ALL' || selectedSeverity !== 'ALL' || selectedStatus !== 'ALL' || dateRange !== 'ALL') && (
            <button
              onClick={() => {
                setSelectedWard('ALL');
                setSelectedDept('ALL');
                setSelectedSeverity('ALL');
                setSelectedStatus('ALL');
                setDateRange('ALL');
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline px-1"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* SECTION 3: CORE KPI CARDS (CLICK TO FILTER) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'Total Incidents', value: totalIncidents, filter: 'all', color: 'text-slate-800', accent: 'bg-slate-800', icon: Layers, note: 'All-time logged' },
          { label: 'Pending Tickets', value: pendingComplaints, filter: 'status=Pending', color: 'text-amber-600', accent: 'bg-amber-500', icon: Clock, note: 'Awaiting completion' },
          { label: 'Resolved Tickets', value: resolvedComplaints, filter: 'status=Resolved', color: 'text-emerald-600', accent: 'bg-emerald-500', icon: CheckCircle2, note: 'Certified closed' },
          { label: 'Critical Severity', value: criticalIncidents, filter: 'severity=Critical', color: 'text-red-600', accent: 'bg-red-600', icon: AlertTriangle, note: 'Immediate hazard' },
          { label: 'High Priority', value: highPriorityIncidents, filter: 'priority=High', color: 'text-orange-600', accent: 'bg-orange-500', icon: ShieldAlert, note: 'Elevated triage' },
          { label: 'In Progress', value: underInvestigation, filter: 'status=InProgress', color: 'text-blue-600', accent: 'bg-blue-600', icon: Activity, note: 'Field dispatch active' },
          { label: 'Awaiting Dept', value: awaitingAssignment, filter: 'unassigned=true', color: 'text-purple-600', accent: 'bg-purple-600', icon: UserCheck, note: 'Needs routing' },
          { label: 'Avg Resolution', value: avgResolutionTime, filter: 'resolved=true', color: 'text-teal-600', accent: 'bg-teal-600', icon: TrendingUp, note: 'Civic SLA metric' },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              onClick={() => handleKpiClick('filter', item.filter)}
              className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group cursor-pointer transition-all hover:shadow-md hover:border-blue-300 flex flex-col justify-between"
              title={`Click to view incidents filtered by ${item.label}`}
            >
              <div className={`absolute top-0 left-0 right-0 h-1 ${item.accent}`} />
              <div className="flex items-center justify-between mb-2 pt-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate">{item.label}</span>
                <Icon className={`w-3.5 h-3.5 ${item.color} opacity-70 group-hover:scale-110 transition-transform`} />
              </div>
              <div className={`text-xl font-extrabold ${item.color} tracking-tight`}>{item.value}</div>
              <div className="flex items-center justify-between text-[9px] text-slate-400 mt-1">
                <span>{item.note}</span>
                <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
              </div>
            </div>
          );
        })}
      </div>

      {/* SECTION 4: DEPARTMENT WORKLOAD & WARD RISK DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Workload Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">Department Workload Distribution</h2>
            </div>
            <button
              onClick={() => navigate('/officer/dept-mgmt')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1"
            >
              <span>Manage Departments</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {displayedWorkload.map((dept, i) => {
              const pendingCount = dept.pendingTasks || 0;
              const barWidth = Math.min(100, Math.max(8, (pendingCount / (totalIncidents || 1)) * 100));
              const isHeavy = pendingCount >= 3;
              return (
                <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-800">{dept.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white border border-slate-200 text-slate-500">
                        {dept.staffCount} Staff
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 font-semibold">
                      <span className="text-slate-600">{pendingCount} Active Tasks</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isHeavy ? 'bg-red-100 text-red-700' : pendingCount > 1 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {isHeavy ? 'Heavy' : pendingCount > 1 ? 'Moderate' : 'Optimal'}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        isHeavy ? 'bg-red-500' : pendingCount > 1 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ward-wise Incident Distribution & High-Risk Flags */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-red-600" />
              <h2 className="text-base font-bold text-slate-900">Ward Distribution & High-Risk Zones</h2>
            </div>
            <button
              onClick={() => navigate('/officer/digital-twin')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1"
            >
              <span>View On Digital Twin</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase">
                  <th className="pb-2">Ward / Sector</th>
                  <th className="pb-2">Total</th>
                  <th className="pb-2">Pending</th>
                  <th className="pb-2">Critical</th>
                  <th className="pb-2">Risk Rating</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {displayedWards.map((w, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 font-bold text-slate-900">{w.ward}</td>
                    <td className="py-2.5">{w.total}</td>
                    <td className="py-2.5">
                      <span className="font-semibold text-amber-700">{w.pending}</span>
                    </td>
                    <td className="py-2.5">
                      <span className="font-semibold text-red-600">{w.critical}</span>
                    </td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        w.riskLevel === 'High' ? 'bg-red-100 text-red-700 border border-red-200' :
                        w.riskLevel === 'Medium' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                        'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}>
                        {w.riskLevel}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => navigate(`/officer/incidents?ward=${encodeURIComponent(w.ward)}`)}
                        className="text-blue-600 hover:text-blue-800 font-bold text-[11px]"
                      >
                        Drilldown
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 5: RECENT INCIDENTS FEED & QUICK DISPATCH ACTIONS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-slate-900">Recently Reported Incidents</h2>
            <p className="text-xs text-slate-500">Live feed of incoming citizen reports and ongoing remediation</p>
          </div>
          <button
            onClick={() => navigate('/officer/incidents')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
          >
            <span>View All Incidents</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredIncidents.slice(0, 3).map((inc) => (
            <div
              key={inc.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-300 transition-all shadow-sm space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {inc.id}
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    inc.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                    inc.severity === 'High' ? 'bg-orange-100 text-orange-700' :
                    'bg-slate-200 text-slate-700'
                  }`}>
                    {inc.severity}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{inc.category}</h3>
                <p className="text-xs text-slate-600 line-clamp-2">{inc.description}</p>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium truncate max-w-[140px]">{inc.location}</span>
                <button
                  onClick={() => navigate(`/officer/details/${inc.id}`)}
                  className="text-blue-600 hover:text-blue-800 font-bold flex items-center space-x-1"
                >
                  <span>Review</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OfficerDashboard;
