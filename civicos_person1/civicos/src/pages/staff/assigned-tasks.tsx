import React, { useState, useMemo } from 'react';
import { useMccStore, TaskStatus } from '../../store/mccStore';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutGrid,
  List,
  Table as TableIcon,
  ArrowRight,
  Clock,
  MapPin,
  Tag,
} from 'lucide-react';

type ViewMode = 'table' | 'card' | 'compact';

const AssignedTasks: React.FC = () => {
  const { incidents } = useMccStore();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<string | 'all'>('all');
  const [categoryFilter] = useState<string | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [sortBy, setSortBy] = useState<'priority' | 'deadline' | 'date' | 'progress'>('priority');

  const filteredTasks = useMemo(() => {
    return incidents
      .filter(inc => {
        const matchesSearch =
          inc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inc.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inc.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (inc.description && inc.description.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesStatus = statusFilter === 'all' || inc.status === statusFilter;
        const matchesSeverity = severityFilter === 'all' || inc.severity === severityFilter;
        const matchesCategory = categoryFilter === 'all' || inc.category === categoryFilter;

        return matchesSearch && matchesStatus && matchesSeverity && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'priority') {
          const severityMap: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
          return (severityMap[a.severity] || 99) - (severityMap[b.severity] || 99);
        }
        if (sortBy === 'deadline') {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        }
        if (sortBy === 'date') {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        }
        return 0;
      });
  }, [incidents, searchQuery, statusFilter, severityFilter, categoryFilter, sortBy]);

  const getValidActions = (status: string) => {
    const actions = [];
    if (status === 'Dispatching') {
      actions.push({ label: 'Accept', path: 'accept', color: 'text-green-400' });
      actions.push({ label: 'Reject', path: 'reject', color: 'text-red-400' });
    } else if (status === 'Accepted' || status === 'Travelling' || status === 'Arrived' || status === 'In Progress' || status === 'Blocked') {
      actions.push({ label: 'Update Progress', path: 'progress', color: 'text-blue-400' });
      actions.push({ label: 'Upload Evidence', path: 'upload', color: 'text-cyan-400' });
    } else if (status === 'Completed') {
      actions.push({ label: 'Verify Work', path: 'verification', color: 'text-amber-400' });
    }
    actions.push({ label: 'Details', path: 'task-details', color: 'text-slate-400' });
    return actions;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500 staff-portal">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-white tracking-tighter">Task Workspace</h1>
          <p className="text-slate-400 text-lg">Advanced municipal assignment registry</p>
        </div>

        <div className="flex flex-wrap gap-3 bg-slate-900/50 p-3 rounded-2xl border border-slate-800 shadow-sm backdrop-blur-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Search ID, category, location..."
              className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all w-full sm:w-64"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <select
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-300 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
            >
              <option value="all">All Statuses</option>
              <option value="Dispatching">Dispatching</option>
              <option value="Accepted">Accepted</option>
              <option value="In Progress">In Progress</option>
              <option value="Blocked">Blocked</option>
              <option value="Awaiting Verification">Awaiting Verification</option>
              <option value="Verified">Verified</option>
            </select>

            <select
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-300 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
            >
              <option value="all">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <select
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-300 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
            >
              <option value="priority">Sort: Priority</option>
              <option value="deadline">Sort: Deadline</option>
              <option value="date">Sort: Latest</option>
            </select>
          </div>

          <div className="flex bg-slate-800 rounded-xl p-1 border border-slate-700">
            {(['card', 'table', 'compact'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === mode ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode === 'card' ? <LayoutGrid className="w-3 h-3" /> : mode === 'table' ? <TableIcon className="w-3 h-3" /> : <List className="w-3 h-3" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {viewMode === 'card' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map(task => (
            <div
              key={task.id}
              className="group p-6 bg-slate-900/50 rounded-3xl border border-slate-800 shadow-sm hover:border-blue-500 transition-all backdrop-blur-sm relative overflow-hidden"
            >
              <div className={`absolute top-0 left-0 w-1.5 h-full ${
                task.severity === 'Critical' ? 'bg-red-500' :
                task.severity === 'High' ? 'bg-orange-500' : 'bg-yellow-500'
              }`} />

              <div className="flex justify-between items-start mb-6">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{task.id}</span>
                  <h3 className="text-xl font-bold text-slate-100 tracking-tight">{task.category}</h3>
                </div>
                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                  task.severity === 'Critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                  task.severity === 'High' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                }`}>
                  {task.severity}
                </span>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center space-x-2 text-sm text-slate-400">
                  <MapPin className="w-3 h-3 text-slate-600" />
                  <span className="truncate font-medium">{task.location}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-slate-400">
                  <Clock className="w-3 h-3 text-slate-600" />
                  <span>{task.date.split('T')[0]}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-slate-400">
                  <Tag className="w-3 h-3 text-slate-600" />
                  <span>{task.assignedDept}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-5 border-t border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${
                    task.status === 'Verified' ? 'bg-green-500' :
                    task.status === 'Awaiting Verification' ? 'bg-amber-500' : 'bg-slate-600'
                  }`} />
                  <span className="text-xs font-bold text-slate-500">{task.status}</span>
                </div>
                <div className="flex gap-2">
                  {getValidActions(task.status).map(action => (
                    <button
                      key={action.path}
                      onClick={() => navigate(`/staff/task/${task.id}/${action.path}`)}
                      className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border transition-all hover:bg-slate-800 ${action.color} border-current opacity-70 hover:opacity-100`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'table' && (
        <div className="bg-slate-900/50 rounded-3xl border border-slate-800 overflow-hidden backdrop-blur-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <tr className="border-b border-slate-800">
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredTasks.map(task => (
                <tr key={task.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4 text-sm font-bold text-blue-400">{task.id}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-200">{task.category}</td>
                  <td className="px-6 py-4 text-sm text-slate-400 truncate max-w-xs">{task.location}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                      task.severity === 'Critical' ? 'bg-red-500/10 text-red-400' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {task.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        task.status === 'Verified' ? 'bg-green-500' : 'bg-slate-600'
                      }`} />
                      <span className="text-xs text-slate-400">{task.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {getValidActions(task.status).map(action => (
                        <button
                          key={action.path}
                          onClick={() => navigate(`/staff/task/${task.id}/${action.path}`)}
                          className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border transition-all hover:bg-slate-800 ${action.color} border-current opacity-70 hover:opacity-100`}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'compact' && (
        <div className="space-y-3">
          {filteredTasks.map(task => (
            <div
              key={task.id}
              onClick={() => navigate(`/staff/task/${task.id}`)}
              className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800 flex items-center justify-between cursor-pointer hover:border-blue-500 transition-all"
            >
              <div className="flex items-center space-x-4">
                <span className="text-xs font-black text-blue-400">{task.id}</span>
                <span className="text-sm font-bold text-slate-200">{task.category}</span>
                <span className="text-xs text-slate-500 truncate max-w-[150px]">{task.location}</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-xs font-bold text-slate-500">{task.status}</span>
                <ArrowRight className="w-4 h-4 text-slate-600" />
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredTasks.length === 0 && (
        <div className="col-span-full py-24 text-center bg-slate-900/40 rounded-3xl border border-dashed border-slate-800">
          <div className="text-5xl mb-4 opacity-20">📋</div>
          <h3 className="text-xl font-bold text-slate-300">No Matching Assignments</h3>
          <p className="text-slate-500">Screaming into the void? Try adjusting your filters or search terms.</p>
        </div>
      )}
    </div>
  );
};

export default AssignedTasks;
