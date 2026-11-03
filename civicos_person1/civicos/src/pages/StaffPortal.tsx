import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StaffDashboard from './staff/dashboard';
import AssignedTasks from './staff/assigned-tasks';
import TaskHistory from './staff/history';
import Profile from './staff/profile';

const StaffPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col sticky top-0">
        <div className="p-6 text-2xl font-bold border-b border-slate-800">
          CivicOS Staff
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '🏠', path: '/staff' },
            { id: 'tasks', label: 'Assigned Tasks', icon: '📋', path: '/staff/tasks' },
            { id: 'history', label: 'Task History', icon: '📜', path: '/staff/history' },
            { id: 'profile', label: 'Profile', icon: '👤', path: '/staff/profile' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                navigate(item.path);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors text-sm ${
                activeTab === item.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={() => navigate('/')}
            className="w-full py-2 px-4 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-all flex items-center justify-center space-x-2"
          >
            <span>🔄</span>
            <span>Switch Portal</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        {activeTab === 'dashboard' && <StaffDashboard />}
        {activeTab === 'tasks' && <AssignedTasks />}
        {activeTab === 'history' && <TaskHistory />}
        {activeTab === 'profile' && <Profile />}
      </main>
    </div>
  );
};

export default StaffPortal;
