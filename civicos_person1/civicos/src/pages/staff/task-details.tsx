import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMccStore, TaskEvidence } from '../../store/mccStore';
import { backendService } from '../../services/backendService';
import { Layers, Info, X } from 'lucide-react';

const TaskDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { incidents, taskTimelines, completionEvidence } = useMccStore();

  const [fetchedTask, setFetchedTask] = useState<any>(null);
  const [dbEvidence, setDbEvidence] = useState<any[]>([]);
  const [dbTimeline, setDbTimeline] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/v1/incidents/${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(j => { if (j?.data) setFetchedTask(j.data); })
      .catch(() => {});

    backendService.getTaskEvidence(id).then(setDbEvidence).catch(() => {});
    backendService.getTaskTimeline(id).then(setDbTimeline).catch(() => {});
  }, [id]);

  const task = incidents.find(inc => inc.id === id || (inc as any).incidentCode === id) || (fetchedTask ? {
    id: fetchedTask.incidentCode || fetchedTask.id,
    category: fetchedTask.category,
    description: fetchedTask.description,
    location: fetchedTask.location,
    status: fetchedTask.status === 'InProgress' ? 'In Progress' : fetchedTask.status,
    severity: fetchedTask.severity || 'High',
    priority: fetchedTask.priority || 'Normal',
    assignedDept: fetchedTask.department?.name || 'Roads & Infrastructure',
    evidence: fetchedTask.evidence?.[0]?.url || '',
    date: fetchedTask.createdAt || new Date().toISOString(),
  } : null);

  const [evidenceFilter, setEvidenceFilter] = useState<string>('All');
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [selectedImage, setSelectedImage] = useState<TaskEvidence | null>(null);

  if (!task) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center space-y-4 p-12 bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-slate-900">Task Not Found</h1>
          <p className="text-slate-500">The incident record "{id}" could not be located in the municipal registry.</p>
          <button onClick={() => navigate('/staff/tasks')} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
            Return to Task List
          </button>
        </div>
      </div>
    );
  }

  const timeline = dbTimeline.length > 0
    ? dbTimeline.map(t => ({
        timestamp: t.timestamp,
        action: t.action,
        user: t.user?.email || 'Officer / Staff',
        note: t.note || '',
        type: 'General'
      }))
    : (taskTimelines[id || ''] || []);

  const staffEvidence: TaskEvidence[] = dbEvidence.length > 0
    ? dbEvidence.map(e => ({
        id: e.id,
        url: e.url,
        category: e.metadata?.category || (e.type === 'INITIAL' ? 'Before Work' : 'After Work'),
        description: e.metadata?.description || '',
        fileName: e.metadata?.fileName || 'Evidence',
        fileSize: e.metadata?.fileSize || 0,
        fileType: e.metadata?.mimeType || 'image/jpeg',
        timestamp: e.timestamp,
        taskId: id || ''
      }))
    : (completionEvidence[id || ''] || []);

  const filteredEvidence = staffEvidence.filter(ev => {
    if (isComparisonMode) {
      return ev.category === 'Before Work' || ev.category === 'After Work';
    }
    return evidenceFilter === 'All' || ev.category === evidenceFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Dispatching': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'In Progress': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'On Scene': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'Resolved': return 'bg-green-100 text-green-700 border-green-200';
      case 'Awaiting Verification': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
      {/* Premium Header */}
      <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-xs font-black uppercase tracking-widest border border-blue-500/30">
                Incident Record
              </span>
              <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getStatusColor(task.status).replace('bg-', 'text-').replace('text-', 'bg-').replace('border-', 'text-')} bg-opacity-20`}>
                {task.status}
              </span>
            </div>
            <div className="flex items-baseline space-x-4">
              <h1 className="text-4xl font-black tracking-tight">{task.id}</h1>
              <span className="text-slate-400 text-xl font-medium">— {task.category}</span>
            </div>
            <p className="text-slate-300 flex items-center space-x-2 text-lg">
              <span className="opacity-50">📍</span>
              <span>{task.location}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={() => navigate(`/staff/task/${task.id}/accept`)} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 flex items-center space-x-2">
              <span>✅</span> <span>Accept Assignment</span>
            </button>
            <button onClick={() => navigate(`/staff/task/${task.id}/progress`)} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all border border-slate-700 flex items-center space-x-2">
              <span>🛠️</span> <span>Update Progress</span>
            </button>
            <button onClick={() => navigate(`/staff/task/${task.id}/upload`)} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all border border-slate-700 flex items-center space-x-2">
              <span>📷</span> <span>Evidence</span>
            </button>
            <button onClick={() => navigate(`/staff/task/${task.id}/verification`)} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all border border-slate-700 flex items-center space-x-2">
              <span>🔍</span> <span>Verification</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Workspace (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Core Incident Data */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center space-x-2">
              <span className="text-blue-600 text-lg">📄</span>
              <h3 className="font-bold text-slate-800">Incident Intelligence</h3>
            </div>
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Problem Description</label>
                    <p className="text-slate-700 leading-relaxed text-lg">{task.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Severity</label>
                      <p className={`text-sm font-black ${task.severity === 'Critical' ? 'text-red-600' : 'text-orange-600'}`}>{task.severity}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Department</label>
                      <p className="text-sm font-bold text-slate-700">{task.assignedDept || 'Pending'}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-900 text-white p-6 rounded-3xl space-y-4 shadow-xl">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-blue-400">📍</span>
                    <h4 className="font-bold text-slate-100">Location Intel</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <span className="text-xs text-slate-400">Address</span>
                      <span className="text-sm font-medium">{task.location}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <span className="text-xs text-slate-400">Source</span>
                      <span className="text-sm font-medium">Citizen App</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Coordinate</span>
                      <span className="text-sm font-mono text-blue-400">40.7128° N, 74.0060° W</span>
                    </div>
                  </div>
                  <button className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold transition-all mt-2">
                    Open in Navigation
                  </button>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100 space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <span className="text-blue-600">🛠️</span>
                  <h4 className="font-bold text-slate-800">Work Instructions & Safety Protocols</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-sm text-blue-800 leading-relaxed">
                    <span className="font-bold block mb-1">Standard Procedure:</span>
                    Verify site stability, cordon off immediate area, and execute repair following Municipal Code 402.
                  </div>
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-sm text-amber-800 leading-relaxed">
                    <span className="font-bold block mb-1">⚠️ Critical Safety:</span>
                    Ensure high-visibility gear is worn. Coordinate with traffic control before on-road work.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Evidence Gallery */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-blue-600 text-lg">📷</span>
                  <h3 className="font-bold text-slate-800">Evidence Management</h3>
                </div>
                <div className="flex items-center space-x-1 bg-slate-200/50 p-1 rounded-lg">
                  {['All', 'Before Work', 'During Work', 'After Work'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => { setEvidenceFilter(cat); setIsComparisonMode(false); }}
                      className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${evidenceFilter === cat ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsComparisonMode(!isComparisonMode)}
                  className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-xs font-bold transition-all border ${isComparisonMode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                  <Layers className="w-3 h-3" /> <span>Compare Mode</span>
                </button>
                <button onClick={() => navigate(`/staff/task/${task.id}/upload`)} className="text-xs font-bold text-blue-600 hover:underline">
                  Add New Evidence →
                </button>
              </div>
            </div>
            <div className="p-8 space-y-8">
              <div className="space-y-4">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Citizen Report Evidence</label>
                <div className="flex gap-6 items-start">
                  <img src={task.evidence} alt="Original" className="w-64 h-40 object-cover rounded-2xl border border-slate-200 shadow-sm" />
                  <div className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-slate-600 italic leading-relaxed">"The infrastructure is severely damaged and poses a risk to pedestrians. Please fix urgently."</p>
                  </div>
                </div>
              </div>

              {staffEvidence.length > 0 && (
                <div className="space-y-4 pt-8 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Completion Evidence (Field Staff)</label>
                    {isComparisonMode && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">Showing Before vs After</span>}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {filteredEvidence.map((ev, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedImage(ev)}
                        className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-sm cursor-pointer transition-all hover:shadow-md hover:ring-2 hover:ring-blue-500"
                      >
                        <img src={ev.url} alt={`Staff ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                          <span className="text-[10px] text-blue-300 font-bold uppercase">{ev.category}</span>
                          <p className="text-[10px] text-white font-medium leading-tight">{ev.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Side Panel (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Operational Workflow Tracker */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
            <h3 className="font-bold text-slate-800 flex items-center space-x-2">
              <span className="text-blue-600">🔄</span> <span>Task Lifecycle</span>
            </h3>
            <div className="relative space-y-8 pl-8">
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-100" />
              {[
                { stage: 'Assigned', status: 'completed' },
                { stage: 'Accepted', status: task.status === 'In Progress' || task.status === 'On Scene' || task.status === 'Resolved' || task.status === 'Awaiting Verification' ? 'completed' : 'pending' },
                { stage: 'On Scene', status: task.status === 'On Scene' || task.status === 'Resolved' || task.status === 'Awaiting Verification' ? 'completed' : 'pending' },
                { stage: 'Work in Progress', status: task.status === 'In Progress' || task.status === 'Resolved' || task.status === 'Awaiting Verification' ? 'completed' : 'pending' },
                { stage: 'Evidence Submitted', status: task.status === 'Awaiting Verification' || task.status === 'Resolved' ? 'completed' : 'pending' },
                { stage: 'Officer Verification', status: task.status === 'Resolved' ? 'completed' : 'pending' },
              ].map((step, i) => (
                <div key={i} className="relative flex items-start space-x-4 group">
                  <div className={`w-4 h-4 rounded-full z-10 mt-1 shadow-sm transition-all ${step.status === 'completed' ? 'bg-blue-600 ring-4 ring-blue-100 scale-110' : 'bg-slate-200 group-hover:bg-slate-300'}`} />
                  <div className="flex flex-col">
                    <span className={`text-sm font-bold ${step.status === 'completed' ? 'text-slate-900' : 'text-slate-400'}`}>{step.stage}</span>
                    {step.status === 'completed' && <span className="text-[10px] text-blue-600 font-medium">✓ Verified</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Log */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
            <h3 className="font-bold text-slate-800 flex items-center space-x-2">
              <span className="text-blue-600">📜</span> <span>Activity Log</span>
            </h3>
            <div className="space-y-6">
              {timeline.length > 0 ? timeline.map((entry, i) => (
                <div key={i} className="relative pl-6 border-l-2 border-slate-100 space-y-1 group">
                  <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-slate-300 group-hover:bg-blue-500 transition-colors" />
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-800">{entry.action}</span>
                    <span className="text-[10px] text-slate-400">{new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{entry.note}</p>
                  <span className="text-[10px] text-slate-400 font-medium block pt-1 uppercase tracking-tighter">{entry.user}</span>
                </div>
              )) : (
                <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-400 italic">No activity recorded for this task.</p>
                </div>
              )}
            </div>
          </div>

          {/* Operational Quick-Actions */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Quick Operations</h3>
            <div className="grid grid-cols-1 gap-3">
              <button onClick={() => navigate(`/staff/task/${task.id}/accept`)} className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2">
                <span>✅</span> <span>Accept Assignment</span>
              </button>
              <button onClick={() => navigate(`/staff/task/${task.id}/progress`)} className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center justify-center space-x-2">
                <span>🛠️</span> <span>Update Progress</span>
              </button>
              <button onClick={() => navigate(`/staff/task/${task.id}/upload`)} className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center justify-center space-x-2">
                <span>📷</span> <span>Upload Evidence</span>
              </button>
              <button onClick={() => navigate(`/staff/task/${task.id}/verification`)} className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center justify-center space-x-2">
                <span>🔍</span> <span>Check Verification</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Detail Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl overflow-hidden max-w-4xl w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="relative">
              <img src={selectedImage.url} alt="Detail" className="w-full h-auto max-h-[70vh] object-contain bg-slate-100" />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors"
              >
                <X className="w-6 h-6 text-slate-900" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">{selectedImage.category}</h3>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">{selectedImage.fileName}</span>
              </div>
              <p className="text-slate-600 leading-relaxed">{selectedImage.description || 'No description provided.'}</p>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <Info className="w-3 h-3" /> <span>Size: {(selectedImage.fileSize / 1024).toFixed(1)} KB</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <Info className="w-3 h-3" /> <span>Type: {selectedImage.fileType}</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <Info className="w-3 h-3" /> <span>Date: {new Date(selectedImage.timestamp).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDetails;
