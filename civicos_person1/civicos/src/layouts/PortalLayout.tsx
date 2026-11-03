import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import ErrorBoundary from '../components/ErrorBoundary';

const PortalLayout: React.FC = () => {
  const location = useLocation();
  const isStaff = location.pathname.startsWith('/staff');

  return (
    <div className={`flex min-h-screen ${isStaff ? 'bg-[#0B1120] text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="p-6 overflow-y-auto flex-1">
          <ErrorBoundary fallbackTitle="Module View Recovered">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default PortalLayout;
