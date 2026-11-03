import React, { useState } from 'react';
import { useMccStore } from '../../../store/mccStore';

const OfficerSettings: React.FC = () => {
  const { settings, updateSettings } = useMccStore();
  const [activeTab, setActiveTab] = useState('general');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const handleSave = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }, 800);
  };

  const updateSetting = (key: string, value: any) => {
    updateSettings({ [key]: value });
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">System Settings</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              updateSettings({
                autoExpand: true,
                aiPriority: true,
                highContrast: false
              });
              setSaveStatus('saved');
              setTimeout(() => setSaveStatus('idle'), 3000);
            }}
            className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            RESET DEFAULTS
          </button>
          <button
            onClick={handleSave}
            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${saveStatus === 'saved' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            {saveStatus === 'saving' ? 'SAVING...' : saveStatus === 'saved' ? 'SAVED ✓' : 'SAVE CHANGES'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-2">
          {[
            { id: 'general', label: 'General Preferences', icon: '⚙️' },
            { id: 'notifications', label: 'Notification Settings', icon: '🔔' },
            { id: 'categories', label: 'Incident Categories', icon: '🏷️' },
            { id: 'visualization', label: 'Map & Visualization', icon: '🗺️' },
            { id: 'system', label: 'System Information', icon: 'ℹ️' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all font-medium text-sm flex items-center space-x-3 ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="lg:col-span-3 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm min-h-[500px] animate-in fade-in slide-in-from-right-4">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4">General Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="space-y-1">
                    <p className="font-medium text-slate-700">Auto-expand incident groups</p>
                    <p className="text-xs text-slate-500">Automatically expand the navigation hub for active pages.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoExpand}
                    onChange={e => updateSetting('autoExpand', e.target.checked)}
                    className="w-5 h-5 rounded text-blue-600"
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="space-y-1">
                    <p className="font-medium text-slate-700">Enable AI Priority Suggestions</p>
                    <p className="text-xs text-slate-500">Show suggested severity and priority based on evidence.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.aiPriority}
                    onChange={e => updateSetting('aiPriority', e.target.checked)}
                    className="w-5 h-5 rounded text-blue-600"
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="space-y-1">
                    <p className="font-medium text-slate-700">High Contrast Mode</p>
                    <p className="text-xs text-slate-500">Increase contrast for better visibility in high-glare environments.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.highContrast}
                    onChange={e => updateSetting('highContrast', e.target.checked)}
                    className="w-5 h-5 rounded text-blue-600"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Notification Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: 'email', label: 'Email Notifications', desc: 'Receive critical incident alerts via email.' },
                  { id: 'sms', label: 'SMS Alerts', desc: 'Urgent text notifications for dispatch.' },
                  { id: 'push', label: 'Desktop Push', desc: 'Real-time browser notifications.' },
                  { id: 'daily', label: 'Daily Summary', desc: 'Morning report of resolution trends.' },
                ].map(n => (
                  <div key={n.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium text-slate-700">{n.label}</p>
                      <p className="text-xs text-slate-500">{n.desc}</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5 rounded text-blue-600" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Incident Categories</h3>
              <div className="space-y-3">
                {['Water Supply', 'Roads and Potholes', 'Electric Grid', 'Waste Management', 'Public Safety'].map(cat => (
                  <div key={cat} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-sm font-medium text-slate-700">{cat}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Active</span>
                      <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-blue-600" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'visualization' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Map & Visualization Settings</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Map Base Layer</label>
                  <select className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                    <option>Standard Vector</option>
                    <option>Satellite Hybrid</option>
                    <option>Dark Mode Topology</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Marker Style</label>
                  <select className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                    <option>Simple Dots</option>
                    <option>Categorical Icons</option>
                    <option>Severity Halos</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4">System Information</h3>
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-4">
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-sm text-slate-500">System Version</span>
                  <span className="text-sm font-bold text-slate-900">v2.4.1-stable</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-sm text-slate-500">Build Date</span>
                  <span className="text-sm font-bold text-slate-900">2026-10-28</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-sm text-slate-500">API Status</span>
                  <span className="text-sm font-bold text-green-600">Operational</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-sm text-slate-500">Connected Sensors</span>
                  <span className="text-sm font-bold text-slate-900">1,402 active</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfficerSettings;
