import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCitizenStore } from '../../store/citizenStore';

const CATEGORIES = [
  'Roads and Potholes',
  'Street Lighting',
  'Water Supply',
  'Drainage and Sewage',
  'Garbage and Waste Management',
  'Public Infrastructure',
  'Traffic and Road Safety',
  'Other',
];

const MyComplaints: React.FC = () => {
  const navigate = useNavigate();
  const { complaints } = useCitizenStore();

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');

  // Filtered Results
  const filteredComplaints = useMemo(() => {
    return complaints.filter(c => {
      const matchesSearch =
        c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.location.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
      const matchesCategory = categoryFilter === 'All Categories' || c.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [complaints, searchQuery, statusFilter, categoryFilter]);

  // Summary Statistics derived from full dataset
  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'Pending').length,
    inProgress: complaints.filter(c => c.status === 'In Progress').length,
    resolved: complaints.filter(c => c.status === 'Resolved').length,
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setCategoryFilter('All Categories');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">My Complaints</h1>
        <button
          onClick={() => navigate('/citizen/report')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
        >
          + Report New Problem
        </button>
      </div>

      {/* 2. Complaint Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Complaints', value: stats.total, icon: '📋', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Pending', value: stats.pending, icon: '⏳', color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'In Progress', value: stats.inProgress, icon: '⚙️', color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Resolved', value: stats.resolved, icon: '✅', color: 'text-green-600', bg: 'bg-green-50' },
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4`}>
            <div className="text-3xl">{stat.icon}</div>
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 3 & 4. Search and Filters */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Search Complaints</label>
            <input
              type="text"
              placeholder="ID, category, location..."
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Status Filter</label>
            <select
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Category Filter</label>
            <select
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="All Categories">All Categories</option>
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={clearFilters}
            className="text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      </div>

      {/* 5. Complaint List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredComplaints.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-gray-600 text-xs uppercase font-semibold">
                  <th className="px-6 py-4">Complaint ID</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredComplaints.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{c.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{c.category}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">{c.description}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{c.location}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{c.date}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        c.status === 'Resolved' ? 'bg-green-100 text-green-700' :
                        c.status === 'In Progress' ? 'bg-indigo-100 text-indigo-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/citizen/complaint/${c.id}`)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-20 text-center space-y-4">
            <div className="text-5xl">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900">No complaints found</h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              {(searchQuery || statusFilter !== 'All' || categoryFilter !== 'All Categories')
                ? "No complaints match your current search or filter criteria."
                : "You haven't submitted any complaints yet."}
            </p>
            {(searchQuery || statusFilter !== 'All' || categoryFilter !== 'All Categories') ? (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Clear Filters
              </button>
            ) : (
              <button
                onClick={() => navigate('/citizen/report')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Report a Problem
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyComplaints;
