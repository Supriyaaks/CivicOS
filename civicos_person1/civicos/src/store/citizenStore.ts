import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { AIReportProcessingResult, ResolutionVerificationResult } from '../types/ai';

export interface Complaint {
  id: string;
  category: string;
  description: string;
  date: string;
  location: string;
  status: 'Pending' | 'In Progress' | 'Resolved' | 'Closed';
  department?: string;
  assignmentDate?: string | null;
  evidence?: string;
  evidenceDate?: string;
  currentStage: number;
  resolutionDate?: string;
  resolutionDescription?: string;
  resolutionEvidence?: string;
  citizenConfirmed?: boolean;
  severity?: string;
  priority?: string;
  latitude?: number;
  longitude?: number;

  // AI Pipeline Integration Fields
  aiResults?: AIReportProcessingResult;
  aiVerificationStatus?: 'verified' | 'mismatch' | 'needs_review' | 'pending';
  aiConfidence?: number;
  detectedCategory?: string;
  isDuplicate?: boolean;
  duplicateRef?: string;
  rddDetected?: boolean;
  litterDetected?: boolean;
  resolutionVerification?: ResolutionVerificationResult;
}

export interface CitizenProfile {
  fullName: string;
  email: string;
  phone: string;
  dob: string;
  gender: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  complaintId: string | null;
  category: 'Progress' | 'Announcement';
  date: string;
  read: boolean;
}

interface CitizenState {
  profile: CitizenProfile;
  complaints: Complaint[];
  notifications: Notification[];
  isLoading: boolean;

  updateProfile: (profile: Partial<CitizenProfile>) => Promise<void>;
  fetchProfile: () => Promise<void>;
  fetchComplaints: () => Promise<void>;
  addComplaint: (complaint: Omit<Complaint, 'id' | 'date' | 'currentStage'> & { id?: string }) => Promise<string>;
  updateComplaintStatus: (id: string, status: Complaint['status'], stage: number) => Promise<void>;
  updateComplaintAI: (id: string, aiResults: AIReportProcessingResult) => void;
  updateResolutionAI: (id: string, resolution: ResolutionVerificationResult) => void;
  confirmResolution: (id: string, confirmed: boolean, reason?: string) => Promise<void>;
  fetchNotifications: () => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id'>) => Promise<string>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
}

const INITIAL_PROFILE: CitizenProfile = {
  fullName: 'Jane Doe',
  email: 'jane.doe@example.com',
  phone: '+1 (555) 000-1234',
  dob: '1992-05-15',
  gender: 'Female',
  address: '123 Civic Lane',
  city: 'Metropolis',
  state: 'Central State',
  pinCode: '54321',
};

