import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useMccStore } from '../store/mccStore';

const Sidebar: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { incidents } = useMccStore();
  const selectedTaskId = incidents[0]?.id; // Fallback to first available task

  // State for collapsible groups in Municipal Command Center
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    command: true,
    intelligence: false,
    operations: false,
    management: false,
    learning: false,
  });

  // Automatically expand group based on current path
  useEffect(() => {
    if (pathname.startsWith('/officer')) {
      const groupMap: Record<string, string[]> = {
        command: ['/officer/digital-twin', '/officer/emergency'],
        intelligence: ['/officer/clustering', '/officer/predictive', '/officer/root-cause', '/officer/impact', '/officer/risk', '/officer/weather'],
        operations: ['/officer/incidents', '/officer/details', '/officer/assignment', '/officer/coordination', '/officer/optimization', '/officer/simulation', '/officer/verification', '/officer/road-repair', '/officer/validation'],
        management: ['/officer/dept-mgmt', '/officer/user-mgmt', '/officer/settings'],
        learning: ['/officer/analytics', '/officer/assistant', '/officer/history', '/officer/geospatial'],
      };

      for (const [group, paths] of Object.entries(groupMap)) {
        if (paths.some(path => pathname.startsWith(path))) {
          setExpandedGroups(prev => ({ ...prev, [group]: true }));
        }
      }
    }
  }, [pathname]);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const newState = { ...prev };
      // Collapse all other groups when opening one
      Object.keys(newState).forEach(key => {
        if (key !== group) newState[key] = false;
      });
      newState[group] = !prev[group];
      return newState;
    });
  };

  const citizenLinks = [
    { path: '/citizen', label: 'Dashboard' },
    { path: '/citizen/report', label: 'Report Problem' },
    { path: '/citizen/my-complaints', label: 'My Complaints' },
    { path: '/citizen/nearby', label: 'Nearby Problems' },
    { path: '/citizen/notifications', label: 'Notifications' },
    { path: '/citizen/profile', label: 'Profile' },
  ];

  const officerHubs = [
    {
      id: 'command',
      hub: 'Command Hub',
      links: [
        { path: '/officer', label: 'Command Dashboard', icon: '⚡' },
        { path: '/officer/digital-twin', label: 'Live City Digital Twin', icon: '🗺️' },
        { path: '/officer/emergency', label: 'Emergency Center', icon: '🚨' },
      ],
    },
    {
      id: 'intelligence',
      hub: 'Intelligence Hub',
      links: [
        { path: '/officer/clustering', label: 'Incident Clustering', icon: '🧩' },
        { path: '/officer/predictive', label: 'Predictive Intelligence', icon: '🔮' },
        { path: '/officer/root-cause', label: 'Root-Cause Analysis', icon: '🔍' },
        { path: '/officer/impact', label: 'Impact & Severity', icon: '⚖️' },
        { path: '/officer/risk', label: 'Cascading Risk Prediction', icon: '⚠️' },
        { path: '/officer/weather', label: 'Weather Intelligence', icon: '🌦️' },
      ],
    },
    {
      id: 'operations',
      hub: 'Operations Hub',
      links: [
        { path: '/officer/incidents', label: 'Incident Management', icon: '📋' },
        { path: '/officer/details', label: 'Incident Details & AI', icon: '📄' },
        { path: '/officer/assignment', label: 'Department Assignment', icon: '🎯' },
        { path: '/officer/coordination', label: 'Cross-Dept Coordination', icon: '🤝' },
        { path: '/officer/resources', label: 'Resource Management', icon: '🚛' },
        { path: '/officer/optimization', label: 'Resource Optimization', icon: '📉' },
        { path: '/officer/simulation', label: 'What-If Simulation', icon: '🧪' },
        { path: '/officer/road-repair', label: 'Road Repair Verification', icon: '🛣️' },
        { path: '/officer/verification', label: 'Resolution Verification', icon: '✅' },
        { path: '/officer/validation', label: 'AI Review Queue', icon: '🤖' },
      ],
    },
    {
      id: 'management',
      hub: 'Management Hub',
      links: [
        { path: '/officer/dept-mgmt', label: 'Department Management', icon: '🏢' },
        { path: '/officer/user-mgmt', label: 'User Management', icon: '👥' },
        { path: '/officer/settings', label: 'Settings', icon: '⚙️' },
      ],
    },
    {
      id: 'learning',
      hub: 'Learning Hub',
      links: [
        { path: '/officer/analytics', label: 'Civic Analytics', icon: '📊' },
        { path: '/officer/assistant', label: 'AI Civic Assistant', icon: '🤖' },
        { path: '/officer/history', label: 'Incident History', icon: '📜' },
        { path: '/officer/geospatial', label: 'Geospatial Intelligence', icon: '🌍' },
      ],
    },
  ];

  const staffLinks = [
    { path: '/staff', label: 'Staff Dashboard' },
    { path: '/staff/tasks', label: 'Assigned Tasks' },
    { path: '/staff/task-details', label: 'Task Details', dynamic: true },
    { path: '/staff/accept', label: 'Accept Assignment', dynamic: true },
    { path: '/staff/reject', label: 'Reject Assignment', dynamic: true },
    { path: '/staff/progress', label: 'Update Work Progress', dynamic: true },
    { path: '/staff/upload', label: 'Upload Photographs', dynamic: true },
    { path: '/staff/verification', label: 'Repair Verification', dynamic: true },
    { path: '/staff/history', label: 'Task History' },
    { path: '/staff/profile', label: 'Personal Profile' },
  ];

  const renderLinks = (links: { path: string; label: string; icon?: string; dynamic?: boolean }[]) => {
    return (
      <div className="space-y-0.5">
        {links.map((item) => {
          const finalPath = item.dynamic && selectedTaskId
            ? item.path.replace('/staff/', `/staff/task/${selectedTaskId}/`)
            : item.path;

          return (
            <NavLink
              key={item.path}
              to={finalPath}
              end={item.path === '/citizen' || item.path === '/officer' || item.path === '/staff'}
              className={({ isActive }) =>
                `flex items-start space-x-3 px-4 py-1.5 rounded-md transition-colors text-sm ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              {item.icon && <span className="text-base mt-0.5 shrink-0">{item.icon}</span>}
              {!isCollapsed && <span className="leading-tight">{item.label}</span>}
            </NavLink>
          );
        })}
      </div>
    );
  };

  return (
    <aside className={`${isCollapsed ? 'w-20' : pathname.startsWith('/officer') ? 'w-[310px]' : 'w-64'} bg-slate-900 text-white h-screen flex flex-col sticky top-0 transition-all duration-300 group`}>
      <div className="p-6 text-2xl font-bold border-b border-slate-800 flex items-center justify-between">
        {!isCollapsed && <span className="truncate">CivicOS</span>}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-slate-800 rounded-md transition-colors text-slate-400 hover:text-white"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? '➡️' : '⬅️'}
        </button>
      </div>
      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
        {pathname.startsWith('/citizen') && (
          <div className="space-y-3">
            <p className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 px-4 ${isCollapsed ? 'text-center' : ''}`}>
              {isCollapsed ? '👤' : 'Citizen Portal'}
            </p>
            {renderLinks(citizenLinks)}
          </div>
        )}

        {pathname.startsWith('/officer') && (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 px-4 ${isCollapsed ? 'text-center' : ''}`}>
                {isCollapsed ? '🏢' : 'Municipal Command Center'}
              </p>
              <NavLink
                to="/officer"
                end
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-1.5 rounded-md transition-colors text-sm ${
                    isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <span className="text-base">🏠</span>
                {!isCollapsed && <span className="truncate">Dashboard</span>}
              </NavLink>
            </div>

            {officerHubs.map((hub) => (
              <div key={hub.id} className="space-y-1">
                <button
                  onClick={() => toggleGroup(hub.id)}
                  className="w-full flex items-center justify-between px-4 py-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    {!isCollapsed && <span className="truncate">{hub.hub}</span>}
                    {isCollapsed && <span className="text-lg">📂</span>}
                  </div>
                  {!isCollapsed && (
                    <span className={`text-xs transition-transform duration-200 ${expandedGroups[hub.id] ? 'rotate-180' : ''}`}>
                      🔽
                    </span>
                  )}
                </button>
                {expandedGroups[hub.id] && (
                  <div className="pl-4 space-y-0.5">
                    {renderLinks(hub.links)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {pathname.startsWith('/staff') && (
          <div className="space-y-3">
            <p className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 px-4 ${isCollapsed ? 'text-center' : ''}`}>
              {isCollapsed ? '🛠️' : 'Field Operations'}
            </p>
            {renderLinks(staffLinks)}
          </div>
        )}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={() => navigate('/')}
          className="w-full py-2 px-4 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-all flex items-center justify-center space-x-2"
        >
          <span className="text-lg">🔄</span>
          {!isCollapsed && <span className="truncate">Switch Portal</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
