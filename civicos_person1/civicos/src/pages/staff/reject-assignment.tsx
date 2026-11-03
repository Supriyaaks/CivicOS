import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMccStore } from '../../store/mccStore';

const RejectAssignment: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { incidents, updateIncident, addTimelineEntry } = useMccStore();
  const task = incidents.find(inc => inc.id === id);

  if (!task) return <div className="p-8 text-center">Task not found.</div>;

  const [reason, setReason] = useState('');
  const [explanation, setExplanation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reasons = [
    'Wrong Department',
    'Insufficient Resources',
    'Unsafe Working Conditions',
    'Incorrect Assignment',
    'Staff Unavailable',
    'Other'
  ];

  const handleReject = () => {
    if (!reason || !explanation) {
      alert('Please provide both a reason and a detailed explanation.');
      return;
    }

    setIsSubmitting(true);

    // Update state to reflected rejection
    updateIncident(task.id, { status: 'Rejected' });
    addTimelineEntry(task.id, {
      timestamp: new Date().toISOString(),
      action: 'Assignment Rejected',
      user: 'Field Staff',
      note: `Reason: ${reason}. Explanation: ${explanation}`,
    });

    setTimeout(() => {
      setIsSubmitting(false);
      alert('Rejection submitted successfully.');
      navigate('/staff/tasks');
    }, 800);
  };

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Reject Assignment</h1>
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-600">✕</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 bg-red-600 text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-red-100 text-xs font-bold uppercase tracking-widest mb-1">Incident to Reject</p>
              <h2 className="text-2xl font-bold">{task.category}</h2>
              <p className="text-red-100 opacity-80">{task.id} • {task.location}</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white text-red-600">
              {task.severity} Priority
            </span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <label className="block text-sm font-bold text-slate-800">Reason for Rejection</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {reasons.map(r => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                    reason === r
                    ? 'border-red-500 bg-red-50 text-red-700 ring-1 ring-red-500'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-bold text-slate-800">Detailed Explanation</label>
            <textarea
              rows={4}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-sm"
              placeholder="Please provide a detailed explanation for the rejection..."
              value={explanation}
              onChange={e => setExplanation(e.target.value)}
            />
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3">
          <button
            onClick={() => navigate(`/staff/task/${task.id}`)}
            className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleReject}
            disabled={isSubmitting}
            className={`px-6 py-2 text-sm font-bold text-white rounded-lg transition-all shadow-sm ${
              isSubmitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isSubmitting ? 'Submitting...' : 'Confirm Rejection'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejectAssignment;
