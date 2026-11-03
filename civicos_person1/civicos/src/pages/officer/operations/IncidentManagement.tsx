import React, { useEffect, useState } from 'react';
import { useMccStore } from '../../../store/mccStore';
import { StatusBadge, SeverityBadge } from '../../../components/MCCComponents';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';

const IncidentManagement: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { incidents, departments, fetchIncidents, isLoading } = useMccStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [queueTab, setQueueTab] = useState<'all' | 'needs_review' | 'duplicates' | 'verification'>('all');

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  useEffect(() => {
    const statusParam = searchParams.get('status');
    const categoryParam = searchParams.get('category');
    const deptParam = searchParams.get('department') || searchParams.get('dept');
    const searchParam = searchParams.get('search') || searchParams.get('q');

    if (statusParam) setSelectedStatus(statusParam);
    if (categoryParam) setSelectedCategory(categoryParam);
    if (deptParam) setSelectedDept(deptParam);
    if (searchParam) setSearchQuery(searchParam);
  }, [searchParams]);

  const filteredIncidents = incidents.filter(inc => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      inc.id.toLowerCase().includes(q) ||
      inc.category.toLowerCase().includes(q) ||
      inc.location.toLowerCase().includes(q) ||
      inc.description.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (selectedStatus !== 'ALL' && inc.status.toLowerCase() !== selectedStatus.toLowerCase()) {
      return false;
    }
    if (selectedCategory !== 'ALL' && !inc.category.toLowerCase().includes(selectedCategory.toLowerCase())) {
      return false;
    }
    if (selectedDept !== 'ALL' && inc.assignedDept !== selectedDept && inc.departmentId !== selectedDept) {
      return false;
    }

    if (queueTab === 'needs_review') {
      return inc.aiVerificationStatus === 'needs_review' || inc.aiVerificationStatus === 'mismatch';
    }
    if (queueTab === 'duplicates') {
      return Boolean(inc.isDuplicate);
    }
    if (queueTab === 'verification') {
      return inc.status === 'Awaiting Verification' || Boolean(inc.resolutionVerification) || inc.category.toLowerCase().includes('pothole');
    }
    return true;
  });

  const needsReviewCount = incidents.filter(i => i.aiVerificationStatus === 'needs_review' || i.aiVerificationStatus === 'mismatch').length;
  const duplicateCount = incidents.filter(i => Boolean(i.isDuplicate)).length;
  const verificationCount = incidents.filter(i => i.status === 'Awaiting Verification' || Boolean(i.resolutionVerification) || i.category.toLowerCase().includes('pothole')).length;

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Incident Management</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Active civic incidents retrieved live from PostgreSQL ({incidents.length} total)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => fetchIncidents()}
            disabled={isLoading}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => navigate('/officer/validation')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition shadow-sm flex items-center space-x-2"
          >
            <span>🤖</span>
            <span>AI Review Queue ({needsReviewCount})</span>
          </button>
        </div>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
          <input
            type="text"
            placeholder="Search by ID, category, or location..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="Pothole">Pothole / Road</option>
            <option value="Waste">Waste / Garbage</option>
            <option value="Water">Water / Drainage</option>
            <option value="Street">Streetlight / Electrical</option>
          </select>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 outline-none"
          >
            <option value="ALL">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>

          {(searchQuery || selectedStatus !== 'ALL' || selectedCategory !== 'ALL' || selectedDept !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedStatus('ALL');
                setSelectedCategory('ALL');
                setSelectedDept('ALL');
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-bold underline px-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* MUNICIPAL REVIEW QUEUE TABS */}
      <div className="flex space-x-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setQueueTab('all')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            queueTab === 'all'
              ? 'bg-white border-t border-l border-r border-slate-200 text-blue-600 font-bold -mb-px'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          All Incidents ({incidents.length})
        </button>
        <button
          onClick={() => setQueueTab('needs_review')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center space-x-1.5 ${
            queueTab === 'needs_review'
              ? 'bg-amber-50 border-t border-l border-r border-amber-200 text-amber-800 font-bold -mb-px'
              : 'text-slate-500 hover:text-amber-700'
          }`}
        >
          <span>⚠️</span>
          <span>Needs AI Review ({needsReviewCount})</span>
        </button>
        <button
          onClick={() => setQueueTab('duplicates')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center space-x-1.5 ${
            queueTab === 'duplicates'
              ? 'bg-purple-50 border-t border-l border-r border-purple-200 text-purple-800 font-bold -mb-px'
              : 'text-slate-500 hover:text-purple-700'
          }`}
        >
          <span>🧩</span>
          <span>Duplicate Candidates ({duplicateCount})</span>
        </button>
        <button
          onClick={() => setQueueTab('verification')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center space-x-1.5 ${
            queueTab === 'verification'
              ? 'bg-emerald-50 border-t border-l border-r border-emerald-200 text-emerald-800 font-bold -mb-px'
              : 'text-slate-500 hover:text-emerald-700'
          }`}
        >
          <span>✅</span>
          <span>Verification Queue ({verificationCount})</span>
        </button>
      </div>

      {/* INCIDENTS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse table-auto">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-slate-500">
              <th className="px-6 py-3.5 text-xs font-bold uppercase w-28">ID</th>
              <th className="px-6 py-3.5 text-xs font-bold uppercase">Category</th>
              <th className="px-6 py-3.5 text-xs font-bold uppercase">Location</th>
              <th className="px-6 py-3.5 text-xs font-bold uppercase w-28">Severity</th>
              <th className="px-6 py-3.5 text-xs font-bold uppercase w-32">Status</th>
              <th className="px-6 py-3.5 text-xs font-bold uppercase w-48">Department</th>
              <th className="px-6 py-3.5 text-xs font-bold uppercase w-40 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredIncidents.map(inc => (
              <tr key={inc.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-4 text-sm font-bold text-slate-900 whitespace-nowrap">{inc.id}</td>
                <td className="px-6 py-4 text-sm font-medium text-slate-700">{inc.category}</td>
                <td className="px-6 py-4 text-sm text-slate-600 truncate max-w-xs">{inc.location}</td>
                <td className="px-6 py-4"><SeverityBadge severity={inc.severity} /></td>
                <td className="px-6 py-4"><StatusBadge status={inc.status} /></td>
                <td className="px-6 py-4 text-sm font-semibold text-slate-600 whitespace-nowrap">{inc.assignedDept}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => navigate(`/officer/details/${inc.id}`)}
                      className="px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition"
                      title="Inspect full ticket details & officer console"
                    >
                      Details
                    </button>
                    <button
                      onClick={() => navigate(`/officer/assignment/${inc.id}`)}
                      className="px-2.5 py-1 text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition"
                      title="Assign or reassign department"
                    >
                      Assign
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredIncidents.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">
                  No incidents matching the current search and filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IncidentManagement;
