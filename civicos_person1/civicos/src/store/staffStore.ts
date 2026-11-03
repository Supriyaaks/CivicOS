import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

export interface Task {
  id: string;
  complaint_id: string;
  status: string;
  updated_at: string;
  complaints?: any;
}

interface StaffState {
  tasks: Task[];
  isLoading: boolean;

  fetchTasks: () => Promise<void>;
  updateTaskStatus: (taskId: string, status: string) => Promise<void>;
  addEvidence: (taskId: string, evidence: any) => Promise<void>;
  addJournalEntry: (taskId: string, entry: any) => Promise<void>;
  updateChecklist: (taskId: string, itemId: string, isCompleted: boolean) => Promise<void>;
  reportBlocker: (taskId: string, blocker: any) => Promise<void>;
  submitForVerification: (taskId: string, summary: string) => Promise<void>;
}

export const useStaffStore = create<StaffState>()(
  persist(
    (set) => ({
      tasks: [],
      isLoading: false,

      fetchTasks: async () => {
        set({ isLoading: true });

        const { data, error } = await supabase
          .from('assignments')
          .select('*, complaints(*)');

        if (!error && data) {
          set({ tasks: data, isLoading: false });
        } else {
          set({ isLoading: false });
        }
      },

      updateTaskStatus: async (taskId, status) => {
        const { error } = await supabase
          .from('assignments')
          .update({ status })
          .eq('id', taskId);

        if (!error) {
          set((state) => ({
            tasks: state.tasks.map(t => t.id === taskId ? { ...t, status } : t),
          }));
        }
      },

      addEvidence: async (taskId, evidence) => {
        const { error } = await supabase.from('task_evidence').insert([{
          assignment_id: taskId,
          ...evidence
        }]);
        if (error) throw error;
      },

      addJournalEntry: async (taskId, entry) => {
        const { error } = await supabase.from('journals').insert([{
          assignment_id: taskId,
          ...entry
        }]);
        if (error) throw error;
      },

      updateChecklist: async (_taskId, itemId, isCompleted) => {
        const { error } = await supabase.from('checklists').update({ is_completed: isCompleted }).eq('id', itemId);
        if (error) throw error;
      },

      reportBlocker: async (taskId, blocker) => {
        const { error } = await supabase.from('blockers').insert([{
          assignment_id: taskId,
          ...blocker
        }]);
        if (error) throw error;
      },

      submitForVerification: async (_taskId, summary) => {
        const { error } = await supabase.from('verification_submissions').insert([{
          assignment_id: _taskId,
          summary,
          status: 'Pending'
        }]);
        if (error) throw error;
      },
    }),
    {
      name: 'staff-storage',
    }
  )
);
