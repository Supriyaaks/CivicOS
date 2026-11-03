-- =========================================================================
-- CIVICOS MASTER CLOUD DATABASE MIGRATION & RLS POLICIES
-- Architecture: Person 4 (Cloud Backend & Supabase Integration)
-- Scope: Full Database Schema, Storage Configuration, and AI Result Persistence
-- =========================================================================

-- 1. TYPES & ENUMS (Idempotent creation)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('citizen', 'officer', 'staff', 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE complaint_status AS ENUM ('Pending', 'In Progress', 'Awaiting Verification', 'Resolved', 'Closed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM (
    'Dispatching', 'Accepted', 'Travelling', 'Arrived', 'In Progress',
    'Paused', 'Blocked', 'Completed', 'Awaiting Verification',
    'Under Review', 'Verified', 'Rework Required', 'Rework In Progress',
    'Resubmitted', 'Rejected'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE blocker_category AS ENUM ('Material', 'Permit', 'Weather', 'Access', 'Other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE journal_category AS ENUM ('Work', 'Issue', 'Material', 'Observation', 'General');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE evidence_category AS ENUM ('Before Work', 'During Work', 'After Work', 'Additional Inspection', 'Other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. CORE MUNICIPAL TABLES
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  staff_count INTEGER DEFAULT 0,
  workload TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role user_role DEFAULT 'citizen',
  dept_id TEXT REFERENCES departments(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Complaints table with integrated Person 2 AI schemas
CREATE TABLE IF NOT EXISTS complaints (
  id TEXT PRIMARY KEY,
  citizen_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status complaint_status DEFAULT 'Pending',
  assigned_dept_id TEXT REFERENCES departments(id),
  supporting_depts TEXT[],
  evidence_url TEXT,
  ai_confidence TEXT,
  root_cause TEXT,
  impact_score INTEGER,
  cascade_risk TEXT[],
  progress INTEGER DEFAULT 0,
  current_stage INTEGER DEFAULT 1,
  resolution_date TIMESTAMPTZ,
  resolution_description TEXT,
  resolution_evidence TEXT,
  citizen_confirmed BOOLEAN DEFAULT FALSE,
  
  -- Person 2 AI Orchestrator Result Persistence Columns
  ai_verification_status TEXT DEFAULT 'pending',
  detected_category TEXT,
  is_duplicate BOOLEAN DEFAULT FALSE,
  duplicate_info JSONB,
  ai_results JSONB,
  resolution_verification JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id TEXT REFERENCES complaints(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id),
  status task_status DEFAULT 'Dispatching',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Operational Audit Logs Table (Tracks Lifecycle & AI Transitions)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'complaint', 'assignment', 'ai_verification'
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,      -- 'complaint_created', 'ai_processed', 'status_changed', 'resolution_verified', etc.
  performed_by UUID REFERENCES profiles(id),
  old_data JSONB,
  new_data JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 3. FIELD OPERATIONAL DATA TABLES
CREATE TABLE IF NOT EXISTS work_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  pause_time TIMESTAMPTZ,
  status TEXT,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  item_label TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  is_required BOOLEAN DEFAULT TRUE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blockers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  category blocker_category,
  description TEXT NOT NULL,
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  reported_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resource_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  urgency TEXT,
  status TEXT DEFAULT 'Requested',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  category journal_category,
  description TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  category evidence_category,
  description TEXT,
  file_name TEXT,
  file_size INTEGER,
  file_type TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS verification_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  summary TEXT,
  evidence_ids UUID[],
  checklist_state JSONB,
  status TEXT DEFAULT 'Pending',
  officer_feedback JSONB,
  submitted_by UUID REFERENCES profiles(id),
  verified_by UUID REFERENCES profiles(id),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  complaint_id TEXT REFERENCES complaints(id),
  category TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PERFORMANCE & LOOKUP INDEXES
CREATE INDEX IF NOT EXISTS idx_complaints_citizen ON complaints(citizen_id);
CREATE INDEX IF NOT EXISTS idx_complaints_dept ON complaints(assigned_dept_id);
CREATE INDEX IF NOT EXISTS idx_complaints_ai_status ON complaints(ai_verification_status);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_created ON complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assignments_complaint ON assignments(complaint_id);
CREATE INDEX IF NOT EXISTS idx_assignments_staff ON assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- 5. USER REGISTRATION TRIGGER (Links Supabase Auth to Profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Citizen User'),
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'citizen')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. STORAGE BUCKET CONFIGURATION (Incident Evidence Bucket - Private by Default)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'incident-evidence',
  'incident-evidence',
  false, -- Secure private bucket: access via signed URLs and RLS
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockers ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "View own profile" ON profiles;
CREATE POLICY "View own profile" ON profiles FOR SELECT USING (auth.uid() = id OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Update own profile info" ON profiles;
CREATE POLICY "Update own profile info" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Complaints Policies
DROP POLICY IF EXISTS "Citizens view own" ON complaints;
CREATE POLICY "Citizens view own" ON complaints FOR SELECT USING (
  auth.uid() = citizen_id OR citizen_id IS NULL OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'officer'))
);

DROP POLICY IF EXISTS "Citizens create own" ON complaints;
CREATE POLICY "Citizens create own" ON complaints FOR INSERT WITH CHECK (
  auth.uid() = citizen_id OR citizen_id IS NULL OR auth.role() = 'authenticated' OR auth.role() = 'anon'
);

DROP POLICY IF EXISTS "Officers view complaints" ON complaints;
CREATE POLICY "Officers view complaints" ON complaints FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'officer'))
);

DROP POLICY IF EXISTS "Officers update complaints" ON complaints;
CREATE POLICY "Officers update complaints" ON complaints FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'officer'))
);

