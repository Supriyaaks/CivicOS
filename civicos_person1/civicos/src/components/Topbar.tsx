import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Topbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getPortalName = () => {
    if (location.pathname.startsWith('/citizen')) return 'Citizen Portal';
    if (location.pathname.startsWith('/officer')) return 'Municipal Command Center';
    if (location.pathname.startsWith('/staff')) return 'Field Operations Portal';
    return 'CivicOS';
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <h2 className="text-lg font-semibold text-slate-800">
        {getPortalName()}
      </h2>
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/')}
          className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors px-3 py-1 rounded-md hover:bg-slate-100 border border-transparent hover:border-slate-200"
        >
          Switch Portal
        </button>
        <div className="w-7 h-7 bg-slate-200 rounded-full border border-slate-300"></div>
      </div>
    </header>
  );
};

export default Topbar;

