import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useMccStore } from '../../../store/mccStore';
import { backendService } from '../../../services/backendService';
import {
  CheckCircle2,
  Sliders,
  AlertCircle,
  Sparkles,
  History
} from 'lucide-react';

export const DeptAssignment: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { incidents, departments, fetchIncidents, fetchDepartments, updateIncident } = useMccStore();

  const [activeTab, setActiveTab] = useState<'queue' | 'rules' | 'history'>('queue');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(id || incidents[0]?.id || '');
  const [targetDeptId, setTargetDeptId] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Assignment history & rules state
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [rulesList, setRulesList] = useState<any[]>([]);

  useEffect(() => {
    fetchIncidents();
    fetchDepartments();
  }, [fetchIncidents, fetchDepartments]);

  useEffect(() => {
    if (id) {
      setSelectedIncidentId(id);
    } else if (!selectedIncidentId && incidents.length > 0) {
      setSelectedIncidentId(incidents[0].id);
    }
  }, [id, incidents, selectedIncidentId]);

  useEffect(() => {
    // Load rules
    backendService.getAssignmentRules().then(rules => {
      if (rules && rules.length > 0) setRulesList(rules);
    });
  }, []);

  useEffect(() => {
    if (selectedIncidentId) {
      backendService.getAssignmentHistory(selectedIncidentId).then(history => {
        setHistoryList(history || []);
      });
    }
  }, [selectedIncidentId]);

  const selectedIncident = incidents.find(i => i.id === selectedIncidentId);

  // Run Auto-Assignment Engine on all unassigned incidents
  const handleRunAutoAssign = async () => {
    setIsProcessing(true);
    setActionNotice(null);
    try {
      const results = await backendService.runAutoAssign();
      const assignedCount = results.filter((r: any) => r.status === 'ASSIGNED').length;
      const reviewCount = results.filter((r: any) => r.status === 'NEEDS_MANUAL_REVIEW').length;

      // Update store incidents
      results.forEach((res: any) => {
        if (res.status === 'ASSIGNED') {
          updateIncident(res.incidentId, {
            assignedDept: res.department,
            status: 'In Progress'
          });
        }
      });

      setActionNotice({
        type: 'success',
        message: `Auto-assignment completed: ${assignedCount} incidents routed automatically, ${reviewCount} queued for manual officer review.`
      });

      if (selectedIncidentId) {
        const h = await backendService.getAssignmentHistory(selectedIncidentId);
        setHistoryList(h || []);
      }
    } catch {
      setActionNotice({
        type: 'error',
        message: 'Auto-assignment engine encountered an error.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Manual Override Submission
  const handleManualOverride = async () => {
    if (!selectedIncident || !targetDeptId) {
      setActionNotice({ type: 'error', message: 'Please select a target department.' });
      return;
    }

    setIsProcessing(true);
    setActionNotice(null);
    try {
      await backendService.overrideAssignment(
        selectedIncident.id,
        targetDeptId,
        overrideReason || 'Officer manual reassignment override',
        'Chief Officer'
      );

      const targetDeptObj = departments.find(d => d.id === targetDeptId || d.name === targetDeptId);
      const deptName = targetDeptObj ? targetDeptObj.name : targetDeptId;

      await updateIncident(selectedIncident.id, {
        assignedDept: deptName,
        status: 'In Progress'
      });

      setActionNotice({
        type: 'success',
        message: `Incident ${selectedIncident.id} successfully reassigned to ${deptName}. Audit trail logged.`
      });

      setOverrideReason('');
      const h = await backendService.getAssignmentHistory(selectedIncident.id);
      setHistoryList(h || []);
    } catch {
      setActionNotice({ type: 'error', message: 'Failed to record manual override.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const unassignedCount = incidents.filter(i => !i.assignedDept || i.assignedDept === 'Unassigned').length;

  return (
    <div className="space-y-6 p-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Department Assignment Engine</h1>
            <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase bg-blue-100 text-blue-700 rounded-full border border-blue-200">
              Module C • Routing Engine
            </span>
          </div>
          <p className="text-slate-500 text-sm font-medium">
            AI-driven keyword routing, configurable department mappings & officer manual override controls
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRunAutoAssign}
            disabled={isProcessing}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isProcessing ? 'Analyzing & Routing...' : 'Run Auto-Assignment Engine'}</span>
          </button>
        </div>
      </div>

      {/* ACTION NOTICE BANNER */}
      {actionNotice && (
        <div className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between ${
          actionNotice.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <div className="flex items-center space-x-2">
            {actionNotice.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            <span>{actionNotice.message}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </div>
      )}

      {/* NAVIGATION TABS */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 rounded-lg transition ${
            activeTab === 'queue'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Assignment Queue</span>
          {unassignedCount > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-900 font-extrabold">
              {unassignedCount} Unassigned
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 rounded-lg transition ${
            activeTab === 'rules'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Configurable Routing Rules ({rulesList.length || 6})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-lg transition ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Audit & Reassignment History</span>
        </button>
      </div>

      {/* TAB CONTENT: ASSIGNMENT QUEUE */}
      {activeTab === 'queue' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Incident Selector List */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700 uppercase">Select Incident</span>
              <span className="text-[11px] text-slate-400">{incidents.length} Total</span>
            </div>

            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {incidents.map(inc => {
                const isSelected = inc.id === selectedIncidentId;
                const isAssigned = inc.assignedDept && inc.assignedDept !== 'Unassigned';
                return (
                  <div
                    key={inc.id}
                    onClick={() => setSelectedIncidentId(inc.id)}
                    className={`p-3 rounded-xl border transition cursor-pointer text-xs space-y-1.5 ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-400 shadow-sm'
                        : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900">{inc.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isAssigned ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {isAssigned ? inc.assignedDept : 'Unassigned'}
                      </span>
                    </div>
                    <p className="font-bold text-slate-800 line-clamp-1">{inc.category}</p>
                    <p className="text-slate-500 line-clamp-1 text-[11px]">{inc.location}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Incident Details & Override Controls */}
          <div className="lg:col-span-2 space-y-6">
            {selectedIncident ? (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 font-mono text-xs font-bold bg-blue-100 text-blue-700 rounded border border-blue-200">
                        {selectedIncident.id}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-bold bg-slate-100 text-slate-700 rounded">
                        {selectedIncident.severity} Severity
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 mt-2">{selectedIncident.category}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{selectedIncident.location}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Current Assignment</span>
                    <p className="text-sm font-black text-blue-700">{selectedIncident.assignedDept || 'Unassigned Queue'}</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl space-y-2 text-xs border border-slate-100">
                  <div className="font-bold text-slate-700">Citizen Description:</div>
                  <p className="text-slate-600 leading-relaxed">{selectedIncident.description}</p>
                  {selectedIncident.rootCause && (
                    <div className="pt-2 border-t border-slate-200 text-purple-700">
                      <strong>AI Root Cause Analysis:</strong> {selectedIncident.rootCause}
                    </div>
                  )}
                </div>

                {/* MANUAL OVERRIDE SECTION */}
                <div className="p-5 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl border border-blue-100 space-y-4">
                  <div className="flex items-center space-x-2">
                    <Sliders className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900">Manual Department Override</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700">Target Department</label>
                      <select
                        value={targetDeptId}
                        onChange={e => setTargetDeptId(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="">Select target department...</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700">Reason for Override / Routing Note</label>
                      <input
                        type="text"
                        placeholder="e.g. Proximity to school zone / Special equipment needed"
                        value={overrideReason}
                        onChange={e => setOverrideReason(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-slate-400">
                      All reassignment actions are permanently recorded in the municipal audit trail.
                    </span>
                    <button
                      onClick={handleManualOverride}
                      disabled={isProcessing || !targetDeptId}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50 shadow-sm"
                    >
                      {isProcessing ? 'Recording...' : 'Apply Department Reassignment'}
                    </button>
                  </div>
                </div>

                {/* RECENT ASSIGNMENT LOGS FOR THIS INCIDENT */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                    <History className="w-4 h-4 text-slate-400" />
                    <span>Assignment History for {selectedIncident.id}</span>
                  </div>

                  {historyList.length > 0 ? (
                    <div className="space-y-2">
                      {historyList.map(h => (
                        <div key={h.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">{h.action} → {h.departmentName}</span>
                            <span className="text-[10px] text-slate-400">{new Date(h.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="text-slate-600 text-[11px]">{h.reason}</p>
                          <div className="text-[10px] text-slate-400">Logged by: {h.userName}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No previous reassignments logged for this record.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400">
                Select an incident from the left queue to inspect its routing.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: CONFIGURABLE RULES */}
      {activeTab === 'rules' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Active Routing Rules</h2>
              <p className="text-xs text-slate-500">
                The automatic engine matches keywords in citizen complaints against these department mappings.
              </p>
            </div>
            <span className="px-2.5 py-1 text-xs font-mono font-bold bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
              Priority Hierarchy Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(rulesList.length > 0 ? rulesList : [
              { departmentCode: 'ROADS', departmentName: 'Roads & Infrastructure', keywords: ['pothole', 'road', 'asphalt', 'fissure', 'divider', 'bridge'] },
              { departmentCode: 'SAN', departmentName: 'Solid Waste Management', keywords: ['waste', 'garbage', 'dump', 'trash', 'litter', 'bin', 'debris'] },
              { departmentCode: 'ELEC', departmentName: 'Electrical Department', keywords: ['streetlight', 'light', 'lamp', 'cable', 'power', 'electric', 'wire'] },
              { departmentCode: 'WATER', departmentName: 'Water and Drainage', keywords: ['drainage', 'sewage', 'water', 'leak', 'pipe', 'flood', 'overflow'] },
              { departmentCode: 'PARKS', departmentName: 'Parks & Public Spaces', keywords: ['tree', 'branch', 'park', 'garden', 'grass', 'lawn', 'playground'] },
              { departmentCode: 'SAFETY', departmentName: 'Traffic & Public Safety', keywords: ['barricade', 'hazard', 'traffic jam', 'signage', 'accident'] },
            ]).map((rule, idx) => (
              <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 bg-white border border-slate-200 rounded text-blue-700">
                      {rule.departmentCode}
                    </span>
                    <span className="font-bold text-slate-900 text-xs">{rule.departmentName}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">Rule #{idx + 1}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {rule.keywords.map((kw: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 text-[10px] font-mono bg-white text-slate-600 rounded border border-slate-200">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: AUDIT HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">City-Wide Assignment Audit Log</h2>
            <p className="text-xs text-slate-500">Permanent record of automated routing and officer manual reassignments</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase">
                  <th className="pb-2">Incident ID</th>
                  <th className="pb-2">Action Type</th>
                  <th className="pb-2">Target Department</th>
                  <th className="pb-2">Reason / Rule</th>
                  <th className="pb-2">Operator</th>
                  <th className="pb-2 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {historyList.map(h => (
                  <tr key={h.id} className="hover:bg-slate-50">
                    <td className="py-2.5 font-mono font-bold text-blue-600">{h.incidentId}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        h.action === 'AUTO_ASSIGNED' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {h.action}
                      </span>
                    </td>
                    <td className="py-2.5 font-bold text-slate-900">{h.departmentName}</td>
                    <td className="py-2.5 text-slate-600 max-w-xs truncate">{h.reason}</td>
                    <td className="py-2.5">{h.userName}</td>
                    <td className="py-2.5 text-right text-slate-400 font-mono">
                      {new Date(h.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeptAssignment;
