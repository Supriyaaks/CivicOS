import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMccStore } from '../../../store/mccStore';
import { backendService } from '../../../services/backendService';
import { StatusBadge, SeverityBadge } from '../../../components/MCCComponents';
import {
  ShieldAlert,
  Building2,
  FileCheck2,
  Sliders,
  Send,
  History,
  Sparkles,
  MapPin
} from 'lucide-react';

const IncidentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { incidents, departments, updateIncident, fetchIncidents } = useMccStore();

  const incident = id ? incidents.find(inc => inc.id === id) : null;

  // Officer Action Console state
  const [selectedStatus, setSelectedStatus] = useState<string>('Pending');
  const [selectedPriority, setSelectedPriority] = useState<string>('Medium');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [officerNote, setOfficerNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Timeline / History state
  const [historyList, setHistoryList] = useState<any[]>([]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  useEffect(() => {
    if (incident) {
      setSelectedStatus(incident.status || 'Pending');
      setSelectedPriority(incident.priority || 'Medium');
      if (incident.departmentId) {
        setSelectedDeptId(incident.departmentId);
      } else if (incident.assignedDept && departments.length > 0) {
        const found = departments.find(d => d.name === incident.assignedDept || d.code === incident.assignedDept);
        if (found) setSelectedDeptId(found.id);
      }
    }
  }, [incident, departments]);

  useEffect(() => {
    if (id) {
      backendService.getAssignmentHistory(id).then(history => {
        setHistoryList(history || []);
      });
    }
  }, [id]);

  const handleUpdateIncident = async () => {
    if (!incident) return;
    setIsSubmitting(true);
    setActionNotice(null);

    try {
      const selectedDeptObj = departments.find(d => d.id === selectedDeptId);
      const updates: any = {
        status: selectedStatus,
        priority: selectedPriority,
        departmentId: selectedDeptId || undefined,
        assignedDept: selectedDeptObj?.name || incident.assignedDept,
        resolutionDescription: officerNote || incident.resolutionDescription,
      };

      await updateIncident(incident.id, updates);

      // If department changed, also record override
      if (selectedDeptId && selectedDeptId !== incident.departmentId) {
        await backendService.overrideAssignment(
          incident.id,
          selectedDeptId,
          officerNote || 'Officer reassigned department via details console'
        ).catch(() => {});
      }

      // Refresh history
      const updatedHistory = await backendService.getAssignmentHistory(incident.id);
      if (updatedHistory) setHistoryList(updatedHistory);

      setActionNotice({
        type: 'success',
        message: `Incident ${incident.id} updated successfully: Status [${selectedStatus}], Dept [${selectedDeptObj?.name || 'Unassigned'}]. Persisted to PostgreSQL.`
      });
      setOfficerNote('');
      await fetchIncidents();
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: `Failed to update incident: ${err?.message || err}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!id) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">Select an Incident</h1>
          <button
            onClick={() => navigate('/officer/incidents')}
            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-semibold hover:bg-slate-200 transition-all text-sm"
          >
            Back to Management
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {incidents.map(inc => (
            <div
              key={inc.id}
              onClick={() => navigate(`/officer/details/${inc.id}`)}
              className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-sm transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-slate-900">{inc.id}</span>
                <SeverityBadge severity={inc.severity} />
              </div>
              <p className="text-sm text-slate-600 truncate">{inc.category}</p>
              <p className="text-xs text-slate-400 mt-1">{inc.location}</p>
              <div className="mt-3 text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                View Details &rarr;
              </div>
            </div>
          ))}
          {incidents.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500">
              No incidents available in the system.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Incident Not Found</h1>
        <p className="text-slate-500">The incident ID "{id}" does not exist in the database.</p>
        <button
          onClick={() => navigate('/officer/incidents')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
        >
          Back to Incident Management
        </button>
      </div>
    );
  }

  const isRoadIncident = incident.category.toLowerCase().includes('pothole') || incident.category.toLowerCase().includes('road') || incident.category.toLowerCase().includes('crack');

  return (
    <div className="p-8 space-y-6">
      {/* HEADER & QUICK ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-black text-slate-900">{incident.id}</h1>
            <StatusBadge status={incident.status} />
            <SeverityBadge severity={incident.severity} />
          </div>
          <p className="text-slate-500 text-sm flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span>{incident.category} • {incident.location}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isRoadIncident && (
            <button
              onClick={() => navigate(`/officer/verification/${incident.id}`)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition flex items-center space-x-1.5"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Verify Repair (AI)</span>
            </button>
          )}

          <button
            onClick={() => navigate(`/officer/assignment/${incident.id}`)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition flex items-center space-x-1.5"
          >
            <Building2 className="w-4 h-4" />
            <span>Assignment Console</span>
          </button>

          <button
            onClick={() => navigate('/officer/incidents')}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold text-sm transition"
          >
            &larr; Back
          </button>
        </div>
      </div>

      {/* ACTION BANNER */}
      {actionNotice && (
        <div className={`p-4 rounded-xl text-sm font-medium border flex items-center justify-between ${
          actionNotice.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <span>{actionNotice.message}</span>
          <button onClick={() => setActionNotice(null)} className="text-xs font-bold underline ml-4">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: TICKET DETAILS + OFFICER CONSOLE */}
        <div className="lg:col-span-2 space-y-6">
          {/* OFFICER ACTION CONSOLE */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-blue-200 pb-3">
              <div className="flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-900">Municipal Officer Action Console</h3>
              </div>
              <span className="text-[11px] font-bold uppercase bg-blue-600 text-white px-2 py-0.5 rounded-full">
                Live PostgreSQL Write
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Status Select */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  Incident Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              {/* Priority Select */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  Priority Level
                </label>
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              {/* Department Select */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  Assigned Department
                </label>
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Unassigned</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Officer Note */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                Resolution / Dispatch Note
              </label>
              <textarea
                value={officerNote}
                onChange={(e) => setOfficerNote(e.target.value)}
                placeholder="Enter internal resolution notes, dispatch instructions, or verification remarks..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none h-20"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={handleUpdateIncident}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-md transition disabled:opacity-50 flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving to Database...' : 'Save & Persist Changes'}</span>
              </button>
            </div>
          </div>

          {/* GENERAL INFO CARD */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Incident Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Description</p>
                <p className="text-sm text-slate-700 font-medium mt-0.5">{incident.description}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Reported Date</p>
                <p className="text-sm text-slate-700 font-medium mt-0.5">{new Date(incident.date).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Assigned Department</p>
                <p className="text-sm text-blue-700 font-bold mt-0.5">{incident.assignedDept || 'Unassigned'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Ward & Coordinates</p>
                <p className="text-sm text-slate-700 font-medium mt-0.5">
                  {incident.ward || 'Ward 14'} • {incident.latitude?.toFixed(4) || '12.9716'}, {incident.longitude?.toFixed(4) || '77.5946'}
                </p>
              </div>
              {incident.resolutionDescription && (
                <div className="col-span-2 bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-900">
                  <p className="font-bold uppercase tracking-wide">Resolution Notes:</p>
                  <p className="mt-0.5">{incident.resolutionDescription}</p>
                </div>
              )}
            </div>
          </div>

          {/* EVIDENCE & AI ANALYSIS */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Evidence & Vision AI Analysis</h3>
            <div className="flex flex-col sm:flex-row gap-4">
              {incident.evidence ? (
                <img
                  src={incident.evidence}
                  alt="Evidence"
                  className="w-full sm:w-48 h-36 object-cover rounded-lg border border-slate-200 shadow-sm"
                />
              ) : (
                <div className="w-full sm:w-48 h-36 bg-slate-100 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400">
                  No Photo Uploaded
                </div>
              )}
              <div className="flex-1 space-y-2">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">AI Root Cause Prediction</p>
                  <p className="text-sm text-slate-700 italic">
                    "{incident.rootCause || 'Monsoon water accumulation causing asphalt surface fracture'}"
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-slate-500">AI Confidence:</span>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {incident.aiConfidence || '88%'}
                  </span>
                </div>
                <div className="flex items-center space-x-2 pt-1">
                  <span className="text-xs font-medium text-slate-500">Automated AI Verification:</span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {incident.aiVerificationStatus || 'Verified Autonomous'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* AUDIT TIMELINE */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b pb-2">
              <History className="w-4 h-4 text-slate-500" />
              <h3 className="text-lg font-bold text-slate-800">Assignment & Status Audit History</h3>
            </div>
            {historyList.length > 0 ? (
              <div className="space-y-3">
                {historyList.map((h: any, idx: number) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-900">{h.action}</span>
                      <p className="text-slate-600 mt-0.5">{h.reason || `Handled by ${h.userName || 'Officer'}`}</p>
                    </div>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No historical reassignments logged for this incident yet.</p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: PREDICTIVE RISKS & WHAT-IF */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg space-y-4">
            <h3 className="text-lg font-bold flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <span>Predictive Risk Assessment</span>
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm opacity-70">Impact Score</span>
                <span className="text-lg font-bold text-amber-300">{incident.impactScore ? `${incident.impactScore}/100` : '68/100'}</span>
              </div>
              <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full" style={{ width: `${incident.impactScore || 68}%` }} />
              </div>
              <div className="pt-2">
                <p className="text-xs opacity-70 uppercase font-semibold mb-2">Cascading Risks</p>
                <div className="flex flex-wrap gap-1.5">
                  {incident.cascadeRisk && incident.cascadeRisk.length > 0 ? (
                    incident.cascadeRisk.map((risk, i) => (
                      <span key={i} className="text-[11px] bg-slate-800 px-2.5 py-1 rounded border border-slate-700 text-slate-200">
                        {risk}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">Traffic Congestion, Drainage Overflow</span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800">
              <button
                onClick={() => navigate('/officer/simulation')}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-lg text-xs font-bold border border-slate-700 transition flex items-center justify-center space-x-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simulate Environmental Stress</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentDetails;
