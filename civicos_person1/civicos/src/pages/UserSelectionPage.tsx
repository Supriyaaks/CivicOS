import React from 'react';
import { useNavigate } from 'react-router-dom';

const UserSelectionPage: React.FC = () => {
  const navigate = useNavigate();

  const portals = [
    {
      id: 'citizen',
      title: 'Citizen',
      description: 'Report civic problems, track your complaints, and stay updated with municipal resolutions.',
      buttonText: 'Enter Citizen Portal',
      path: '/citizen',
      icon: '👤',
      color: 'hover:border-blue-500',
    },
    {
      id: 'officer',
      title: 'Municipal Officer',
      description: 'Monitor city-wide intelligence, manage incident queues, and coordinate municipal operations.',
      buttonText: 'Enter Command Center',
      path: '/officer',
      icon: '🛡️',
      color: 'hover:border-indigo-500',
    },
    {
      id: 'staff',
      title: 'Department Staff',
      description: 'Manage assigned field tasks, update work progress, and upload completion evidence.',
      buttonText: 'Enter Field Operations',
      path: '/staff',
      icon: '🛠️',
      color: 'hover:border-emerald-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">CivicOS</h1>
        <p className="text-lg text-slate-600">Welcome to the Urban Intelligence Platform</p>
        <p className="text-sm text-slate-400 mt-2">Please select your portal to continue</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
        {portals.map((portal) => (
          <div
            key={portal.id}
            className={`bg-white p-8 rounded-2xl shadow-sm border-2 border-transparent ${portal.color} transition-all duration-300 hover:shadow-md flex flex-col items-center text-center`}
          >
            <div className="text-5xl mb-6">{portal.icon}</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">{portal.title}</h2>
            <p className="text-slate-600 mb-8 leading-relaxed">
              {portal.description}
            </p>
            <button
              onClick={() => navigate(portal.path)}
              className="w-full py-3 px-6 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors"
            >
              {portal.buttonText}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserSelectionPage;
