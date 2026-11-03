import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMccStore } from '../../store/mccStore';
import { backendService } from '../../services/backendService';
import {
  CheckCircle, XCircle, ArrowLeft, Upload, Send,
  AlertTriangle, RefreshCw, CheckCircle2,
  FileText, ShieldCheck
} from 'lucide-react';

const RepairVerification: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { incidents } = useMccStore();

  const [task, setTask] = useState<any>(null);
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [, setVerificationData] = useState<any>(null);

  const [summary, setSummary] = useState('');
  const [materials, setMaterials] = useState('');
  const [observations, setObservations] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const taskId = id || '';

  // 1. Load full persistent state from PostgreSQL
  const loadTaskState = async () => {
    if (!taskId) return;
    setIsLoading(true);
    try {
      // 1.1 Fetch incident record
      const incRes = await fetch(`/api/v1/incidents/${encodeURIComponent(taskId)}`);
      let incData = null;
      if (incRes.ok) {
        const json = await incRes.json();
        incData = json.data;
        setTask(incData);
      } else {
        const found = incidents.find(i => i.id === taskId || (i as any).incidentCode === taskId);
        if (found) setTask(found);
      }

      // 1.2 Fetch persistent evidence records
      const ev = await backendService.getTaskEvidence(taskId);
      setEvidenceList(ev);

      // 1.3 Fetch persistent checklist from PostgreSQL
      const chk = await backendService.getTaskChecklist(taskId);
      setChecklist(chk);

      // 1.4 Fetch verification state & existing submission
      const verif = await backendService.getTaskVerification(taskId);
      if (verif) {
        setVerificationData(verif);
        if (verif.submission) {
          setSubmissionFeedback(verif.submission);
          if (verif.submission.summary && !summary) {
            setSummary(verif.submission.summary);
          }
          if (verif.submission.materials && !materials) {
            setMaterials(verif.submission.materials);
          }
          if (verif.submission.observations && !observations) {
            setObservations(verif.submission.observations);
          }
        } else if (incData?.resolutionDescription && !summary) {
          setSummary(incData.resolutionDescription);
        }
      }
    } catch (err: any) {
      console.error('[RepairVerification] Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTaskState();
  }, [taskId]);

  // 2. Dynamic Readiness Calculations
  const isTaskCompleted = Boolean(
    task?.status === 'Completed' ||
    (task?.currentStage && task.currentStage >= 3) ||
    submissionFeedback?.status != null ||
    task?.status === 'Resolved'
  );

  const mandatoryItems = checklist.filter(i => i.required);
  const checklistDone = mandatoryItems.length > 0 && mandatoryItems.every(i => i.isCompleted);

  // Before photo check: either uploaded as 'Before Work', type INITIAL, or initial citizen complaint photo exists
  const hasBeforePhoto = evidenceList.some(e => {
    const meta = e.metadata || {};
    const cat = (meta.category || '').toLowerCase();
    return cat.includes('before') || e.type === 'INITIAL';
  }) || Boolean(task?.evidence);

  // After photo check: uploaded as 'After Work' or type RESOLUTION
  const hasAfterPhoto = evidenceList.some(e => {
    const meta = e.metadata || {};
    const cat = (meta.category || '').toLowerCase();
    return cat.includes('after') || e.type === 'RESOLUTION';
  });

  const hasSummary = summary.trim().length > 10;

  const readiness = {
    statusCompleted: isTaskCompleted,
    checklistDone,
    hasBeforePhoto,
    hasAfterPhoto,
    hasSummary,
  };

  const isReady = Object.values(readiness).every(v => v === true);

  // 3. Checklist Item Toggle Handler
  const handleToggleChecklist = async (itemId: string, currentCompleted: boolean) => {
    const updated = checklist.map(item =>
      item.id === itemId ? { ...item, isCompleted: !currentCompleted } : item
    );
    setChecklist(updated);
    try {
      await backendService.updateTaskChecklist(taskId, updated);
    } catch (err) {
      console.error('Failed to persist checklist:', err);
      // Revert on error
      setChecklist(checklist);
    }
  };

  // 4. Mark Work Completed Handler (for Task Status requirement)
  const handleMarkCompleted = async () => {
    try {
      const res = await fetch(`/api/v1/incidents/${encodeURIComponent(taskId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'InProgress',
          stage: 3,
          currentStage: 3,
          note: 'Field crew marked work completed. Ready for repair verification.'
        })
      });
      if (res.ok) {
        setTask((prev: any) => ({ ...prev, currentStage: 3 }));
        setStatusMessage('Work status marked as Completed. Ready for submission.');
      }
    } catch (err) {
      console.error('Failed to mark completed:', err);
    }
  };

  // 5. Submit for Verification Handler
  const handleSubmission = async () => {
    if (!isReady) {
      alert('Please complete all readiness requirements before submitting.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const evidenceIds = evidenceList.map(e => e.id);
      const submission = await backendService.submitTaskVerification(taskId, {
        summary: summary.trim(),
        materials: materials.trim(),
        observations: observations.trim(),
        evidenceIds,
      });

      setSubmissionFeedback(submission);
      setStatusMessage('Work submitted for verification successfully! Awaiting department officer approval.');

      // Reload fresh data from PostgreSQL
      await loadTaskState();
    } catch (err: any) {
      alert(`Submission error: ${err.message || 'Server error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-16 text-center space-y-4 max-w-xl mx-auto staff-portal">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
        <p className="text-slate-600 font-semibold">Retrieving persistent task verification data from PostgreSQL...</p>
      </div>
    );
  }

  const currentReviewStatus = submissionFeedback?.status || (task?.status === 'Resolved' ? 'Approved' : 'Pending Submission');

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 staff-portal">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(`/staff/task/${taskId}`)}
            className="p-2.5 hover:bg-slate-100 rounded-2xl transition-colors text-slate-500 border border-slate-200"
            title="Return to Task Details"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black uppercase text-blue-600 tracking-wider">
                Task {task?.incidentCode || taskId}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-bold">{task?.category || 'Civic Infrastructure'}</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Repair Verification</h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadTaskState}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
            title="Reload from PostgreSQL"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="flex items-center space-x-2 px-4 py-2 bg-white rounded-full border border-slate-200 shadow-xs">
            <span className={`w-2.5 h-2.5 rounded-full ${
              currentReviewStatus === 'Approved' ? 'bg-emerald-500 animate-pulse' :
              currentReviewStatus === 'Rework Required' ? 'bg-rose-500 animate-pulse' :
              currentReviewStatus === 'Pending' ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'
            }`} />
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
              {currentReviewStatus === 'Pending' ? 'Awaiting Officer Review' : currentReviewStatus}
            </span>
          </div>
        </div>
      </div>

      {/* STATUS BANNER NOTICES */}
      {statusMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm flex items-center space-x-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{statusMessage}</span>
        </div>
      )}

      {/* Rework Request Banner (If Officer Requested Rework) */}
      {submissionFeedback?.status === 'Rework Required' && (
        <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
          <div className="flex items-center space-x-2 text-rose-800 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>Officer Requested Rework on this Task</span>
          </div>
          <p className="text-xs text-rose-700 font-medium">
            Remarks: "{submissionFeedback?.officerFeedback?.note || 'Please perform additional leveling and upload clear after-repair photograph.'}"
          </p>
          {submissionFeedback?.officerFeedback?.corrections?.length > 0 && (
            <ul className="list-disc list-inside text-xs text-rose-700 space-y-0.5 pl-2">
              {submissionFeedback.officerFeedback.corrections.map((c: string, idx: number) => (
                <li key={idx}>{c}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* AI Verification Badge (If available) */}
      {submissionFeedback?.aiVerification && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between text-xs text-blue-900">
          <div className="flex items-center space-x-3">
            <span className="text-xl">🤖</span>
            <div>
              <p className="font-bold">
                Person 2 AI Vision: {submissionFeedback.aiVerification.statusLabel || submissionFeedback.aiVerification.verdict}
                {submissionFeedback.aiVerification.confidence && ` (${Math.round(submissionFeedback.aiVerification.confidence * 100)}% confidence)`}
              </p>
              <p className="text-blue-700 text-[11px] mt-0.5">{submissionFeedback.aiVerification.explanation}</p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg font-bold text-[10px] uppercase">
            AI Verified
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: READINESS CHECKLIST (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span>Readiness Check</span>
              </h3>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                isReady ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}>
                {isReady ? 'Ready to Submit' : 'Action Required'}
              </span>
            </div>

            <div className="space-y-3">
              {/* Item 1: Task Status */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Task Status: Completed</span>
                  {readiness.statusCompleted ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                </div>
                {!readiness.statusCompleted && (
                  <button
                    onClick={handleMarkCompleted}
                    className="w-full py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-[11px] font-bold transition-all text-center border border-blue-200"
                  >
                    ✓ Mark Work Completed (Stage 3)
                  </button>
                )}
              </div>

              {/* Item 2: Mandatory Checklist */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Mandatory Checklist Items</span>
                  {readiness.checklistDone ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                </div>
                <div className="space-y-1.5 pt-1">
                  {checklist.map(item => (
                    <label
                      key={item.id}
                      className="flex items-center space-x-2 text-[11px] cursor-pointer hover:bg-white p-1 rounded-lg transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={item.isCompleted}
                        onChange={() => handleToggleChecklist(item.id, item.isCompleted)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                      />
                      <span className={`flex-1 ${item.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700 font-medium'}`}>
                        {item.label}
                      </span>
                      {item.required && !item.isCompleted && (
                        <span className="text-[9px] font-black text-rose-500 uppercase">Req</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Item 3: Before Photo */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-700">"Before" Photograph</span>
                  {!readiness.hasBeforePhoto && (
                    <p className="text-[10px] text-slate-400">Required initial condition photo</p>
                  )}
                </div>
                {readiness.hasBeforePhoto ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                ) : (
                  <button
                    onClick={() => navigate(`/staff/task/${taskId}/upload`)}
                    className="text-[11px] font-bold text-blue-600 hover:underline flex items-center space-x-1"
                  >
                    <span>Upload</span> &rarr;
                  </button>
                )}
              </div>

              {/* Item 4: After Photo */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-700">"After" Photograph</span>
                  {!readiness.hasAfterPhoto && (
                    <p className="text-[10px] text-slate-400">Required completed repair photo</p>
                  )}
                </div>
                {readiness.hasAfterPhoto ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                ) : (
                  <button
                    onClick={() => navigate(`/staff/task/${taskId}/upload`)}
                    className="text-[11px] font-bold text-blue-600 hover:underline flex items-center space-x-1"
                  >
                    <span>Upload</span> &rarr;
                  </button>
                )}
              </div>

              {/* Item 5: Work Summary */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-700">Work Summary Provided</span>
                  {!readiness.hasSummary && (
                    <p className="text-[10px] text-slate-400">Minimum 10 characters</p>
                  )}
                </div>
                {readiness.hasSummary ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
              </div>
            </div>

            <div className={`p-4 rounded-2xl text-center font-bold text-xs uppercase tracking-wider transition-colors ${
              isReady ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-500'
            }`}>
              {isReady ? 'Ready for Municipal Verification' : 'Requirements Missing (See Above)'}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: WORK SUMMARY & EVIDENCE SUBMISSION (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center space-x-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Work Completion Summary & Materials</span>
            </h3>

            {/* Summary Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Work Performed & Observations *</span>
                <span className="text-[10px] text-slate-400 font-normal">{summary.length} characters</span>
              </label>
              <textarea
                value={summary}
                onChange={e => setSummary(e.target.value)}
                placeholder="Describe the physical repairs performed, compaction technique, leveling, and site safety observations..."
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm h-28 transition-all"
              />
            </div>

            {/* Materials Used & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Materials Used</label>
                <input
                  type="text"
                  value={materials}
                  onChange={e => setMaterials(e.target.value)}
                  placeholder="e.g. Hot-Mix Asphalt Type II (45kg)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Additional Observations</label>
                <input
                  type="text"
                  value={observations}
                  onChange={e => setObservations(e.target.value)}
                  placeholder="e.g. Surface dry; traffic restored"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
            </div>

            {/* Attached Evidence Grid */}
            <div className="space-y-3 border-t border-slate-100 pt-5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Attached Evidence ({evidenceList.length})</span>
                </h4>
                <button
                  type="button"
                  onClick={() => navigate(`/staff/task/${taskId}/upload`)}
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center space-x-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload More Photos</span>
                </button>
              </div>

              {evidenceList.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {evidenceList.map((ev, i) => {
                    const meta = ev.metadata || {};
                    const cat = meta.category || (ev.type === 'INITIAL' ? 'Before Work' : 'After Work');
                    const isAfter = cat.toLowerCase().includes('after') || ev.type === 'RESOLUTION';
                    return (
                      <div key={i} className="aspect-video rounded-xl overflow-hidden border border-slate-200 relative group bg-slate-100">
                        <img
                          src={ev.url}
                          alt="Evidence"
                          className="w-full h-full object-cover"
                          onError={(e: any) => { e.target.src = '/test_evidence/pothole_original.jpg'; }}
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-between text-white text-[10px]">
                          <span className={`font-bold self-start px-1.5 py-0.5 rounded text-[9px] ${
                            isAfter ? 'bg-emerald-600' : 'bg-blue-600'
                          }`}>
                            {cat}
                          </span>
                          <span className="truncate">{meta.fileName || `Photo #${i + 1}`}</span>
                        </div>
                        <span className={`absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-white ${
                          isAfter ? 'bg-emerald-600' : 'bg-blue-600'
                        }`}>
                          {cat}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 italic text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  No photographs uploaded yet. Click "Upload More Photos" to attach before and after completion photos.
                </div>
              )}
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex space-x-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => navigate(`/staff/task/${taskId}`)}
                className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all text-center"
              >
                Back to Task
              </button>
              <button
                type="button"
                onClick={handleSubmission}
                disabled={!isReady || isSubmitting}
                className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-center space-x-2 shadow-lg ${
                  isReady && !isSubmitting
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 active:scale-95'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Transmitting to PostgreSQL...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit for Verification</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepairVerification;