export const useCitizenStore = create<CitizenState>()(
  persist(
    (set) => ({
      profile: INITIAL_PROFILE,
      complaints: [],
      notifications: [],
      isLoading: false,

      updateProfile: async (updatedFields) => {
        const { error } = await supabase
          .rpc('profile_update_safe', { updated_data: updatedFields });

        if (!error) {
          set((state) => ({ profile: { ...state.profile, ...updatedFields } }));
        }
      },

      fetchProfile: async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .single();

        if (!error && data) {
          set((state) => ({
            profile: {
              ...state.profile,
              fullName: data.full_name || state.profile.fullName,
              phone: data.phone || state.profile.phone
            }
          }));
        }
      },

      fetchComplaints: async () => {
        set({ isLoading: true });
        const { data, error } = await supabase
          .from('complaints')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          set({ complaints: data, isLoading: false });
        } else {
          set({ isLoading: false });
        }
      },

      addComplaint: async (data) => {
        const id = data.id || `CIV-${Math.floor(1000 + Math.random() * 9000)}`;

        try {
          await supabase
            .from('complaints')
            .insert([{
              id,
              category: data.category,
              description: data.description,
              location: data.location,
              status: data.status || 'Pending',
              current_stage: (data.aiResults ? 2 : 1),
              evidence_url: data.evidence,
              ai_confidence: data.aiConfidence ? data.aiConfidence.toString() : (data.aiResults?.verification?.confidence ? data.aiResults.verification.confidence.toString() : undefined),
              ai_verification_status: data.aiVerificationStatus || data.aiResults?.verification?.status || 'pending',
              detected_category: data.detectedCategory || data.aiResults?.verification?.detected_category || null,
              is_duplicate: Boolean(data.isDuplicate),
              duplicate_info: data.aiResults?.duplicates || null,
              ai_results: data.aiResults || null,
              resolution_verification: data.resolutionVerification || null,
            }]);

          await supabase.from('audit_logs').insert([{
            entity_type: 'complaint',
            entity_id: id,
            action: 'complaint_created',
            new_data: {
              category: data.category,
              location: data.location,
              ai_verification_status: data.aiVerificationStatus || 'pending',
            },
          }]);
        } catch (err) {
          console.warn('[CitizenStore] Supabase remote sync skipped (persisting locally):', err);
        }

        // Resiliently attempt to sync to Person 4 Express Backend if available
        try {
          await fetch('/api/v1/incidents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id,
              incidentCode: id,
              category: data.category,
              description: data.description,
              location: data.location,
              status: 'Pending',
              currentStage: data.aiResults ? 2 : 1,
              evidenceUrl: data.evidence,
              severity: data.severity || (data.category.includes('Pothole') || data.category.includes('Open manhole') ? 'High' : 'Medium'),
              priority: data.priority || 'Medium',
              aiConfidence: data.aiConfidence ? `${Math.round(Number(data.aiConfidence) * 100)}%` : '90%'
            })
          });
        } catch {
          // Express backend optional sync
        }

        const newComplaint: Complaint = {
          ...data,
          id,
          date: new Date().toISOString().split('T')[0],
          currentStage: data.aiResults ? 2 : 1,
          status: data.status || 'Pending'
        };

        set((state) => ({
          complaints: [
            newComplaint,
            ...state.complaints.filter(c => c.id !== id)
          ]
        }));

        // Immediately update Municipal Command Center store
        try {
          const { useMccStore } = await import('./mccStore');
          useMccStore.getState().fetchIncidents();
        } catch {
          // Ignore if mccStore not yet loaded
        }

        return id;
      },

      updateComplaintAI: async (id, aiResults) => {
        const isDup = aiResults.duplicates && !Array.isArray(aiResults.duplicates) && aiResults.duplicates.recommendation === 'duplicate';
        const rddCount = aiResults.rdd_detection?.detections?.length || 0;
        const litterCount = aiResults.litter_detection?.total_detected || 0;

        try {
          await supabase.from('complaints').update({
            ai_results: aiResults,
            ai_verification_status: aiResults.verification?.status || 'pending',
            ai_confidence: aiResults.verification?.confidence ? aiResults.verification.confidence.toString() : undefined,
            detected_category: aiResults.verification?.detected_category || undefined,
            is_duplicate: Boolean(isDup),
            duplicate_info: aiResults.duplicates || null,
            current_stage: 2,
          }).eq('id', id);

          await supabase.from('audit_logs').insert([{
            entity_type: 'complaint',
            entity_id: id,
            action: 'ai_processed',
            new_data: {
              verification: aiResults.verification?.status,
              is_duplicate: Boolean(isDup),
              rdd_count: rddCount,
              litter_count: litterCount,
            },
          }]);
        } catch (err) {
          console.warn('[CitizenStore] Remote updateComplaintAI sync skipped:', err);
        }

        set((state) => ({
          complaints: state.complaints.map(c => {
            if (c.id !== id) return c;
            return {
              ...c,
              aiResults,
              aiVerificationStatus: aiResults.verification?.status,
              aiConfidence: aiResults.verification?.confidence,
              detectedCategory: aiResults.verification?.detected_category || undefined,
              isDuplicate: Boolean(isDup),
              rddDetected: rddCount > 0,
              litterDetected: litterCount > 0,
              currentStage: 2,
            };
          })
        }));
      },

      updateResolutionAI: async (id, resolution) => {
        try {
          await supabase.from('complaints').update({
            resolution_verification: resolution,
            resolution_description: resolution.resolution?.reason || undefined,
            current_stage: 6,
          }).eq('id', id);

          await supabase.from('audit_logs').insert([{
            entity_type: 'complaint',
            entity_id: id,
            action: 'resolution_verified',
            new_data: {
              status: resolution.resolution?.status,
              similarity_score: resolution.resolution?.similarity_score,
            },
          }]);
        } catch (err) {
          console.warn('[CitizenStore] Remote updateResolutionAI sync skipped:', err);
        }

        set((state) => ({
          complaints: state.complaints.map(c => {
            if (c.id !== id) return c;
            return {
              ...c,
              resolutionVerification: resolution,
              currentStage: 6,
            };
          })
        }));
      },

      updateComplaintStatus: async (id, status, stage) => {
        const { error } = await supabase
          .from('complaints')
          .update({ status, current_stage: stage })
          .eq('id', id);

        if (!error) {
          set((state) => ({
            complaints: state.complaints.map(c =>
              c.id === id ? { ...c, status, currentStage: stage } : c
            ),
          }));
        }
      },

      confirmResolution: async (id, confirmed, _reason) => {
        const status = confirmed ? 'Closed' : 'In Progress';
        const stage = confirmed ? 8 : 3;

        const { error } = await supabase
          .from('complaints')
          .update({
            citizen_confirmed: confirmed,
            status: status,
            current_stage: stage
          })
          .eq('id', id);

        if (!error) {
          set((state) => ({
            complaints: state.complaints.map(c =>
              c.id === id ? { ...c, citizenConfirmed: confirmed, status, currentStage: stage } : c
            ),
          }));
        }
      },

      fetchNotifications: async () => {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          set({ notifications: data });
        }
      },

      addNotification: async (data) => {
        const id = `NOT-${Math.floor(1000 + Math.random() * 9000)}`;
        try {
          const { error } = await supabase
            .from('notifications')
            .insert([{
              id,
              title: data.title,
              message: data.message,
              complaint_id: data.complaintId,
              category: data.category,
              read: false
            }]);
          if (error) {
            console.warn('[CitizenStore] Remote notifications table offline (saving locally):', error.message);
          }
        } catch (err) {
          console.warn('[CitizenStore] Supabase addNotification network skipped:', err);
        }

        set((state) => ({ notifications: [{ ...data, id }, ...state.notifications] }));
        return id;
      },

      markNotificationAsRead: async (id) => {
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', id);

        if (!error) {
          set((state) => ({
            notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n),
          }));
        }
      },

      markAllNotificationsAsRead: async () => {
        const { error } = await supabase
          .from('notifications')
          .update({ read: true });

        if (!error) {
          set((state) => ({
            notifications: state.notifications.map(n => ({ ...n, read: true })),
          }));
        }
      },
    }),
    {
      name: 'citizen-storage',
    }
  )
);
