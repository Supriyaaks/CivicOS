import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCitizenStore } from '../../store/citizenStore';
import { processReportWithAI, checkAIHealth, AIConnectionError } from '../../services/aiService';
import { uploadEvidenceImage } from '../../services/storageService';
import { AIReportProcessingResult } from '../../types/ai';
import { CivicOSMap } from '../../components/CivicOSMap';

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
  'Other',
];

const ReportProblem: React.FC = () => {
  const navigate = useNavigate();
  const { addComplaint, addNotification, complaints } = useCitizenStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [step, setStep] = useState<'form' | 'review' | 'analyzing' | 'success'>('form');
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    location: '',
  });
  const [latitude, setLatitude] = useState<number>(12.9716);
  const [longitude, setLongitude] = useState<number>(77.5946);
  const [locStatus, setLocStatus] = useState<string>('Default city center');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // AI Pipeline State
  const [aiResult, setAiResult] = useState<AIReportProcessingResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiProcessingStage, setAiProcessingStage] = useState<string>('');
  const [submittedComplaintId, setSubmittedComplaintId] = useState<string>('');
  const [aiServiceAvailable, setAiServiceAvailable] = useState<boolean>(true);

  // Check AI health on mount
  useEffect(() => {
    checkAIHealth().then(status => {
      setAiServiceAvailable(status.orchestrator_ready);
    });
  }, []);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocStatus('Geolocation not supported by your browser');
      return;
    }
    setLocStatus('Acquiring GPS coordinates...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(Number(pos.coords.latitude.toFixed(6)));
        setLongitude(Number(pos.coords.longitude.toFixed(6)));
        setLocStatus(`GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
      },
      (err) => {
        setLocStatus('Using default location (GPS permission denied)');
        console.warn('Geolocation error:', err.message);
      },
      { timeout: 5000 }
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const validFiles: File[] = [];
      const newPreviews: string[] = [];

      filesArray.forEach(file => {
        const isValidType = file.type.startsWith('image/');
        const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit

        if (isValidType && isValidSize) {
          validFiles.push(file);
          newPreviews.push(URL.createObjectURL(file));
        }
      });

      setImages([...images, ...validFiles]);
      setPreviews([...previews, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    const updatedImages = [...images];
    const updatedPreviews = [...previews];
    updatedImages.splice(index, 1);
    updatedPreviews.splice(index, 1);
    setImages(updatedImages);
    setPreviews(updatedPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'form') {
      setStep('review');
      return;
    }

    if (step === 'review') {
      if (isSubmitting) return;
      setIsSubmitting(true);
      setSubmissionError(null);
      setStep('analyzing');
      setAiError(null);
      setAiProcessingStage('Initializing CivicOS AI Orchestrator...');

      const assignedId = `CIV-${Math.floor(1000 + Math.random() * 9000)}`;
      let processingResult: AIReportProcessingResult | null = null;

      // 1. If image is available, invoke Person 2's AI Orchestrator
      if (images.length > 0) {
        try {
          setAiProcessingStage('Running Multi-Modal Detectors (Urban, Litter, Road Damage)...');

          // Pass recent complaints for duplicate checking
          const existingReportsPayload = complaints.map(c => ({
            report_id: c.id,
            reported_category: c.category,
            latitude: 12.9716,
            longitude: 77.5946,
            timestamp: c.date ? `${c.date}T12:00:00` : new Date().toISOString()
          }));

          processingResult = await processReportWithAI({
            image: images[0],
            category: formData.category,
            reportId: assignedId,
            latitude,
            longitude,
            timestamp: new Date().toISOString().replace(/\.\d+Z$/, ''),
            existingReports: existingReportsPayload
          });

          setAiResult(processingResult);
          setAiProcessingStage('AI Verification & Duplicate Check Complete.');
        } catch (err: any) {
          console.warn('[ReportProblem] AI Processing encountered an error:', err);
          setAiError(
            err instanceof AIConnectionError
              ? 'CivicOS AI service is offline. Report will proceed with manual officer review.'
              : `AI processing notice: ${err.message}`
          );
        }
      } else {
        setAiProcessingStage('Saving complaint details...');
      }

      // 2. Upload evidence to storage and persist complaint in store
      try {
        let evidenceUrl = previews[0] || 'No image uploaded';
        if (images.length > 0) {
          try {
            setAiProcessingStage('Securing evidence photograph...');
            const storageRes = await uploadEvidenceImage(images[0], assignedId);
            evidenceUrl = storageRes.url;
          } catch (storageErr) {
            console.warn('[ReportProblem] Evidence storage fallback used:', storageErr);
          }
        }

        const isDuplicate = processingResult?.duplicates &&
          !Array.isArray(processingResult.duplicates) &&
          processingResult.duplicates.recommendation === 'duplicate';

        const rddCount = processingResult?.rdd_detection?.detections?.length || 0;
        const litterCount = processingResult?.litter_detection?.total_detected || 0;

        setAiProcessingStage('Persisting complaint record and dispatching to municipal queue...');

        await addComplaint({
          id: assignedId,
          category: formData.category,
          description: formData.description,
          location: formData.location || `${locStatus}`,
          evidence: evidenceUrl,
          evidenceDate: new Date().toISOString().split('T')[0],
          status: 'Pending',
          aiResults: processingResult || undefined,
          aiVerificationStatus: processingResult?.verification?.status || 'pending',
          aiConfidence: processingResult?.verification?.confidence,
          detectedCategory: processingResult?.verification?.detected_category || undefined,
          isDuplicate: Boolean(isDuplicate),
          rddDetected: rddCount > 0,
          litterDetected: litterCount > 0,
        });

        // Non-blocking notification
        try {
          await addNotification({
            title: 'Complaint Submitted',
            message: processingResult?.verification?.explanation ||
              `Your complaint ${assignedId} has been successfully submitted and is queued for verification.`,
            complaintId: assignedId,
            category: 'Progress',
            date: new Date().toISOString(),
            read: false,
          });
        } catch (notifErr) {
          console.warn('[ReportProblem] Notification skipped:', notifErr);
        }

        setSubmittedComplaintId(assignedId);
        (window as any).lastSubmittedComplaintId = assignedId;
        setStep('success');
      } catch (err: any) {
        console.error('[ReportProblem] Error storing complaint:', err);
        setSubmissionError(err?.message || 'Failed to save complaint. Please try again.');
        setStep('review');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // ----------------------------------------------------
  // Render: Analyzing State
  // ----------------------------------------------------
  if (step === 'analyzing') {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-6">
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-blue-100 animate-ping"></div>
          <div className="relative w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl shadow-lg">
            🤖
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">Processing Your Civic Report</h2>
          <p className="text-sm text-gray-500 font-medium animate-pulse">{aiProcessingStage}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left max-w-md mx-auto space-y-3">
          <div className="flex items-center space-x-3 text-xs text-slate-600">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
            <span>Urban Community 6-Class Detection</span>
          </div>
          <div className="flex items-center space-x-3 text-xs text-slate-600">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
            <span>Mini-TACO50 Litter Detection</span>
          </div>
          <div className="flex items-center space-x-3 text-xs text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>RDD Synthetic Road Damage Detection</span>
          </div>
          <div className="flex items-center space-x-3 text-xs text-slate-600">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            <span>Spatial & Temporal Duplicate Verification</span>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // Render: Success State with AI Result Display
  // ----------------------------------------------------
  if (step === 'success') {
    const complaintId = submittedComplaintId || (window as any).lastSubmittedComplaintId || 'CIV-XXXX';
    const verification = aiResult?.verification;
    const duplicates = aiResult?.duplicates;
    const isDuplicate = duplicates && !Array.isArray(duplicates) && duplicates.recommendation === 'duplicate';
    const isReviewDuplicate = duplicates && !Array.isArray(duplicates) && duplicates.recommendation === 'needs_review';
    const litter = aiResult?.litter_detection;
    const rdd = aiResult?.rdd_detection;

    return (
      <div className="max-w-3xl mx-auto space-y-6 py-10 px-4">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl shadow-sm mx-auto">
            ✓
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Complaint Successfully Filed!</h1>
          <p className="text-gray-600 max-w-lg mx-auto">
            Your report has been received and processed by the CivicOS platform.
          </p>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 inline-block">
            <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Complaint Reference</p>
            <p className="text-2xl font-mono font-bold text-blue-600">{complaintId}</p>
          </div>
        </div>

        {/* AI System Results Card */}
        {aiResult ? (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
                <span>🤖</span>
                <span>CivicOS AI Verification Summary</span>
              </h2>
              <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                AI Processed
              </span>
            </div>

            {/* A. Verification Result */}
            {verification && (
              <div className={`p-4 rounded-xl border ${
                verification.status === 'verified'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : verification.status === 'mismatch'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-base">
                        {verification.status === 'verified' ? '✅' : verification.status === 'mismatch' ? '⚠️' : '🔍'}
                      </span>
                      <p className="text-sm font-bold uppercase tracking-wider">
                        {verification.status === 'verified'
                          ? 'Incident Category Verified'
                          : verification.status === 'mismatch'
                          ? 'Category Discrepancy Flagged'
                          : 'Human Inspection Required'}
                      </p>
                    </div>
                    <p className="text-sm font-medium leading-relaxed">{verification.explanation}</p>
                  </div>
                  {verification.confidence > 0 && (
                    <div className="text-right pl-4">
                      <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Confidence</p>
                      <p className="text-lg font-bold font-mono">
                        {(verification.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* B. Duplicate Incident Notification */}
            {isDuplicate ? (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl text-orange-900 space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-base">📑</span>
                  <p className="text-sm font-bold uppercase tracking-wider">Potential Duplicate Incident</p>
                </div>
                <p className="text-sm">
                  A matching complaint was recently submitted near this location. Your report has been attached to the cluster for coordinated resolution.
                </p>
              </div>
            ) : isReviewDuplicate ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Duplicate Check</p>
                <p className="text-sm">
                  Nearby reports detected. A municipal officer will verify if this is an extension of an existing issue.
                </p>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                <span>📍</span>
                <span>Duplicate Check: Unique incident location recorded.</span>
              </div>
            )}

            {/* C. Model Detections Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              {/* Urban Community 6-Class */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="font-bold text-slate-700">Urban Community Detector</p>
                <p className="text-slate-600">
                  {aiResult.detection?.detection_count > 0
                    ? `Detected ${aiResult.detection.detection_count} issue(s)`
                    : 'No prominent hazards in primary detector'}
                </p>
              </div>

              {/* Mini-TACO50 Litter Detector */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="font-bold text-slate-700">Mini-TACO50 Litter Detector</p>
                <p className="text-slate-600">
                  {litter?.total_detected && litter.total_detected > 0
                    ? `Detected ${litter.total_detected} litter item(s)`
                    : 'No loose litter detected'}
                </p>
              </div>

              {/* RDD Synthetic Road Damage Detector */}
              {rdd && rdd.detections && rdd.detections.length > 0 && (
                <div className="sm:col-span-2 p-3 bg-purple-50 rounded-xl border border-purple-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-purple-900">RDD Road Damage Detector</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-200 text-purple-800 font-semibold">
                      Experimental (Synthetic Model)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {rdd.detections.map((d, i) => (
                      <span key={i} className="px-2 py-0.5 bg-white text-purple-800 rounded border border-purple-200 text-[11px] font-medium">
                        {d.class_name} ({(d.confidence * 100).toFixed(0)}%)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : aiError ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm space-y-1">
            <p className="font-bold">Offline AI Fallback Notice</p>
            <p>{aiError}</p>
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <button
            onClick={() => navigate(`/citizen/complaint/${complaintId}`)}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            Track Complaint Status &rarr;
          </button>
          <button
            onClick={() => navigate('/citizen')}
            className="w-full sm:w-auto px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // Render: Review State
  // ----------------------------------------------------
  if (step === 'review') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Review Your Report</h1>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Category</label>
              <p className="text-lg font-medium text-gray-900">{formData.category || 'Not selected'}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Description</label>
              <p className="text-gray-700 leading-relaxed">{formData.description || 'No description provided'}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Location & Coordinates</label>
              <p className="text-gray-900">{formData.location || 'No location provided'}</p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">GPS: {latitude}, {longitude}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Evidence Photos ({images.length})</label>
              <div className="flex flex-wrap gap-3 mt-2">
                {previews.length > 0 ? (
                  previews.map((src, i) => (
                    <img key={i} src={src} alt={`preview ${i}`} className="w-24 h-24 object-cover rounded-lg border border-gray-200" />
                  ))
                ) : (
                  <p className="text-sm text-gray-400 italic">No photos uploaded</p>
                )}
              </div>
            </div>
          </div>

          {submissionError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm space-y-2">
              <div className="flex items-center space-x-2 font-semibold text-red-900">
                <span>⚠️</span>
                <span>Submission Issue Encountered</span>
              </div>
              <p className="text-xs text-red-700 leading-relaxed">{submissionError}</p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  Retry Submission
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-6 border-t border-gray-100">
            <button
              onClick={() => setStep('form')}
              className="px-6 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              &larr; Edit Information
            </button>
            <button
              onClick={handleSubmit}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm"
            >
              Confirm & Submit &rarr;
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // Render: Form State (Step 1)
  // ----------------------------------------------------
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Report a Problem</h1>
        <div className="flex items-center space-x-2">
          <span className={`w-2.5 h-2.5 rounded-full ${aiServiceAvailable ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
          <span className="text-xs text-gray-500">
            {aiServiceAvailable ? 'AI Online' : 'AI Offline (Manual Mode)'}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 space-y-6">
        {/* A. Category */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">Problem Category</label>
          <select
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required
          >
            <option value="">Select a category</option>
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        {/* B. Description */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-semibold text-gray-700">Description</label>
            <span className={`text-xs ${formData.description.length > 500 ? 'text-red-500' : 'text-gray-400'}`}>
              {formData.description.length}/500
            </span>
          </div>
          <textarea
            className="w-full p-3 border border-gray-300 rounded-xl h-32 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            placeholder="Please describe the issue in detail. Include landmarks or specific details that will help crews find the problem."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            maxLength={500}
            required
          ></textarea>
        </div>

        {/* C. Location */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-semibold text-gray-700">Location & Interactive Map Pin</label>
            <button
              type="button"
              onClick={handleGetLocation}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
            >
              <span>📍 Detect My Location</span>
            </button>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Enter address, intersection or landmark"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              required
            />

            {/* Interactive OpenStreetMap Pinpoint Map */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>Click map to pinpoint incident location:</span>
                <span className="font-mono text-slate-700 font-semibold">{latitude.toFixed(5)}, {longitude.toFixed(5)}</span>
              </div>
              <CivicOSMap
                center={[latitude, longitude]}
                zoom={14}
                pickerMode={true}
                selectedLocation={[latitude, longitude]}
                onLocationSelect={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                  setLocStatus(`Pinned: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
                  if (!formData.location || formData.location.startsWith('Pinned:') || formData.location.startsWith('Near ')) {
                    setFormData(prev => ({ ...prev, location: `Near ${lat.toFixed(4)}, ${lng.toFixed(4)}` }));
                  }
                }}
                height="220px"
              />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-600">
              <span className="font-medium">{locStatus}</span>
              <span className="font-mono text-slate-400">{latitude.toFixed(4)}, {longitude.toFixed(4)}</span>
            </div>
          </div>
        </div>

        {/* D. Photos */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">Photos & Evidence</label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="mt-1 flex justify-center px-6 py-10 border-2 border-gray-300 border-dashed rounded-2xl hover:border-blue-400 transition-colors cursor-pointer bg-gray-50"
          >
            <div className="space-y-2 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-4.72-4.72a4 4 0 00-5.66 0L28 12m0 0V8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-blue-600">Upload photos</span>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP up to 10MB</p>
              </div>
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            accept="image/*"
            onChange={handleImageChange}
          />

          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mt-4">
              {previews.map((src, i) => (
                <div key={i} className="relative group">
                  <img src={src} alt="preview" className="w-full h-24 object-cover rounded-lg border border-gray-200" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={() => navigate('/citizen')}
            className="px-6 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
          >
            Review Report &rarr;
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReportProblem;
