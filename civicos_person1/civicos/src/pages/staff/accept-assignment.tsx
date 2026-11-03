import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMccStore } from '../../store/mccStore';
import { AlertTriangle, Info, ArrowLeft } from 'lucide-react';

const AcceptAssignment: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { incidents, updateIncident, addTimelineEntry } = useMccStore();
  const task = incidents.find(inc => inc.id === id);
  const [acknowledged, setAcknowledged] = useState(false);

  const handleAccept = () => {
    if (!task || !acknowledged) {
      alert('Please acknowledge the assignment terms before confirming.');
      return;
    }

    if (task.status === 'In Progress' || task.status === 'Verified' || task.status === 'Rejected') {
      alert('This task has already been processed or completed.');
      return;
    }

    updateIncident(task.id, { status: 'In Progress' });
    addTimelineEntry(task.id, {
      timestamp: new Date().toISOString(),
      action: 'Assignment Accepted',
      user: 'Field Staff',
      note: 'Task accepted and moved to active status.'
    });
    alert('Assignment successfully accepted!');
    navigate('/staff/tasks');
  };

  if (!task) {
    return <div className="p-8 text-center">Task not found.</div>;
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(`/staff/task/${task.id}`)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Accept Assignment</h1>
        <div className="w-10" /> {/* Spacer */}
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center space-x-2">
                <Info className="w-4 h-4 text-blue-600" /> <span>Task Overview</span>
              </h3>
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-xs text-slate-500">ID</span>
                  <span className="text-sm font-bold text-slate-900">{task.id}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-xs text-slate-500">Category</span>
                  <span className="text-sm font-bold text-slate-900">{task.category}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-xs text-slate-500">Location</span>
                  <span className="text-sm font-bold text-slate-900">{task.location}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Severity</span>
                  <span className={`text-sm font-bold ${task.severity === 'Critical' ? 'text-red-600' : 'text-orange-600'}`}>{task.severity}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> <span>Safety & Resources</span>
              </h3>
              <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 space-y-3">
                <p className="text-xs text-amber-800 leading-relaxed">
                  Please ensure all required safety gear is available before proceeding to the site.
                  Verify local traffic conditions and coordinate with site supervisors.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Assignment Details</h3>
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Work Description</label>
                  <p className="text-sm text-slate-700 leading-relaxed">{task.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Priority</label>
                    <p className="text-sm font-bold text-slate-900">{task.priority}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Department</label>
                    <p className="text-sm font-bold text-slate-900">{task.assignedDept || 'Pending'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100 space-y-6">
          <label className="flex items-start space-x-3 cursor-pointer group">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={e => setAcknowledged(e.target.checked)}
                className="peer h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
            <span className="text-sm text-slate-600 leading-relaxed group-hover:text-slate-900 transition-colors">
              I acknowledge the assignment of <strong>{task.id}</strong> and confirm that I have reviewed the
              location, severity, and safety requirements. I agree to execute the work according to
              Municipal Operational Protocols.
            </span>
          </label>

          <div className="flex space-x-3">
            <button onClick={() => navigate(`/staff/task/${task.id}`)} className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all">
              Cancel
            </button>
            <button
              onClick={handleAccept}
              disabled={!acknowledged}
              className={`flex-1 py-3 text-sm font-bold rounded-2xl transition-all ${
                acknowledged ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              Confirm Acceptance
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcceptAssignment;
