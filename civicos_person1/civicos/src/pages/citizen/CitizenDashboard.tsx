import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCitizenStore } from '../../store/citizenStore';

const CitizenDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { profile, complaints, notifications } = useCitizenStore();

  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'Pending').length,
    inProgress: complaints.filter(c => c.status === 'In Progress').length,
    resolved: complaints.filter(c => c.status === 'Resolved').length,
  };

  const recentComplaints = [...complaints].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  const recentUpdates = notifications.slice(0, 3);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {profile.fullName}!</h1>
          <p className="text-gray-600 max-w-2xl">
            Your CivicOS dashboard helps you report new issues and track the progress of your existing civic complaints in real-time.
          </p>
        </div>
        <button
          onClick={() => navigate('/citizen/report')}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-sm hover:shadow-md flex items-center justify-center space-x-2"
        >
          <span>➕</span>
          <span>Report a Problem</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Complaints', value: stats.total, icon: '📋', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Pending', value: stats.pending, icon: '⏳', color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'In Progress', value: stats.inProgress, icon: '⚙️', color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Resolved', value: stats.resolved, icon: '✅', color: 'text-green-600', bg: 'bg-green-50' },
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} p-4 rounded-xl border border-slate-100 shadow-sm flex items-center space-x-4`}>
            <div className="text-2xl">{stat.icon}</div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">Recent Complaints</h3>
            <button
              onClick={() => navigate('/citizen/my-complaints')}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              View All Complaints &rarr;
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-slate-500">
                  <th className="px-6 py-3 text-xs font-semibold uppercase">Complaint</th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase">Location</th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentComplaints.map((complaint) => (
                  <tr key={complaint.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate(`/citizen/complaint/${complaint.id}`)}>
                    <td className="px-6 py-3">
                      <p className="text-sm font-bold text-slate-900">{complaint.id}</p>
                      <p className="text-xs text-slate-500 truncate max-w-[200px]">{complaint.description}</p>
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">{complaint.location}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        complaint.status === 'Resolved' ? 'bg-green-100 text-green-700' :
                        complaint.status === 'In Progress' ? 'bg-indigo-100 text-indigo-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {complaint.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-500">{complaint.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Recent Updates</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-4">
              {recentUpdates.map((update) => {
                const isResolved = update.message.toLowerCase().includes('resolved');
                const isVerified = update.message.toLowerCase().includes('verified');
                return (
                  <div key={update.id} className="flex space-x-3 pb-3 last:pb-0 border-b border-slate-100 last:border-0">
                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                      isResolved ? 'bg-green-500' :
                      isVerified ? 'bg-blue-500' : 'bg-slate-400'
                    }`} />
                    <div>
                      <p className="text-sm text-slate-700">{update.message}</p>
                      <p className="text-xs text-slate-400 mt-1">{update.date}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-3">
              {[
                { label: 'Report a Problem', path: '/citizen/report', icon: '✍️' },
                { label: 'My Complaints', path: '/citizen/my-complaints', icon: '📁' },
                { label: 'Nearby Civic Problems', path: '/citizen/nearby', icon: '📍' },
              ].map((action, i) => (
                <button
                  key={i}
                  onClick={() => navigate(action.path)}
                  className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{action.icon}</span>
                    <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">{action.label}</span>
                  </div>
                  <span className="text-slate-400 group-hover:text-blue-500">&rarr;</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitizenDashboard;
