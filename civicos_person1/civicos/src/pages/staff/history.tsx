import React, { useState } from 'react';
import { useMccStore } from '../../store/mccStore';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, FileText, Camera, AlertTriangle } from 'lucide-react';

const TaskHistory: React.FC = () => {
  const { incidents, taskTimelines } = useMccStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('all');

  // Filter for tasks that have reached a final state or are in the verification loop
  const history = incidents.filter(inc =>
    inc.status === 'Resolved' ||
    inc.status === 'Rejected' ||
    inc.status === 'Verified' ||
    inc.status === 'Rework Required' ||
    inc.status === 'Awaiting Verification'
  );

  const filteredHistory = history.filter(inc => {
    const matchesSearch = inc.id.toLowerCase().includes(filter.toLowerCase()) ||
                          inc.category.toLowerCase().includes(filter.toLowerCase());
    const matchesOutcome = outcomeFilter === 'all' || inc.status === outcomeFilter;
    return matchesSearch && matchesOutcome;
  });

  const getEventIcon = (action: string) => {
    if (action.includes('Evidence')) return <Camera className="w-3 h-3" />;
    if (action.includes('Verification')) return <FileText className="w-3 h-3" />;
    if (action.includes('Status')) return <Clock className="w-3 h-3" />;
    if (action.includes('Rejected') || action.includes('Rework')) return <AlertTriangle className="w-3 h-3 text-red-500" />;
    return <CheckCircle className="w-3 h-3" />;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Operational History</h1>
          <p className="text-slate-500 text-lg">Audit log of all completed, rejected, and verified municipal assignments</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="Search history..."
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer font-medium text-slate-600"
            value={outcomeFilter}
            onChange={e => setOutcomeFilter(e.target.value)}
          >
            <option value="all">All Outcomes</option>
            <option value="Resolved">Resolved</option>
            <option value="Rejected">Rejected</option>
            <option value="Verified">Verified</option>
            <option value="Awaiting Verification">Awaiting Verification</option>
          </select>
        </div>
      </div>

      {filteredHistory.length > 0 ? (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {filteredHistory.map(task => {
                const timeline = taskTimelines[task.id] || [];
                return (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/staff/task/${task.id}`)}
                    className="px-8 py-6 flex flex-col lg:flex-row lg:items-center justify-between group cursor-pointer hover:bg-slate-50 transition-all"
                  >
                    <div className="flex items-center space-x-6">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black ${
                        task.status === 'Resolved' || task.status === 'Verified' ? 'bg-green-500' :
                        task.status === 'Rejected' ? 'bg-red-500' : 'bg-yellow-500'
                      }`}>
                        {task.status === 'Resolved' || task.status === 'Verified' ? '✓' : '⚠'}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-3">
                          <span className="text-xs font-black text-blue-600 uppercase tracking-widest">{task.id}</span>
                          <span className="text-lg font-bold text-slate-900">{task.category}</span>
                        </div>
                        <p className="text-sm text-slate-500">{task.location}</p>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-8 mt-4 md:mt-0">
                      <div className="flex flex-wrap gap-2 max-w-xs">
                        {timeline.slice(-3).map((event, idx) => (
                          <div key={idx} className="flex items-center space-x-1 px-2 py-1 bg-slate-100 rounded-md text-[10px] text-slate-600 font-medium">
                            {getEventIcon(event.action)}
                            <span className="truncate max-w-[100px]">{event.action}</span>
                          </div>
                        ))}
                        {timeline.length > 3 && <span className="text-[10px] text-slate-400 italic">+{timeline.length - 3} more</span>}
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Status</p>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          task.status === 'Resolved' || task.status === 'Verified' ? 'bg-green-100 text-green-700 border border-green-200' :
                          task.status === 'Rejected' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                      <span className="text-slate-300 group-hover:text-blue-600 transition-colors">&rarr;</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="py-24 text-center bg-white rounded-3xl border border-dashed border-slate-300">
          <div className="text-5xl mb-4 opacity-20">📜</div>
          <h3 className="text-xl font-bold text-slate-800">No Historical Records</h3>
          <p className="text-slate-500">Your operational history is empty.</p>
        </div>
      )}
    </div>
  );
};

export default TaskHistory;