-- Assignments Policies
DROP POLICY IF EXISTS "Staff view own" ON assignments;
CREATE POLICY "Staff view own" ON assignments FOR SELECT USING (
  auth.uid() = staff_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'officer'))
);

DROP POLICY IF EXISTS "Staff update own status" ON assignments;
CREATE POLICY "Staff update own status" ON assignments FOR UPDATE USING (auth.uid() = staff_id);

DROP POLICY IF EXISTS "Officers manage dept tasks" ON assignments;
CREATE POLICY "Officers manage dept tasks" ON assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'officer'))
);

-- Audit Logs Policies
DROP POLICY IF EXISTS "Officers view audit logs" ON audit_logs;
CREATE POLICY "Officers view audit logs" ON audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'officer'))
);

DROP POLICY IF EXISTS "Authenticated users log actions" ON audit_logs;
CREATE POLICY "Authenticated users log actions" ON audit_logs FOR INSERT WITH CHECK (true);

-- Notifications Policies
DROP POLICY IF EXISTS "View own notifications" ON notifications;
CREATE POLICY "View own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Update own notification read state" ON notifications;
CREATE POLICY "Update own notification read state" ON notifications FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- Storage Object Policies (Secure Private Bucket)
DROP POLICY IF EXISTS "Public Read Evidence" ON storage.objects;
DROP POLICY IF EXISTS "Allow Upload Evidence" ON storage.objects;
DROP POLICY IF EXISTS "Allow Update Evidence" ON storage.objects;
DROP POLICY IF EXISTS "Authorized Evidence Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Evidence Upload" ON storage.objects;

-- Allow authenticated and authorized uploads to incident-evidence
CREATE POLICY "Authenticated Evidence Upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'incident-evidence' AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
  );

-- Secure Read: Officers and Admins can view all evidence; Citizens can view their own complaint evidence
CREATE POLICY "Authorized Evidence Access" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'incident-evidence' AND (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'officer'))
      OR
      EXISTS (
        SELECT 1 FROM complaints 
        WHERE complaints.id = split_part(name, '/', 2) 
        AND (complaints.citizen_id = auth.uid() OR complaints.citizen_id IS NULL)
      )
      OR
      auth.role() = 'service_role'
    )
  );

CREATE POLICY "Allow Update Evidence" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'incident-evidence' AND (
      auth.uid() = owner OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'officer'))
    )
  );

-- 8. INITIAL MUNICIPAL SEED DATA
INSERT INTO departments (id, name, code, staff_count, workload) VALUES
  ('dept-roads', 'Roads & Infrastructure', 'ROADS', 12, 'Moderate'),
  ('dept-sanitation', 'Waste Management & Sanitation', 'SAN', 18, 'High'),
  ('dept-electrical', 'Electrical & Street Lighting', 'ELEC', 8, 'Low'),
  ('dept-water', 'Water Supply & Drainage', 'WATER', 10, 'Moderate'),
  ('dept-traffic', 'Traffic & Public Safety', 'TRAF', 6, 'Low')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  staff_count = EXCLUDED.staff_count,
  workload = EXCLUDED.workload;
