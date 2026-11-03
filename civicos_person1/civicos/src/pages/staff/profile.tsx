import React, { useState } from 'react';
import { useMccStore } from '../../store/mccStore';
import { User, Settings, TrendingUp, ShieldCheck } from 'lucide-react';

const Profile: React.FC = () => {
  const { users, incidents, updateUser } = useMccStore();
  // Demo: Assume we are logged in as Bob Johnson (U-03)
  const [currentUser, setCurrentUser] = useState(users.find(u => u.id === 'U-03') || users[0]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ ...currentUser });
  const [preferences, setPreferences] = useState({
    dashboardLayout: 'compact',
    notifications: true,
    theme: 'dark-navy'
  });

  const handleSave = () => {
    updateUser(currentUser.id, {
      name: editForm.name,
      contact: editForm.contact,
    });
    setCurrentUser({ ...editForm });
    setIsEditing(false);
    alert('Profile updated successfully in municipal registry.');
  };

  // Calculate performance metrics from shared state
  const calculateMetrics = () => {
    const userTasks = incidents.filter(inc => inc.assignedDept === currentUser.dept); // Simplified for demo
    return {
      totalAssigned: userTasks.length,
      completed: userTasks.filter(inc => inc.status === 'Verified' || inc.status === 'Resolved').length,
      pending: userTasks.filter(inc => inc.status !== 'Verified' && inc.status !== 'Resolved' && inc.status !== 'Rejected').length,
      rejected: userTasks.filter(inc => inc.status === 'Rejected').length,
      reworks: 0 // This would require tracking submission attempts per user in store
    };
  };

  const metrics = calculateMetrics();

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500">
      {/* Premium Profile Header */}
      <div className="relative bg-slate-900 rounded-3xl overflow-hidden shadow-2xl p-8 text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full -mr-48 -mt-48 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-5xl font-black text-white shadow-xl border-4 border-slate-800">
            {currentUser.name.charAt(0)}
          </div>
          <div className="text-center md:text-left space-y-2">
            <div className="flex items-center justify-center md:justify-start space-x-3">
              <h1 className="text-4xl font-black tracking-tight">{currentUser.name}</h1>
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-bold border border-blue-500/30">
                Active Duty
              </span>
            </div>
            <p className="text-slate-400 text-lg font-medium">{currentUser.role} • {currentUser.dept}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-400">
                <span className="text-blue-400">🆔</span> <span>ID: {currentUser.id}</span>
              </div>
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-400">
                <span className="text-blue-400">📞</span> <span>{currentUser.contact}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center space-x-2">
                <User className="w-4 h-4 text-blue-600" /> <span>Identity & Credentials</span>
              </h3>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  isEditing ? 'bg-slate-900 text-white' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
                }`}
              >
                {isEditing ? 'Cancel Changes' : 'Edit Profile'}
              </button>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Full Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      value={editForm.name}
                      onChange={e => setEditForm({...editForm, name: e.target.value})}
                    />
                  ) : (
                    <p className="text-lg font-bold text-slate-900">{currentUser.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Contact Email</label>
                  {isEditing ? (
                    <input
                      type="text"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      value={editForm.contact}
                      onChange={e => setEditForm({...editForm, contact: e.target.value})}
                    />
                  ) : (
                    <p className="text-lg font-medium text-slate-700">{currentUser.contact}</p>
                  )}
                </div>
              </div>
              <div className="space-y-6">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">Department</span>
                    <span className="text-xs font-black text-slate-900">{currentUser.dept}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">Role/Designation</span>
                    <span className="text-xs font-black text-slate-900">{currentUser.role}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">Account Status</span>
                    <span className="text-xs font-black text-green-600 uppercase">Active</span>
                  </div>
                </div>
                {isEditing && (
                  <button
                    onClick={handleSave}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                  >
                    Save Changes to Registry
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center space-x-2">
              <Settings className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-800">Operational Preferences</h3>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Dashboard Layout</label>
                <div className="flex gap-2">
                  {['compact', 'detailed'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => setPreferences({...preferences, dashboardLayout: mode})}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                        preferences.dashboardLayout === mode ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Notifications</label>
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={preferences.notifications}
                      onChange={e => setPreferences({...preferences, notifications: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-200 rounded-full peer-checked:bg-blue-600 transition-colors"></div>
                    <div className="absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-all peer-checked:translate-x-5"></div>
                  </div>
                  <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">Enable Real-time Alerts</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Side Panel */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-xl space-y-6">
            <h3 className="font-bold text-slate-100 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-blue-400" /> <span>Performance Metrics</span>
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Total Assignments</p>
                <p className="text-2xl font-black text-white">{metrics.totalAssigned}</p>
              </div>
              <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Completed &amp; Verified</p>
                <p className="text-2xl font-black text-green-400">{metrics.completed}</p>
              </div>
              <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Pending / Active</p>
                <p className="text-2xl font-black text-blue-400">{metrics.pending}</p>
              </div>
              <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Rejected Assignments</p>
                <p className="text-2xl font-black text-red-400">{metrics.rejected}</p>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-800">
              <div className="flex items-center justify-center space-x-2 text-slate-500 italic text-[10px]">
                <ShieldCheck className="w-3 h-3" /> <span>Verified by Municipal Registry</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
