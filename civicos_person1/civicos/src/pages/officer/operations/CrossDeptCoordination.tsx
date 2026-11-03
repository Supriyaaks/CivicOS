import React, { useState, useEffect } from 'react';
import { useMccStore } from '../../../store/mccStore';
import { backendService } from '../../../services/backendService';
import {
  Users2,
  PlusCircle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Building2,
  Send,
  Filter,
  Check
} from 'lucide-react';

export const CrossDeptCoordination: React.FC = () => {
  const { incidents, departments, fetchIncidents, fetchDepartments, updateIncident } = useMccStore();

  const [requests, setRequests] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchIncidents();
    fetchDepartments();
  }, [fetchIncidents, fetchDepartments]);

  // New Request Form State
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const [fromDeptId, setFromDeptId] = useState<string>('');
  const [toDeptId, setToDeptId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [officerName] = useState<string>('Chief Operations Officer');

  // Comment Input State per Request
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const loadRequests = async () => {
    try {
      const data = await backendService.getCoordinationRequests({
        status: filterStatus !== 'ALL' ? filterStatus : undefined
      });
      if (data) setRequests(data);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    loadRequests();
  }, [filterStatus]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncidentId || !fromDeptId || !toDeptId || !reason) return;

    try {
      const newReq = await backendService.createCoordinationRequest({
        incidentId: selectedIncidentId,
        fromDeptId,
        toDeptId,
        reason,
        officerName
      });

      if (newReq) {
        setRequests(prev => [newReq, ...prev]);
        setIsModalOpen(false);
        setReason('');

        // Update local store supporting departments
        const toDeptObj = departments.find(d => d.id === toDeptId);
        if (toDeptObj) {
          const inc = incidents.find(i => i.id === selectedIncidentId);
          if (inc) {
            const currentSupporting = inc.supportingDepts || [];
            if (!currentSupporting.includes(toDeptObj.name)) {
              updateIncident(inc.id, {
                supportingDepts: [...currentSupporting, toDeptObj.name]
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to create coordination request', err);
    }
  };

  const handleStatusUpdate = async (requestId: string, status: string, comment?: string) => {
    try {
      const updated = await backendService.updateCoordinationStatus(
        requestId,
        status,
        comment,
        officerName
      );
      if (updated) {
        setRequests(prev => prev.map(r => r.id === requestId ? updated : r));
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleAddComment = async (requestId: string) => {
    const text = commentInputs[requestId];
    if (!text) return;

    try {
      const updated = await backendService.addCoordinationComment(
        requestId,
        officerName,
        'Municipal Command',
        text
      );
      if (updated) {
        setRequests(prev => prev.map(r => r.id === requestId ? updated : r));
        setCommentInputs(prev => ({ ...prev, [requestId]: '' }));
      }
    } catch (err) {
      console.error('Failed to add comment', err);
    }
  };

  return (
    <div className="space-y-6 p-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cross-Department Coordination Hub</h1>
            <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase bg-blue-100 text-blue-700 rounded-full border border-blue-200">
              Module D • Multi-Agency Operations
            </span>
          </div>
          <p className="text-slate-500 text-sm font-medium">
            Inter-agency collaboration requests, multi-department incident linking, response milestones & joint timelines
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Initiate Inter-Agency Request</span>
        </button>
      </div>

      {/* FILTER & STATS BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold text-slate-500 uppercase">Status Filter:</span>
          {['ALL', 'Pending', 'Accepted', 'Completed', 'Rejected'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                filterStatus === st
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <span className="text-slate-400 font-mono text-xs">
          Showing {requests.length} coordination workflows
        </span>
      </div>

      {/* REQUESTS LIST */}
      <div className="space-y-4">
        {requests.map(req => {
          const inc = incidents.find(i => i.id === req.incidentId);
          return (
            <div
              key={req.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 transition hover:border-blue-200"
            >
              {/* Top Meta */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    {req.incidentId}
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {inc ? `${inc.category} • ${inc.location}` : 'Municipal Incident'}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    req.status === 'Accepted' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                    req.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                    req.status === 'Rejected' ? 'bg-red-100 text-red-700 border border-red-200' :
                    'bg-amber-100 text-amber-700 border border-amber-200'
                  }`}>
                    {req.status}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Department Routing Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Requesting Department</span>
                  <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>{req.fromDeptName}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Target Supporting Department</span>
                  <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                    <Users2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{req.toDeptName}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Coordination Purpose</span>
                  <p className="text-slate-700 font-medium line-clamp-2">{req.reason}</p>
                </div>
              </div>

              {/* Comments / Inter-Agency Notes */}
              {req.comments && req.comments.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center space-x-1">
                    <MessageSquare className="w-3 h-3" />
                    <span>Coordination Dialogue & Field Updates</span>
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {req.comments.map((cm: any) => (
                      <div key={cm.id} className="p-2.5 bg-blue-50/40 border border-blue-100/60 rounded-xl text-xs space-y-0.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-slate-800">{cm.author} ({cm.department})</span>
                          <span className="text-slate-400">{new Date(cm.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-slate-700 font-medium">{cm.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons & Quick Comment Field */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                {/* Status action buttons */}
                <div className="flex items-center space-x-2">
                  {req.status === 'Pending' && (
                    <>
                      <button
                        onClick={() => handleStatusUpdate(req.id, 'Accepted', 'Request accepted by receiving department chief.')}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center space-x-1 transition shadow-sm"
                      >
                        <Check className="w-3 h-3" />
                        <span>Accept Request</span>
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(req.id, 'Rejected', 'Declined due to resource shortfall.')}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-600 rounded-lg font-bold flex items-center space-x-1 transition"
                      >
                        <XCircle className="w-3 h-3" />
                        <span>Decline</span>
                      </button>
                    </>
                  )}

                  {req.status === 'Accepted' && (
                    <button
                      onClick={() => handleStatusUpdate(req.id, 'Completed', 'Collaborative remediation completed successfully.')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center space-x-1 transition shadow-sm"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Mark Collaboration Completed</span>
                    </button>
                  )}
                </div>

                {/* Add Quick Comment */}
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Add coordination update..."
                    value={commentInputs[req.id] || ''}
                    onChange={e => setCommentInputs({ ...commentInputs, [req.id]: e.target.value })}
                    className="p-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none w-full sm:w-64"
                  />
                  <button
                    onClick={() => handleAddComment(req.id)}
                    className="p-1.5 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold transition flex items-center space-x-1"
                  >
                    <Send className="w-3 h-3" />
                    <span>Post</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {requests.length === 0 && (
          <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            No cross-department coordination requests found for this filter.
          </div>
        )}
      </div>

      {/* CREATE REQUEST MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Initiate Inter-Agency Coordination</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Target Incident</label>
                <select
                  required
                  value={selectedIncidentId}
                  onChange={e => setSelectedIncidentId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Select incident to link...</option>
                  {incidents.map(inc => (
                    <option key={inc.id} value={inc.id}>
                      {inc.id} • {inc.category} ({inc.location})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Requesting Dept</label>
                  <select
                    required
                    value={fromDeptId}
                    onChange={e => setFromDeptId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Select requesting...</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Target Support Dept</label>
                  <select
                    required
                    value={toDeptId}
                    onChange={e => setToDeptId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Select receiving...</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Collaboration Purpose / Special Assistance Needed</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Roads Dept requires Traffic Dept lane diversion while milling machine works."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm"
                >
                  Dispatch Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrossDeptCoordination;
