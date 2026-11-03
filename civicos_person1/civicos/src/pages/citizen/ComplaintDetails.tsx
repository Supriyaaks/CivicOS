import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCitizenStore, Complaint } from '../../store/citizenStore';

const TIMELINE_STAGES = [
  { label: 'Report Submitted', description: 'Initial report received by CivicOS' },
  { label: 'AI Verification', description: 'AI analyzing validity, duplicates and damage severity' },
  { label: 'Department Assigned', description: 'Issue routed to responsible department' },
  { label: 'Work In Progress', description: 'Maintenance crews dispatched to site' },
  { label: 'Work Completed', description: 'Field work reported as finished' },
  { label: 'AI Resolution Verification', description: 'AI verifying fix against original report' },
  { label: 'Citizen Confirmation', description: 'Awaiting your final sign-off' },
  { label: 'Complaint Closed', description: 'Issue successfully resolved and closed' },
];

const ComplaintDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { complaints, confirmResolution } = useCitizenStore();
  const [confirmationStatus, setConfirmationStatus] = useState<string | null>(null);
  const [fetchedIncident, setFetchedIncident] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (!complaints.find(c => c.id === id) && id) {
      setLoading(true);
      fetch(`/api/v1/incidents/${encodeURIComponent(id)}`)
        .then(res => res.json())
        .then(json => {
          if (json?.data) setFetchedIncident(json.data);
        })
        .catch(err => console.error('Failed to load incident:', err))
        .finally(() => setLoading(false));
    }
  }, [id, complaints]);

  const complaint: Complaint | null = complaints.find(c => c.id === id) || (fetchedIncident ? ({
    id: fetchedIncident.incidentCode || fetchedIncident.id,
    category: fetchedIncident.category,
    description: fetchedIncident.description,
    location: fetchedIncident.location,
    status: (fetchedIncident.status === 'InProgress' ? 'In Progress' : (fetchedIncident.status || 'Pending')) as any,
    currentStage: fetchedIncident.currentStage || (fetchedIncident.status === 'Resolved' ? 6 : fetchedIncident.status === 'InProgress' ? 4 : 2),
    date: new Date(fetchedIncident.createdAt).toLocaleDateString(),
    department: fetchedIncident.department?.name || 'Roads & Infrastructure',
    priority: fetchedIncident.priority,
    severity: fetchedIncident.severity,
    latitude: fetchedIncident.latitude,
    longitude: fetchedIncident.longitude,
    evidence: fetchedIncident.evidenceUrl || (fetchedIncident.evidence?.[0]?.url),
    evidenceDate: fetchedIncident.createdAt ? new Date(fetchedIncident.createdAt).toLocaleDateString() : undefined,
    resolutionDate: fetchedIncident.resolvedAt ? new Date(fetchedIncident.resolvedAt).toLocaleDateString() : undefined,
    resolutionDescription: fetchedIncident.resolutionDescription,
    resolutionEvidence: fetchedIncident.resolutionEvidence || fetchedIncident.resolutionEvidenceUrl,
    aiVerificationStatus: fetchedIncident.aiVerificationStatus || (fetchedIncident.aiVerified ? 'verified' : undefined),
    aiConfidence: fetchedIncident.aiConfidence,
    detectedCategory: fetchedIncident.aiDetectedCategory,
  } as Complaint) : null);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20 space-y-4">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-gray-500 font-medium">Retrieving incident record from municipal database...</p>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Complaint Not Found</h1>
        <p className="text-gray-500">The requested complaint ID {id} does not exist in our records.</p>
        <button onClick={() => navigate('/citizen/my-complaints')} className="text-blue-600 font-medium">
          Return to My Complaints
        </button>
      </div>
    );
  }

  const handleConfirm = (confirmed: boolean) => {
    confirmResolution(complaint.id, confirmed);
    setConfirmationStatus(confirmed ? 'confirmed' : 'rejected');
  };

  const aiResults = complaint.aiResults;
  const verification = aiResults?.verification;
  const resolutionAI = complaint.resolutionVerification?.resolution;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Complaint Details</h1>
        <button
          onClick={() => navigate('/citizen/my-complaints')}
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; Back to list
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* A. General Information */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">General Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Complaint ID</p>
                <p className="font-bold text-gray-900">{complaint.id}</p>
              </div>
              <div>
                <p className="text-gray-500">Category</p>
                <p className="font-medium text-gray-900">{complaint.category}</p>
              </div>
              <div>
                <p className="text-gray-500">Date Submitted</p>
                <p className="font-medium text-gray-900">{complaint.date}</p>
              </div>
              <div>
                <p className="text-gray-500">Current Status</p>
                <span className={`px-2 py-1 text-xs rounded-full inline-block ${
                  complaint.status === 'Resolved' ? 'bg-green-100 text-green-700' :
                  complaint.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {complaint.status}
                </span>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500">Location</p>
                <p className="font-medium text-gray-900">{complaint.location}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500">Description</p>
                <p className="text-gray-700 leading-relaxed">{complaint.description}</p>
              </div>
            </div>
          </div>

          {/* B. AI Verification Summary Banner */}
          {complaint.aiVerificationStatus && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-2">
                  <span>🤖</span>
                  <span>AI Verification Assessment</span>
                </h3>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  complaint.aiVerificationStatus === 'verified'
                    ? 'bg-green-100 text-green-800'
                    : complaint.aiVerificationStatus === 'mismatch'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {complaint.aiVerificationStatus === 'verified' ? 'Verified Match' :
                   complaint.aiVerificationStatus === 'mismatch' ? 'Category Mismatch' : 'Needs Review'}
                </span>
              </div>

              <p className="text-sm text-slate-700">
                {verification?.explanation ||
                  `AI has assessed this complaint. Status: ${complaint.aiVerificationStatus}.`}
              </p>

              {complaint.aiConfidence !== undefined && complaint.aiConfidence > 0 && (
                <div className="flex items-center space-x-4 text-xs text-slate-500 pt-1">
                  <span>Confidence: <strong className="text-slate-800">{(complaint.aiConfidence * 100).toFixed(0)}%</strong></span>
                  {complaint.detectedCategory && (
                    <span>Detected Class: <strong className="text-slate-800">{complaint.detectedCategory}</strong></span>
                  )}
                  {complaint.isDuplicate && (
                    <span className="text-amber-600 font-semibold">⚠️ Potential Nearby Duplicate</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* C. Department Assignment */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Department Assignment</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Assigned Department</p>
                <p className="font-medium text-gray-900">{complaint.department || 'Roads & Infrastructure Maintenance'}</p>
              </div>
              <div>
                <p className="text-gray-500">Assignment Date</p>
                <p className="font-medium text-gray-900">{complaint.assignmentDate || 'Auto-Routed by AI'}</p>
              </div>
            </div>
          </div>

          {/* D. Resolution Progress Timeline */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Resolution Progress</h3>
            <div className="space-y-6">
              {TIMELINE_STAGES.map((stage, i) => {
                const currentStageNum = complaint.currentStage || 1;
                const isCompleted = i < currentStageNum;
                const isCurrent = i === currentStageNum;

                return (
                  <div key={i} className="flex items-start space-x-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 text-xs font-bold ${
                        isCompleted ? 'bg-green-500 text-white' :
                        isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {isCompleted ? '✓' : i + 1}
                      </div>
                      {i < TIMELINE_STAGES.length - 1 && (
                        <div className={`w-0.5 h-10 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center space-x-2">
                        <p className={`text-sm font-bold ${isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400'}`}>
                          {stage.label}
                        </p>
                        {i === 1 && complaint.aiVerificationStatus && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            complaint.aiVerificationStatus === 'verified' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {complaint.aiVerificationStatus}
                          </span>
                        )}
                        {i === 5 && resolutionAI && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            resolutionAI.status === 'appears_resolved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {resolutionAI.status}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{stage.description}</p>
                      {isCompleted && <p className="text-[10px] text-green-600 font-medium mt-1">✓ Completed</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* F. Citizen Resolution Confirmation */}
          {complaint.status === 'Resolved' && (
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-200 space-y-4">
              <h3 className="text-lg font-bold text-blue-900">Confirm Resolution</h3>
              <p className="text-sm text-blue-700">
                The municipal department has marked this issue as resolved. Please verify if the fix is satisfactory.
              </p>
              {resolutionAI && (
                <div className={`p-3 rounded-xl border text-xs space-y-1 ${
                  resolutionAI.status === 'appears_resolved'
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  <p className="font-bold">AI Resolution Verifier Assessment:</p>
                  <p>{resolutionAI.reason}</p>
                  <p className="italic">Recommendation: {resolutionAI.recommendation}</p>
                </div>
              )}
              {confirmationStatus ? (
                <div className={`p-3 rounded-md text-sm font-medium text-center ${
                  confirmationStatus === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {confirmationStatus === 'confirmed'
                    ? 'Thank you! You have confirmed the resolution.'
                    : 'We have noted that the resolution was not satisfactory. A report has been sent back to the department.'}
                </div>
              ) : (
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleConfirm(true)}
                    className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm"
                  >
                    Confirm Resolution
                  </button>
                  <button
                    onClick={() => handleConfirm(false)}
                    className="flex-1 py-2.5 bg-white text-red-600 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors"
                  >
                    Report Not Resolved
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar: Evidence & AI Details */}
        <div className="space-y-6">
          {/* C. Evidence */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">Original Evidence</h3>
            <div className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200 overflow-hidden">
              {complaint.evidence && (complaint.evidence.startsWith('blob:') || complaint.evidence.startsWith('http') || complaint.evidence.startsWith('data:')) ? (
                <img src={complaint.evidence} alt="Original Evidence" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400 text-xs text-center p-4">
                  {complaint.evidence || 'No image provided'}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">Submitted on {complaint.evidenceDate || complaint.date}</p>
          </div>

          {/* D. AI Model Findings */}
          {aiResults && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">AI Detector Insights</h3>

              {/* Urban Community */}
              <div className="text-xs space-y-1">
                <p className="font-semibold text-slate-700">Urban Community Model</p>
                <p className="text-slate-500">
                  {aiResults.detection?.detection_count > 0
                    ? `Detections: ${aiResults.detection.detection_count}`
                    : 'No class matches in primary detector'}
                </p>
              </div>

              {/* Mini-TACO50 */}
              <div className="text-xs space-y-1 border-t pt-2">
                <p className="font-semibold text-slate-700">Litter Detector (Mini-TACO50)</p>
                <p className="text-slate-500">
                  {aiResults.litter_detection?.total_detected && aiResults.litter_detection.total_detected > 0
                    ? `Detected ${aiResults.litter_detection.total_detected} litter items`
                    : 'Clean / No litter detected'}
                </p>
              </div>

              {/* RDD Synthetic */}
              {aiResults.rdd_detection && aiResults.rdd_detection.detections?.length > 0 && (
                <div className="text-xs space-y-1.5 border-t pt-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-purple-900">Road Damage (RDD)</p>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-bold">
                      Experimental
                    </span>
                  </div>
                  <div className="space-y-1">
                    {aiResults.rdd_detection.detections.map((d: any, i: number) => (
                      <div key={i} className="flex justify-between text-slate-600">
                        <span>{d.class_name}</span>
                        <span className="font-mono">{(d.confidence * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* E. Resolution Details */}
          {complaint.status === 'Resolved' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Resolution Details</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Resolution Date</p>
                  <p className="text-sm font-medium text-gray-900">{complaint.resolutionDate || new Date().toISOString().split('T')[0]}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Work Summary</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{complaint.resolutionDescription || 'Issue addressed and resolved by field operations crew.'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">Completion Proof</p>
                  <div className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200 overflow-hidden">
                    {complaint.resolutionEvidence && (complaint.resolutionEvidence.startsWith('blob:') || complaint.resolutionEvidence.startsWith('http')) ? (
                      <img src={complaint.resolutionEvidence} alt="Completion Proof" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-400 text-xs text-center p-4">
                        {complaint.resolutionEvidence || 'Completion evidence attached'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComplaintDetails;
