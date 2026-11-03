import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMccStore, TaskStatus, TASK_LIFECYCLE } from '../../store/mccStore';
import {
  Play, Pause, Square, CheckCircle, AlertTriangle,
  PlusCircle, BookOpen, Clock,
  ChevronRight, LayoutDashboard, ArrowLeft, Save
} from 'lucide-react';

const UpdateProgress: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    incidents,
    workSessions,
    checklists,
    blockers,
    resourceRequests,
    milestones,
    journal,
    setTaskStatus,
    manageWorkSession,
    updateChecklistItem,
    reportBlocker,
    resolveBlocker,
    requestResource,
    updateProgress,
    updateMilestone,
    addJournalEntry,
    initializeChecklist,
  } = useMccStore();

  const task = incidents.find(inc => inc.id === id);

  // Local state for forms
  const [progressValue, setProgressValue] = useState(task?.progress || 0);
  const [progressNote, setProgressNote] = useState('');
  const [journalNote, setJournalNote] = useState('');
  const [blockerNote, setBlockerNote] = useState('');
  const [resourceItem, setResourceItem] = useState('');
  const [resourceQty, setResourceQty] = useState(1);

  useEffect(() => {
    if (task && !checklists[task.id]) {
      initializeChecklist(task.id, task.category);
    }
  }, [task, checklists, initializeChecklist]);

  if (!task) {
    return <div className="p-8 text-center text-slate-400">Task not found.</div>;
  }

  const currentSession = Object.values(workSessions).find(s => s.incidentId === id);
  const taskChecklist = checklists[task.id]?.['main'] || [];
  const taskBlockers = blockers[task.id] || [];
  const taskResources = resourceRequests[task.id] || [];
  const taskMilestones = milestones[task.id] || [
    { id: 'm1', title: 'Site Arrival', description: 'Confirm arrival at location', isCompleted: false },
    { id: 'm2', title: 'Initial Assessment', description: 'Complete site survey', isCompleted: false },
    { id: 'm3', title: 'Work Execution', description: 'Perform main repair work', isCompleted: false },
    { id: 'm4', title: 'Final Cleanup', description: 'Remove debris and secure site', isCompleted: false },
  ];
  const taskJournal = journal[task.id] || [];

  const completedChecklistItems = taskChecklist.filter(i => i.isCompleted).length;
  const checklistProgress = taskChecklist.length > 0 ? Math.round((completedChecklistItems / taskChecklist.length) * 100) : 0;

  const handleStatusTransition = (newStatus: TaskStatus) => {
    const allowed = TASK_LIFECYCLE[task.status as TaskStatus] || [];
    if (allowed.includes(newStatus)) {
      setTaskStatus(task.id, newStatus);
    } else {
      alert(`Invalid transition: Cannot move from ${task.status} to ${newStatus}`);
    }
  };

  const saveProgress = () => {
    // @ts-ignore
    updateProgress(task.id, progressValue, progressNote);
    setProgressNote('');
    alert('Progress updated successfully!');
  };

  const handleAddJournal = () => {
    if (!journalNote) return;
    addJournalEntry(task.id, {
      timestamp: new Date().toISOString(),
      category: 'General',
      description: journalNote
    });
    setJournalNote('');
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 p-6 staff-portal">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header & Breadcrumbs */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/staff/tasks')}
              className="p-2 rounded-xl bg-slate-900/50 border border-slate-800 hover:bg-slate-800 transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-xs font-black text-blue-500 uppercase tracking-widest">
                <span>Assignments</span> <ChevronRight className="w-3 h-3" /> <span>Operational Workspace</span>
              </div>
              <h1 className="text-3xl font-black tracking-tighter text-white">Update Work Progress</h1>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
              task.status === 'Blocked' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
            }`}>
              {task.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left Column: Overview & Control */}
          <div className="lg:col-span-4 space-y-6">

            {/* Task Overview Card */}
            <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 backdrop-blur-md shadow-xl space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-black uppercase tracking-widest text-xs text-slate-500">Task Overview</h3>
                <button
                  onClick={() => navigate(`/staff/task/${task.id}`)}
                  className="text-xs font-bold text-blue-400 hover:text-blue-300"
                >
                  Full Details â†’
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                  <span className="text-sm text-slate-500">ID</span>
                  <span className="text-sm font-bold text-white">{task.id}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                  <span className="text-sm text-slate-500">Category</span>
                  <span className="text-sm font-bold text-white">{task.category}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                  <span className="text-sm text-slate-500">Severity</span>
                  <span className={`text-sm font-bold ${task.severity === 'Critical' ? 'text-red-400' : 'text-white'}`}>{task.severity}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                  <span className="text-sm text-slate-500">Deadline</span>
                  <span className="text-sm font-bold text-white">{task.date.split('T')[0]}</span>
                </div>
              </div>
            </div>

            {/* Session Controller */}
            <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 backdrop-blur-md shadow-xl space-y-6">
              <h3 className="font-black uppercase tracking-widest text-xs text-slate-500">Work Session</h3>

              {!currentSession || currentSession.status === 'Completed' ? (
                <button
                  onClick={() => manageWorkSession(task.id, 'start')}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-3 shadow-lg shadow-blue-900/40 active:scale-95"
                >
                  <Play className="w-5 h-5" /> <span>Start Work Session</span>
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      <span className="text-sm font-bold text-blue-400">Session {currentSession.status}</span>
                    </div>
                    <span className="text-sm font-mono text-slate-300">00:42:15</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {currentSession.status === 'Active' ? (
                      <button
                        onClick={() => manageWorkSession(task.id, 'pause')}
                        className="py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all flex items-center justify-center space-x-2"
                      >
                        <Pause className="w-4 h-4" /> <span>Pause</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => manageWorkSession(task.id, 'resume')}
                        className="py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all flex items-center justify-center space-x-2"
                      >
                        <Play className="w-4 h-4" /> <span>Resume</span>
                      </button>
                    )}
                    <button
                      onClick={() => manageWorkSession(task.id, 'stop')}
                      className="py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 border border-red-500/20"
                    >
                      <Square className="w-4 h-4" /> <span>End</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Lifecycle Stepper */}
            <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 backdrop-blur-md shadow-xl space-y-6">
              <h3 className="font-black uppercase tracking-widest text-xs text-slate-500">Status Transition</h3>
              <div className="grid grid-cols-2 gap-3">
                {TASK_LIFECYCLE[task.status as TaskStatus]?.map(status => (
                  <button
                    key={status}
                    onClick={() => handleStatusTransition(status as TaskStatus)}
                    className="py-3 px-2 bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 rounded-xl text-xs font-bold transition-all text-center border border-slate-700"
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Execution Details */}
          <div className="lg:col-span-8 space-y-8">

            {/* Progress & Journal Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 backdrop-blur-md shadow-xl space-y-6">
                <h3 className="font-black uppercase tracking-widest text-xs text-slate-500 flex items-center space-x-2">
                  <LayoutDashboard className="w-4 h-4" /> <span>Progress Tracker</span>
                </h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-xs text-slate-400 font-bold">COMPLETION</span>
                      <span className="text-2xl font-black text-white">{progressValue}%</span>
                    </div>
                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                      <div
                        className="h-full bg-blue-500 transition-all duration-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                        style={{ width: `${progressValue}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <input
                      type="range" min="0" max="100"
                      value={progressValue}
                      onChange={e => setProgressValue(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <textarea
                      value={progressNote}
                      onChange={e => setProgressNote(e.target.value)}
                      placeholder="Add progress note..."
                      className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 h-20"
                    />
                    <button
                      onClick={saveProgress}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all flex items-center justify-center space-x-2 active:scale-95"
                    >
                      <Save className="w-4 h-4" /> <span>Save Progress</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 backdrop-blur-md shadow-xl space-y-6">
                <h3 className="font-black uppercase tracking-widest text-xs text-slate-500 flex items-center space-x-2">
                  <BookOpen className="w-4 h-4" /> <span>Work Journal</span>
                </h3>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      value={journalNote}
                      onChange={e => setJournalNote(e.target.value)}
                      placeholder="Record observation..."
                      className="flex-1 p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleAddJournal}
                      className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all active:scale-95"
                    >
                      <PlusCircle className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                    {taskJournal.length > 0 ? taskJournal.map((entry, i) => (
                      <div key={i} className="p-3 bg-slate-800/50 border border-slate-800 rounded-xl space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-blue-400 uppercase">{entry.category}</span>
                          <span className="text-[10px] text-slate-500">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-sm text-slate-300">{entry.description}</p>
                      </div>
                    )) : (
                      <p className="text-center text-slate-600 text-xs italic py-4">No entries yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Checklists & Milestones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 backdrop-blur-md shadow-xl space-y-6">
                <h3 className="font-black uppercase tracking-widest text-xs text-slate-500 flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" /> <span>Operational Checklist</span>
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs text-slate-400 font-medium">{completedChecklistItems}/{taskChecklist.length} Completed</span>
                    <span className="text-xs font-bold text-blue-400">{checklistProgress}%</span>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {taskChecklist.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-800 rounded-xl hover:bg-slate-800 transition-all group"
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={item.isCompleted}
                            onChange={e => updateChecklistItem(task.id, 'main', item.id, e.target.checked)}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                          />
                          <span className={`text-sm ${item.isCompleted ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                            {item.label}
                          </span>
                        </div>
                        {item.required && !item.isCompleted && <span className="text-[10px] font-black text-red-400 uppercase">Req</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 backdrop-blur-md shadow-xl space-y-6">
                <h3 className="font-black uppercase tracking-widest text-xs text-slate-500 flex items-center space-x-2">
                  <Clock className="w-4 h-4" /> <span>Task Milestones</span>
                </h3>
                <div className="space-y-3">
                  {taskMilestones.map((m) => (
                    <div key={m.id} className="flex items-center space-x-3 p-3 bg-slate-800/50 border border-slate-800 rounded-xl">
                      <button
                        onClick={() => updateMilestone(task.id, m.id, { isCompleted: !m.isCompleted })}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          m.isCompleted ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-600 text-transparent'
                        }`}
                      >
                        <CheckCircle className="w-3 h-3" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm ${m.isCompleted ? 'text-slate-500 line-through' : 'text-slate-300'}`}>{m.title}</span>
                      </div>
                      {m.isCompleted && <span className="text-[10px] text-slate-500">Done</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Blockers & Resources */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 backdrop-blur-md shadow-xl space-y-6">
                <h3 className="font-black uppercase tracking-widest text-xs text-slate-500 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" /> <span>Blockers</span>
                </h3>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      value={blockerNote}
                      onChange={e => setBlockerNote(e.target.value)}
                      placeholder="Describe blocker..."
                      className="flex-1 p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <button
                      onClick={() => {
                        reportBlocker(task.id, { category: 'Other', description: blockerNote });
                        setBlockerNote('');
                      }}
                      className="p-3 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all active:scale-95"
                    >
                      <PlusCircle className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {taskBlockers.length > 0 ? taskBlockers.map((b) => (
                      <div key={b.id} className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm text-slate-300">{b.description}</p>
                          <span className="text-[10px] text-slate-500">{b.reportedAt}</span>
                        </div>
                        {!b.resolvedAt && (
                          <button
                            onClick={() => resolveBlocker(task.id, b.id, 'Resolved by staff')}
                            className="text-xs font-bold text-green-400 hover:text-green-300 px-2 py-1 bg-green-500/10 rounded-md border border-green-500/20"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    )) : (
                      <p className="text-center text-slate-600 text-xs italic py-4">No active blockers reported.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 backdrop-blur-md shadow-xl space-y-6">
                <h3 className="font-black uppercase tracking-widest text-xs text-slate-500 flex items-center space-x-2">
                  <PlusCircle className="w-4 h-4 text-blue-400" /> <span>Resource Requests</span>
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={resourceItem}
                      onChange={e => setResourceItem(e.target.value)}
                      placeholder="Item name..."
                      className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      value={resourceQty}
                      onChange={e => setResourceQty(parseInt(e.target.value))}
                      className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => {
                      requestResource(task.id, {
                        item: resourceItem,
                        quantity: resourceQty,
                        urgency: 'Medium',
                        status: 'Requested',
                        timestamp: new Date().toISOString()
                      });
                      setResourceItem('');
                      setResourceQty(1);
                    }}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all active:scale-95"
                  >
                    Request Resource
                  </button>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {taskResources.length > 0 ? taskResources.map((r) => (
                      <div key={r.id} className="p-3 bg-slate-800/50 border border-slate-800 rounded-xl flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-xs font-bold text-blue-400">{r.item}</span>
                          <span className="text-xs text-slate-500">x{r.quantity}</span>
                        </div>
                        <span className={`text-[10px] font-black uppercase ${
                          r.status === 'Approved' ? 'text-green-400' : 'text-amber-400'
                        }`}>
                          {r.status}
                        </span>
                      </div>
                    )) : (
                      <p className="text-center text-slate-600 text-xs italic py-4">No requests yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateProgress;
