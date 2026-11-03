import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMccStore } from '../../store/mccStore';

interface IncidentSelectionProps {
  destinationPath: string;
  title: string;
}

const IncidentSelection: React.FC<IncidentSelectionProps> = ({ destinationPath, title }) => {
  const { incidents } = useMccStore();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');

  const filteredIncidents = incidents.filter(inc => {
    const matchesSearch = inc.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inc.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inc.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'All' || inc.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  const handleSelect = (id: string) => {
    const finalPath = destinationPath.replace(':id', id);
    navigate(finalPath);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">{title}</h1>
          <p className="text-slate-500 text-lg">Select an active municipal incident to initiate the workflow.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="Search ID, category, location..."
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64 shadow-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
          >
            <option value="All">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {filteredIncidents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIncidents.map((inc) => (
            <div
              key={inc.id}
              onClick={() => handleSelect(inc.id)}
              className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-blue-500 hover:shadow-xl transition-all cursor-pointer relative overflow-hidden"
            >
              <div className={`absolute top-0 left-0 w-1 h-full ${
                inc.severity === 'Critical' ? 'bg-red-500' :
                inc.severity === 'High' ? 'bg-orange-500' : 'bg-yellow-500'
              }`} />

              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                  <span className="text-xs font-black text-blue-600 uppercase tracking-widest">{inc.id}</span>
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{inc.category}</h3>
                </div>
                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                  inc.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                  inc.severity === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {inc.severity}
                </span>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <span className="text-slate-400">📍</span>
                  <span className="truncate font-medium">{inc.location}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <span className="text-slate-400">🕒</span>
                  <span className="truncate">{inc.date.split('T')[0]}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                  <span className="text-xs text-slate-500 font-medium">{inc.status}</span>
                </div>
                <span className="text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">Select Task →</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center bg-white rounded-3xl border border-dashed border-slate-300 shadow-inner">
          <div className="text-6xl mb-6 opacity-20">📋</div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">No Matching Incidents</h3>
          <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
            We couldn't find any active incidents matching your current filters.
            Try adjusting your search or severity settings.
          </p>
        </div>
      )}
    </div>
  );
};

export default IncidentSelection;
