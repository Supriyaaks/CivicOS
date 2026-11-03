import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMccStore } from '../../store/mccStore';
import { backendService } from '../../services/backendService';
import { supabase } from '../../lib/supabase';
import { StatusBadge, SeverityBadge } from '../../components/MCCComponents';

const CATEGORIES = [
  'Roads and Potholes',
  'Pothole',
  'Cracks',
  'Street Lighting',
  'Traffic Light',
  'Garbage and Waste Management',
  'Waste container',
  'Animal',
  'Drainage and Sewage',
  'Open manhole',
  'Water Supply',
  'Public Infrastructure',
  'Traffic and Road Safety',
];

const AIValidation: React.FC = () => {
  const navigate = useNavigate();
  const { incidents, fetchIncidents, updateIncident } = useMccStore();
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'mismatch' | 'needs_review' | 'duplicates' | 'resolution'>('all');
  const [actionCategory, setActionCategory] = useState<string>('');
  const [officerNote, setOfficerNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  // Review queue candidates: items with AI status 'needs_review', 'mismatch', duplicate flags, or resolution verification
  const reviewQueue = incidents.filter(inc => {
    const hasAIReview = inc.aiVerificationStatus === 'needs_review' || inc.aiVerificationStatus === 'mismatch';
    const isDup = Boolean(inc.isDuplicate);
    const hasResVerif = Boolean(inc.resolutionVerification) || inc.status === 'Awaiting Verification';

    if (filterType === 'mismatch') return inc.aiVerificationStatus === 'mismatch';
    if (filterType === 'needs_review') return inc.aiVerificationStatus === 'needs_review';
    if (filterType === 'duplicates') return isDup;
    if (filterType === 'resolution') return hasResVerif;
    return hasAIReview || isDup || hasResVerif;
  });

  const selectedIncident = reviewQueue.find(i => i.id === selectedIncidentId) || reviewQueue[0] || null;

  useEffect(() => {
    if (selectedIncident) {
      setActionCategory(selectedIncident.detectedCategory || selectedIncident.category);
    }
  }, [selectedIncident?.id]);

  const handleOfficerDecision = async (decision: 'approve' | 'override' | 'mark_duplicate' | 'resolve' | 'rework') => {
    if (!selectedIncident) return;
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const incidentId = selectedIncident.id;
      let updates: any = {};
      let actionLabel = '';

      if (decision === 'approve') {
        updates = {
          ai_verification_status: 'verified',
          status: 'In Progress',
          current_stage: 3,
        };
        actionLabel = 'ai_decision_approved';
      } else if (decision === 'override') {
        updates = {
          category: actionCategory,
          ai_verification_status: 'verified_override',
          status: 'In Progress',
          current_stage: 3,
        };
        actionLabel = 'category_overridden';
      } else if (decision === 'mark_duplicate') {
        updates = {
          is_duplicate: true,
          status: 'Closed',
          current_stage: 8,
        };
        actionLabel = 'confirmed_duplicate';
      } else if (decision === 'resolve') {
        updates = {
          status: 'Resolved',
          current_stage: 7,
          resolution_description: officerNote || 'Resolution verified and approved by municipal officer.',
        };
        actionLabel = 'resolution_approved';
      } else if (decision === 'rework') {
        updates = {
          status: 'In Progress',
          current_stage: 4,
          resolution_description: officerNote || 'Rework requested by municipal officer.',
        };
        actionLabel = 'resolution_rework_requested';
      }

      // Update store & PostgreSQL Backend
      await updateIncident(incidentId, {
        ...updates,
        status: updates.status === 'In Progress' ? 'InProgress' : updates.status,
      });

      try {
        await backendService.updateIncidentStatus(
          incidentId,
          updates.status === 'In Progress' ? 'InProgress' : updates.status,
          updates.current_stage || 3,
          officerNote || `Officer AI review decision: ${actionLabel}`
        );
      } catch (beErr) {
        console.warn('[AIValidation] Backend status update notice:', beErr);
      }

      // Log to audit_logs
      try {
        await supabase.from('audit_logs').insert([{
          entity_type: 'complaint',
          entity_id: incidentId,
          action: actionLabel,
          new_data: {
            ...updates,
            officer_note: officerNote,
            timestamp: new Date().toISOString(),
          },
        }]);
      } catch (auditErr) {
        console.warn('[AIValidation] Audit log insert notice:', auditErr);
      }

      setStatusMessage(`Decision recorded successfully for ${incidentId}.`);
      setOfficerNote('');
      await fetchIncidents();
    } catch (err: any) {
      console.error('[AIValidation] Decision error:', err);
      setStatusMessage(`Error recording decision: ${err?.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-3xl font-bold text-slate-900">Municipal AI Review Queue</h1>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-indigo-100 text-indigo-800 rounded-full border border-indigo-200">
              Human-in-the-Loop
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Review and resolve complaints flagged by automated AI inspection for category discrepancies, low confidence, duplicates, or ambiguous repairs.
          </p>
        </div>
        <button
          onClick={() => navigate('/officer/incidents')}
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors"
        >
          &larr; Incident Management
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-bold uppercase">Total Review Items</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{reviewQueue.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm">
          <p className="text-xs text-amber-700 font-bold uppercase">Category Discrepancies</p>
          <p className="text-2xl font-extrabold text-amber-700 mt-1">
            {incidents.filter(i => i.aiVerificationStatus === 'mismatch').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-sm">
          <p className="text-xs text-purple-700 font-bold uppercase">Duplicate Candidates</p>
          <p className="text-2xl font-extrabold text-purple-700 mt-1">
            {incidents.filter(i => Boolean(i.isDuplicate)).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm">
          <p className="text-xs text-emerald-700 font-bold uppercase">Resolution Audits</p>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">
            {incidents.filter(i => Boolean(i.resolutionVerification)).length}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-1">
        {[
          { id: 'all', label: 'All Items' },
          { id: 'mismatch', label: 'Category Mismatches' },
          { id: 'needs_review', label: 'Low Confidence' },
          { id: 'duplicates', label: 'Duplicate Candidates' },
          { id: 'resolution', label: 'Resolution Audits' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              filterType === tab.id
                ? 'bg-white border-t border-l border-r border-slate-200 text-indigo-600 font-bold -mb-px'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {statusMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-emerald-600 font-bold ml-4">✕</button>
        </div>
      )}

      {/* Main Review Workspace */}
      {reviewQueue.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <span className="text-4xl">🎉</span>
          <h3 className="text-lg font-bold text-slate-800">Review Queue Clear</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            There are currently no complaints requiring human AI inspection. All reported incidents have verified categories or have been processed.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Candidates List */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase text-slate-500 tracking-wider">
              Pending Candidates ({reviewQueue.length})
            </h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {reviewQueue.map(item => (
                <div
                  key={item.id}
                  onClick={() => setSelectedIncidentId(item.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    (selectedIncident?.id === item.id)
                      ? 'bg-indigo-50/50 border-indigo-400 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{item.id}</span>
                    <SeverityBadge severity={item.severity} />
                  </div>
                  <p className="text-xs font-semibold text-slate-700 mt-1 truncate">{item.category}</p>
                  <p className="text-xs text-slate-500 truncate">{item.location}</p>

                  <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                    {item.aiVerificationStatus === 'mismatch' && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded">
                        Mismatch Flag
                      </span>
                    )}
                    {item.aiVerificationStatus === 'needs_review' && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded">
                        Needs Review
                      </span>
                    )}
                    {item.isDuplicate && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-800 rounded">
                        Duplicate
                      </span>
                    )}
                    {item.resolutionVerification && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">
                        Resolution Audit
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Detailed Evidence & Decision Panel */}
          {selectedIncident && (
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-start justify-between border-b pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Incident Review: {selectedIncident.id}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Reported {new Date(selectedIncident.date).toLocaleString()} • {selectedIncident.location}
                    </p>
                  </div>
                  <StatusBadge status={selectedIncident.status} />
                </div>

                {/* Evidence Image and AI Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Complaint Evidence</h4>
                    {selectedIncident.evidence ? (
                      <img
                        src={selectedIncident.evidence}
                        alt="Evidence"
                        className="w-full h-52 object-cover rounded-xl border border-slate-200"
                      />
                    ) : (
                      <div className="w-full h-52 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-xs">
                        No image uploaded
                      </div>
                    )}
                    <p className="text-xs text-slate-600 mt-2 font-medium">
                      <span className="font-semibold text-slate-800">Description:</span> {selectedIncident.description}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase">AI Pipeline Inspection</h4>

                    <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Citizen Reported:</span>
                        <span className="font-bold text-slate-800">{selectedIncident.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">AI Detected Class:</span>
                        <span className="font-bold text-indigo-700">
                          {selectedIncident.detectedCategory || selectedIncident.aiResults?.verification?.detected_category || 'Inconclusive'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Verification Status:</span>
                        <span className="font-bold text-amber-700 uppercase">
                          {selectedIncident.aiVerificationStatus || 'Pending'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">AI Confidence:</span>
                        <span className="font-bold text-slate-800">{selectedIncident.aiConfidence}</span>
                      </div>
                    </div>

                    {/* AI Reasoning */}
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                      <span className="font-bold block">AI Diagnostic Note:</span>
                      <p>{selectedIncident.rootCause || selectedIncident.aiResults?.verification?.explanation || 'Category cross-check flagged discrepancy with model detection.'}</p>
                    </div>

                    {/* Supplementary Detectors */}
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      {selectedIncident.aiResults?.litter_detection?.total_detected > 0 && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded font-semibold">
                          🗑️ Litter Detected ({selectedIncident.aiResults.litter_detection.total_detected})
                        </span>
                      )}
                      {selectedIncident.aiResults?.rdd_detection?.detections?.length > 0 && (
                        <span className="px-2 py-1 bg-rose-100 text-rose-800 rounded font-semibold">
                          🛣️ Road Damage Detected ({selectedIncident.aiResults.rdd_detection.detections.length})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Resolution Verification details if available */}
                {selectedIncident.resolutionVerification && (
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-2">
                    <h4 className="font-bold text-emerald-900 uppercase">AI Resolution Verification Finding</h4>
                    <p className="text-emerald-800">{selectedIncident.resolutionVerification.reason}</p>
                    <div className="flex space-x-4 text-slate-700">
                      <span>Status: <strong className="uppercase">{selectedIncident.resolutionVerification.status}</strong></span>
                      <span>Similarity Score: <strong>{(selectedIncident.resolutionVerification.similarity_score * 100).toFixed(1)}%</strong></span>
                      <span>Recommendation: <strong>{selectedIncident.resolutionVerification.recommendation}</strong></span>
                    </div>
                  </div>
                )}

                {/* Officer Decision Panel */}
                <div className="border-t pt-5 space-y-4">
                  <h4 className="text-sm font-bold text-slate-900">Officer Action & Determination</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">
                        Override / Confirm Category
                      </label>
                      <select
                        value={actionCategory}
                        onChange={(e) => setActionCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        {CATEGORIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">
                        Officer Notes / Justification
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Visual inspection confirms pothole on arterial road."
                        value={officerNote}
                        onChange={(e) => setOfficerNote(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      onClick={() => handleOfficerDecision('approve')}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      ✓ Approve AI Categorization
                    </button>
                    <button
                      onClick={() => handleOfficerDecision('override')}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      ✎ Override Category ({actionCategory})
                    </button>
                    <button
                      onClick={() => handleOfficerDecision('mark_duplicate')}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                      🧩 Confirm As Duplicate
                    </button>
                    {selectedIncident.resolutionVerification && (
                      <>
                        <button
                          onClick={() => handleOfficerDecision('resolve')}
                          disabled={isSubmitting}
                          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 transition-colors disabled:opacity-50"
                        >
                          ★ Close Ticket (Resolved)
                        </button>
                        <button
                          onClick={() => handleOfficerDecision('rework')}
                          disabled={isSubmitting}
                          className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-colors disabled:opacity-50"
                        >
                          ↺ Require Rework
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIValidation;
