import React, { useMemo } from 'react';
import { useMccStore } from '../../store/mccStore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const StaffDashboard: React.FC = () => {
  const { incidents } = useMccStore();
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();

  const metrics = useMemo(() => {
    const assigned = incidents.filter(inc => inc.assignedDept !== '');
    return {
      total: assigned.length,
      awaiting: assigned.filter(inc => inc.status === 'Dispatching').length,
      accepted: assigned.filter(inc => inc.status === 'Accepted').length,
      inProgress: assigned.filter(inc => ['In Progress', 'Travelling', 'Arrived'].includes(inc.status)).length,
      completed: assigned.filter(inc => inc.status === 'Verified').length,
      overdue: assigned.filter(inc => {
        if (!inc.date) return false;
        return new Date(inc.date) < new Date() && !['Verified', 'Rejected'].includes(inc.status);
      }).length,
      critical: assigned.filter(inc => inc.severity === 'Critical').length,
      blocked: assigned.filter(inc => inc.status === 'Blocked').length,
      verifying: assigned.filter(inc => inc.status === 'Awaiting Verification').length,
      rework: assigned.filter(inc => inc.status === 'Rework Required').length,
    };
  }, [incidents]);

  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    incidents.filter(inc => inc.assignedDept !== '').forEach(inc => {
      counts[inc.status] = (counts[inc.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [incidents]);

  const priorityDistribution = useMemo(() => {
    const counts: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    incidents.filter(inc => inc.assignedDept !== '').forEach(inc => {
      if (counts[inc.severity] !== undefined) counts[inc.severity]++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [incidents]);

  const priorityQueue = useMemo(() => {
    return incidents
      .filter(inc => inc.assignedDept !== '')
      .sort((a, b) => {
        const severityMap: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
        if (severityMap[a.severity] !== severityMap[b.severity]) {
          return severityMap[a.severity] - severityMap[b.severity];
        }
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      })
      .slice(0, 5);
  }, [incidents]);

  const handleMetricClick = (status: string) => {
    setSearchParams({ status: status });
    navigate('/staff/tasks');
  };

  const COLORS = ['#3B82F6', '#06B6D4', '#6366F1', '#EF4444', '#F59E0B', '#10B981'];

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700 staff-portal">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <span className="px-2 py-0.5 bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded">Ops Command</span>
            <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Field Intelligence Portal</span>
          </div>
          <h1 className="text-6xl font-black text-white tracking-tighter">Field Operations</h1>
          <div className="flex items-center space-x-4 text-slate-400">
            <span className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Shift Active: System Online</span>
            </span>
            <span className="text-slate-700">|</span>
            <span className="text-sm font-medium">Municipal Registry v4.2</span>
          </div>
        </div>

        <div className="flex gap-4">
          <button onClick={() => navigate('/staff/tasks')} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-900/20 active:scale-95">
            Manage Assignments
          </button>
          <button onClick={() => navigate('/staff/profile')} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all border border-slate-700 active:scale-95">
            Profile
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {[
          { label: 'Total', value: metrics.total, color: 'text-blue-400', icon: '📋', status: 'all' },
          { label: 'Awaiting', value: metrics.awaiting, color: 'text-cyan-400', icon: '⏳', status: 'Dispatching' },
          { label: 'Active', value: metrics.inProgress, color: 'text-indigo-400', icon: '🛠️', status: 'In Progress' },
          { label: 'Blocked', value: metrics.blocked, color: 'text-red-400', icon: '⚠️', status: 'Blocked' },
          { label: 'Verify', value: metrics.verifying, color: 'text-amber-400', icon: '🔍', status: 'Awaiting Verification' },
        ].map((stat, i) => (
          <div
            key={i}
            onClick={() => handleMetricClick(stat.status)}
            className="group p-6 rounded-3xl bg-slate-900/50 border border-slate-800 backdrop-blur-md transition-all hover:-translate-y-1 hover:border-blue-500 cursor-pointer shadow-xl"
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-2xl opacity-80 group-hover:scale-110 transition-transform">{stat.icon}</span>
              <span className={`text-[10px] font-black uppercase tracking-wider ${stat.color} opacity-60`}>Live</span>
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className={`text-4xl font-black tracking-tighter ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-slate-900/40 rounded-3xl border border-slate-800 shadow-inner overflow-hidden backdrop-blur-sm">
            <div className="px-8 py-5 border-b border-slate-800 bg-slate-900/60 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <span className="text-red-500 text-xl">🚨</span>
                <h3 className="font-black text-slate-100 uppercase tracking-tight text-lg">Priority Response Queue</h3>
              </div>
              <button onClick={() => navigate('/staff/tasks')} className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors">View All Tasks →</button>
            </div>
            <div className="divide-y divide-slate-800">
              {priorityQueue.length > 0 ? priorityQueue.map(inc => (
                <div
                  key={inc.id}
                  onClick={() => navigate(`/staff/task/${inc.id}`)}
                  className="px-8 py-5 flex items-center justify-between group cursor-pointer hover:bg-slate-800/50 transition-all"
                >
                  <div className="flex items-center space-x-6">
                    <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-blue-400 font-black text-lg border border-slate-700 group-hover:border-blue-500 transition-all shadow-inner">
                      {inc.id.split('-')[1] || '!!'}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-black text-blue-500 uppercase tracking-widest">{inc.id}</span>
                        <span className="text-base font-bold text-slate-100">{inc.category}</span>
                      </div>
                      <p className="text-sm text-slate-500 flex items-center space-x-2">
                        <span className="opacity-50">📍</span> <span>{inc.location}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-red-500/10 text-red-400 rounded-md border border-red-500/20">{inc.severity}</span>
                    <span className="text-slate-600 group-hover:text-blue-400 transition-colors">&rarr;</span>
                  </div>
                </div>
              )) : (
                <div className="py-16 text-center space-y-3">
                  <div className="text-5xl opacity-20">😌</div>
                  <p className="text-slate-500 font-medium italic">No critical assignments currently in queue.</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 backdrop-blur-sm">
              <h3 className="font-black text-slate-100 uppercase tracking-tight text-lg mb-6 flex items-center space-x-3">
                <span>📊</span> <span>Status Distribution</span>
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#f1f5f9' }}
                      itemStyle={{ color: '#60a5fa' }}
                    />
                    <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 backdrop-blur-sm">
              <h3 className="font-black text-slate-100 uppercase tracking-tight text-lg mb-6 flex items-center space-x-3">
                <span>🍕</span> <span>Priority Spread</span>
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorityDistribution}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {priorityDistribution.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#f1f5f9' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-800 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-blue-600/20 transition-all" />
            <div className="relative z-10 space-y-8">
              <div className="flex items-center space-x-3">
                <span className="text-blue-400 text-xl">📈</span>
                <h3 className="font-black text-slate-100 uppercase tracking-tight text-lg">Operational Intel</h3>
              </div>
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Workforce Efficiency</span>
                    <span className="text-xs text-green-400 font-bold">↑ 2.4%</span>
                  </div>
                  <div className="flex items-end space-x-3">
                    <span className="text-4xl font-black text-white tracking-tighter">84%</span>
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full mb-2 overflow-hidden">
                      <div className="bg-blue-500 h-full w-[84%] shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Avg. Response Time</span>
                    <span className="text-xs text-red-400 font-bold">↓ 5m</span>
                  </div>
                  <div className="flex items-end space-x-3">
                    <span className="text-4xl font-black text-white tracking-tighter">42<span className="text-lg font-medium text-slate-500 ml-1">min</span></span>
                  </div>
                </div>
              </div>
              <div className="pt-6 border-t border-slate-800">
                <button
                  onClick={() => navigate('/staff/profile')}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-3 shadow-lg shadow-blue-900/40 active:scale-95"
                >
                  <span>👤</span> <span>Performance Profile</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
