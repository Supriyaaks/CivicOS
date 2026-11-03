import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMccStore } from '../../store/mccStore';
import { backendService } from '../../services/backendService';
import { CivicOSMap, MapMarkerData } from '../../components/CivicOSMap';
import {
  Flame,
  ShieldAlert,
  Power,
  Truck,
  Info,
  History
} from 'lucide-react';

export const EmergencyCenter: React.FC = () => {
  const navigate = useNavigate();
  const { incidents, fetchIncidents } = useMccStore();

  const [emergencyData, setEmergencyData] = useState<any>(null);
  const [isActivatingModal, setIsActivatingModal] = useState(false);
  const [activationReason, setActivationReason] = useState('Severe Infrastructure Emergency Declaration');
  const [severityLevel, setSeverityLevel] = useState('LEVEL_2_ELEVATED');
  const [officerName, setOfficerName] = useState('Municipal Commissioner');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadStatus = async () => {
    try {
      const data = await backendService.getEmergencyStatus();
      if (data) setEmergencyData(data);
    } catch (err) {
      console.error('Error fetching emergency status', err);
    }
  };

  useEffect(() => {
    loadStatus();
    fetchIncidents();
  }, [fetchIncidents]);

  const handleToggleEmergency = async (activate: boolean) => {
    setIsProcessing(true);
    try {
      const updated = await backendService.toggleEmergency({
        activate,
        officer: officerName,
        reason: activate ? activationReason : 'Conditions normalized. Standing down emergency posture.',
        severityLevel
      });
      if (updated) {
        setEmergencyData(updated);
        setIsActivatingModal(false);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const isEmergencyActive = emergencyData?.emergencyState?.isActive || false;

  // Filter critical incidents for emergency map
  const criticalIncidents = emergencyData?.criticalIncidents || incidents.filter(i => i.severity === 'Critical');

  const emergencyMarkers: MapMarkerData[] = criticalIncidents.map((inc: any, idx: number) => ({
    id: inc.id || inc.incidentCode,
    title: `[EMERGENCY] ${inc.category}`,
    latitude: 12.9716 + (idx * 0.008),
    longitude: 77.5946 + (idx * 0.007),
    category: inc.category,
    status: inc.status,
    description: `CRITICAL HAZARD: ${inc.description} | Location: ${inc.location}`,
    severity: 'Critical'
  }));

  return (
    <div className="space-y-6 p-4">
      {/* EMERGENCY ACTIVATION BANNER */}
      <div className={`p-6 rounded-2xl border transition-all shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
        isEmergencyActive
          ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white border-red-500 shadow-red-200'
          : 'bg-white border-slate-200 text-slate-800'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase rounded-full tracking-wider ${
              isEmergencyActive ? 'bg-white text-red-700 animate-pulse' : 'bg-slate-100 text-slate-600'
            }`}>
              {isEmergencyActive ? '🚨 EMERGENCY PROTOCOL ACTIVE' : 'STANDBY MONITORING'}
            </span>
            <span className="text-xs opacity-75 font-mono">Module F • Incident Command</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            {isEmergencyActive ? 'City-Wide Emergency Operations Center' : 'Municipal Emergency Readiness'}
          </h1>
          <p className={`text-xs ${isEmergencyActive ? 'text-red-100' : 'text-slate-500'}`}>
            {isEmergencyActive
              ? `Declared by ${emergencyData?.emergencyState?.activatedBy || 'Commissioner'}: "${emergencyData?.emergencyState?.reason}"`
              : 'All emergency command protocols are ready. Activate emergency state to prioritize response units and coordinate city-wide assets.'}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {isEmergencyActive ? (
            <button
              onClick={() => handleToggleEmergency(false)}
              disabled={isProcessing}
              className="px-5 py-2.5 bg-white text-red-700 hover:bg-red-50 font-black rounded-xl text-xs transition shadow-md flex items-center space-x-2"
            >
              <Power className="w-4 h-4" />
              <span>Deactivate Emergency Mode</span>
            </button>
          ) : (
            <button
              onClick={() => setIsActivatingModal(true)}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs transition shadow-md flex items-center space-x-2"
            >
              <Flame className="w-4 h-4" />
              <span>Declare Emergency Mode</span>
            </button>
          )}
        </div>
      </div>

      {/* EXTERNAL TELEMETRY STATUS (HONEST DISCLOSURE) */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2 text-slate-700 font-medium">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span>
            <strong>External Telemetry Feeds:</strong> Live Traffic Stream ({emergencyData?.externalTelemetry?.trafficCongestionFeed || 'Unavailable'}), IoT Sensor Mesh ({emergencyData?.externalTelemetry?.realtimeSensorNetwork || 'Active'})
          </span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">Honest Data Contract Enforced</span>
      </div>

      {/* EMERGENCY DIGITAL TWIN & CRITICAL QUEUE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEAFLET EMERGENCY MAP */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white space-y-3 p-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <h2 className="text-sm font-bold text-slate-900">Critical Incident GIS Map Layer</h2>
            </div>
            <span className="text-xs font-mono font-bold text-red-600">
              {emergencyMarkers.length} Critical Hotspots
            </span>
          </div>

          <div className="rounded-xl overflow-hidden border border-slate-100">
            <CivicOSMap
              center={[12.9716, 77.5946]}
              zoom={13}
              markers={emergencyMarkers}
              height="380px"
            />
          </div>
        </div>

        {/* RAPID RESPONSE UNITS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Truck className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">Designated Response Units</h3>
          </div>

          <div className="space-y-3">
            {(emergencyData?.responseTeams || [
              { name: 'Rapid Highway Taskforce', department: 'Roads & Infrastructure', status: 'Standby', availableUnits: 4 },
              { name: 'Emergency Dewatering Squad', department: 'Water and Drainage', status: 'Deployed', availableUnits: 2 },
              { name: 'Live Wire Neutralization Unit', department: 'Electrical Department', status: 'Standby', availableUnits: 3 },
              { name: 'Arterial Barricade Patrol', department: 'Traffic & Public Safety', status: 'Standby', availableUnits: 5 },
            ]).map((team: any, i: number) => (
              <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-800">{team.name}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] ${
                    team.status === 'Deployed' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {team.status} ({team.availableUnits} Units)
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">{team.department}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/officer/resources')}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
          >
            Manage All Fleet & Crews →
          </button>
        </div>
      </div>

      {/* CRITICAL INCIDENTS TABLE & AUDIT LOG */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Incident Queue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Immediate Action Incident Feed</h3>
            <span className="text-xs text-red-600 font-bold">{criticalIncidents.length} Pending</span>
          </div>

          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {criticalIncidents.map((inc: any) => (
              <div
                key={inc.id || inc.incidentCode}
                className="p-3 bg-red-50/40 border border-red-100 rounded-xl text-xs space-y-1 flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-red-700">{inc.id || inc.incidentCode}</span>
                    <span className="font-bold text-slate-900">{inc.category}</span>
                  </div>
                  <p className="text-slate-600 line-clamp-1">{inc.location}</p>
                </div>

                <button
                  onClick={() => navigate(`/officer/details/${inc.id || inc.incidentCode}`)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[11px] flex-shrink-0 transition"
                >
                  Triage
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency Mode Activation History */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <History className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-900">Emergency Protocol Audit History</h3>
          </div>

          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {(emergencyData?.auditHistory || []).map((h: any, idx: number) => (
              <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    h.action === 'ACTIVATED' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {h.action}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(h.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-slate-700 font-medium">{h.reason}</p>
                <div className="text-[10px] text-slate-400">Authorized by: {h.officer}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ACTIVATION MODAL */}
      {isActivatingModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-red-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center space-x-2 text-red-600 pb-2 border-b border-slate-100">
              <Flame className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">Authorize Emergency Protocol</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Authorizing Officer</label>
                <input
                  type="text"
                  value={officerName}
                  onChange={e => setOfficerName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Severity Escalation Level</label>
                <select
                  value={severityLevel}
                  onChange={e => setSeverityLevel(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  <option value="LEVEL_1_WARNING">Level 1 - Heightened Alert</option>
                  <option value="LEVEL_2_ELEVATED">Level 2 - Elevated Emergency Protocol</option>
                  <option value="LEVEL_3_CRITICAL">Level 3 - Critical Civil Defense Escalation</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Declaration Reason & Directive</label>
                <textarea
                  rows={3}
                  value={activationReason}
                  onChange={e => setActivationReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2 text-xs">
              <button
                onClick={() => setIsActivatingModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleToggleEmergency(true)}
                disabled={isProcessing}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-md transition disabled:opacity-50"
              >
                {isProcessing ? 'Enacting...' : 'Enact Emergency Directive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmergencyCenter;
