import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMccStore, TaskEvidence } from '../../store/mccStore';
import { backendService } from '../../services/backendService';
import { Camera, X, Upload, AlertCircle, CheckCircle2, ArrowRight, Image as ImageIcon, Loader2 } from 'lucide-react';

const UploadEvidence: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { incidents, addCompletionEvidence, addTimelineEntry } = useMccStore();

  const [fetchedTask, setFetchedTask] = useState<any>(null);
  const [existingEvidence, setExistingEvidence] = useState<any[]>([]);
  const [, setIsLoadingExisting] = useState(false);

  const task = incidents.find(inc => inc.id === id || (inc as any).incidentCode === id) || fetchedTask;

  const [selectedFiles, setSelectedFiles] = useState<{
    file: File;
    preview: string;
    category: TaskEvidence['category'];
    description: string;
  }[]>([]);

  const [errors, setErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const VALID_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  // Fetch incident & existing saved evidence from PostgreSQL
  useEffect(() => {
    if (!id) return;
    setIsLoadingExisting(true);

    // 1. Fetch incident record if not in store
    fetch(`/api/v1/incidents/${encodeURIComponent(id)}`)
      .then(res => res.json())
      .then(json => {
        if (json?.data) setFetchedTask(json.data);
      })
      .catch(err => console.warn('[UploadEvidence] Could not fetch incident:', err));

    // 2. Fetch existing evidence from PostgreSQL
    backendService.getTaskEvidence(id)
      .then(evList => {
        setExistingEvidence(evList);
      })
      .catch(err => console.warn('[UploadEvidence] Could not fetch evidence:', err))
      .finally(() => setIsLoadingExisting(false));
  }, [id]);

  const processFiles = (files: File[]) => {
    const newErrors: string[] = [];
    const validFiles: any[] = [];

    files.forEach(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const isFormatOk = VALID_FORMATS.includes(file.type.toLowerCase()) || ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '');

      if (!isFormatOk) {
        newErrors.push(`Invalid format: ${file.name}. Only JPG, PNG, WebP allowed.`);
      } else if (file.size > MAX_FILE_SIZE) {
        newErrors.push(`File too large: ${file.name}. Max 10MB.`);
      } else {
        // Smart default: If before photo already exists, default to 'After Work', otherwise 'After Work'
        validFiles.push({
          file,
          preview: URL.createObjectURL(file),
          category: 'After Work' as TaskEvidence['category'],
          description: ''
        });
      }
    });

    if (newErrors.length > 0) {
      setErrors(prev => [...prev, ...newErrors]);
    }
    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      setUploadSuccess(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeFile = (index: number) => {
    const updated = [...selectedFiles];
    URL.revokeObjectURL(updated[index].preview);
    updated.splice(index, 1);
    setSelectedFiles(updated);
  };

  const updateFileMeta = (index: number, field: 'category' | 'description', value: any) => {
    const updated = [...selectedFiles];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedFiles(updated);
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) {
      alert('Please upload or select at least one photograph.');
      return;
    }

    const missingCategory = selectedFiles.find(f => !f.category);
    if (missingCategory) {
      alert('Please assign an evidence category to all photographs.');
      return;
    }

    const taskId = task?.incidentCode || task?.id || id;
    if (!taskId) return;

    setIsUploading(true);
    setErrors([]);
    setUploadSuccess(null);

    const savedRecords: any[] = [];
    const failedFiles: string[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const item = selectedFiles[i];
      setUploadProgress(`Uploading photograph ${i + 1} of ${selectedFiles.length} (${item.file.name})...`);

      try {
        const savedEvidence = await backendService.uploadTaskEvidence(
          taskId,
          item.file,
          item.category,
          item.description
        );
        savedRecords.push(savedEvidence);

        // Also synchronize in local MCC store for immediate reactive rendering
        addCompletionEvidence(taskId, {
          id: savedEvidence.id,
          url: savedEvidence.url,
          category: item.category,
          description: item.description,
          fileName: item.file.name,
          fileSize: item.file.size,
          fileType: item.file.type,
          timestamp: savedEvidence.timestamp || new Date().toISOString(),
          taskId
        });
      } catch (err: any) {
        console.error(`Upload error for ${item.file.name}:`, err);
        failedFiles.push(`${item.file.name}: ${err.message || 'Server upload failed'}`);
      }
    }

    setIsUploading(false);
    setUploadProgress('');

    if (savedRecords.length > 0) {
      // Add timeline entry
      addTimelineEntry(taskId, {
        timestamp: new Date().toISOString(),
        action: 'Evidence Uploaded',
        user: 'Field Staff',
        note: `Uploaded ${savedRecords.length} photographs to municipal permanent storage.`,
        type: 'EvidenceUploaded'
      });

      // Refresh existing evidence list
      const refreshedList = await backendService.getTaskEvidence(taskId);
      setExistingEvidence(refreshedList);

      // Clean up uploaded previews
      selectedFiles.forEach(f => URL.revokeObjectURL(f.preview));
      setSelectedFiles([]);

      setUploadSuccess(`Successfully saved ${savedRecords.length} evidence photograph(s) in PostgreSQL!`);
    }

    if (failedFiles.length > 0) {
      setErrors(failedFiles);
    }
  };

  const displayTaskId = task?.incidentCode || task?.id || id;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 staff-portal">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-black uppercase rounded-lg">
                Task {displayTaskId}
              </span>
              <span className="text-xs text-slate-400 font-semibold">• Permanent Municipal Record</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Upload Completion Evidence</h1>
            <p className="text-sm text-slate-500">
              Upload photographs demonstrating the completed repair or before-work site conditions.
            </p>
          </div>
          <button
            onClick={() => navigate(`/staff/task/${displayTaskId}`)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Success Notice */}
        {uploadSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm flex items-center justify-between animate-in fade-in">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span className="font-semibold">{uploadSuccess}</span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => navigate(`/staff/task/${displayTaskId}/verification`)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm"
              >
                <span>Proceed to Verification</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Error Notice */}
        {errors.length > 0 && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm space-y-1">
            <div className="flex items-center space-x-2 font-bold">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>Upload Issues</span>
            </div>
            <ul className="list-disc list-inside text-xs space-y-0.5 opacity-90 pl-1">
              {errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        )}

        {/* Drag and Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-3xl p-10 text-center space-y-4 transition-all relative group cursor-pointer ${
            isDragOver
              ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
              : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
          }`}
        >
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            onChange={handleFileChange}
            disabled={isUploading}
          />
          <div className="flex flex-col items-center space-y-3">
            <div className="p-4 bg-white rounded-2xl shadow-sm text-3xl group-hover:scale-110 transition-transform">
              <Camera className="w-10 h-10 text-blue-600" />
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-slate-800">
                Drag & drop photographs here, or <span className="text-blue-600 underline">browse files</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">JPEG, PNG, WebP up to 10MB each</p>
            </div>
          </div>
        </div>

        {/* Selected Files Preview & Category Selection */}
        {selectedFiles.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">
              Selected for Upload ({selectedFiles.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedFiles.map((item, i) => (
                <div key={i} className="flex bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden group hover:border-blue-300 transition-colors">
                  <div className="w-36 h-32 relative bg-slate-200 flex-shrink-0">
                    <img src={item.preview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      disabled={isUploading}
                      className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-80 hover:opacity-100 transition-opacity shadow-lg"
                      title="Remove photograph"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex-1 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 truncate max-w-[140px]">{item.file.name}</span>
                      <span className="text-[10px] text-slate-400">{(item.file.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Evidence Type</label>
                      <select
                        value={item.category}
                        onChange={e => updateFileMeta(i, 'category', e.target.value)}
                        disabled={isUploading}
                        className="w-full p-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="After Work">After Work (Completion Photograph)</option>
                        <option value="Before Work">Before Work (Initial Site Condition)</option>
                        <option value="During Work">During Work (Work in Progress)</option>
                        <option value="Additional Inspection">Additional Inspection</option>
                        <option value="Other">Other Evidence</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Description (e.g. Compaction layer)"
                        value={item.description}
                        onChange={e => updateFileMeta(i, 'description', e.target.value)}
                        disabled={isUploading}
                        className="w-full p-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => navigate(`/staff/task/${displayTaskId}`)}
            disabled={isUploading}
            className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isUploading || selectedFiles.length === 0}
            className={`flex-1 py-3 text-sm font-bold text-white rounded-2xl transition-all shadow-lg flex items-center justify-center space-x-2 ${
              isUploading || selectedFiles.length === 0
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 active:scale-95'
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{uploadProgress || 'Saving to PostgreSQL...'}</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Save Evidence to PostgreSQL</span>
              </>
            )}
          </button>
        </div>

        {/* Existing Saved Evidence Section */}
        {existingEvidence.length > 0 && (
          <div className="border-t border-slate-100 pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <span>Saved Photographs in Database ({existingEvidence.length})</span>
              </h3>
              <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Persistent in PostgreSQL
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {existingEvidence.map((ev, idx) => {
                const meta = ev.metadata || {};
                const category = meta.category || (ev.type === 'INITIAL' ? 'Before Work' : 'After Work');
                const isAfter = category.toLowerCase().includes('after') || ev.type === 'RESOLUTION';
                return (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-1.5 pb-2">
                    <div className="h-28 bg-slate-200 relative">
                      <img
                        src={ev.url}
                        alt={meta.fileName || 'Evidence'}
                        className="w-full h-full object-cover"
                        onError={(e: any) => { e.target.src = '/test_evidence/pothole_original.jpg'; }}
                      />
                      <span className={`absolute top-1.5 left-1.5 text-[9px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm ${
                        isAfter ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                      }`}>
                        {category}
                      </span>
                    </div>
                    <div className="px-2">
                      <p className="text-[11px] font-bold text-slate-700 truncate">{meta.fileName || `Photo #${idx + 1}`}</p>
                      <p className="text-[10px] text-slate-400">{new Date(ev.timestamp).toLocaleDateString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadEvidence;
