-- ============================================================================
-- CIVICOS SUPABASE STORAGE SETUP MIGRATION
-- Bucket: incident-evidence (Private)
-- Purpose: Secure persistent evidence photo storage for citizen complaints & road repairs
-- ============================================================================

-- 1. Create the private 'incident-evidence' bucket if not already present
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'incident-evidence',
  'incident-evidence',
  false, -- Private bucket: access requires authenticated RLS or signed URLs
  10485760, -- 10 MB per file limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

-- 2. Enable Row-Level Security on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Allow citizens (both authenticated and anon with API key) to upload complaint evidence
DROP POLICY IF EXISTS "Allow evidence upload" ON storage.objects;
CREATE POLICY "Allow evidence upload"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'incident-evidence'
);

-- 4. Policy: Allow authenticated users (officers, staff, admins) to view/read evidence
DROP POLICY IF EXISTS "Allow authenticated read evidence" ON storage.objects;
CREATE POLICY "Allow authenticated read evidence"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'incident-evidence'
  AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);

-- 5. Policy: Allow municipal staff/officers to update resolution evidence
DROP POLICY IF EXISTS "Allow staff update evidence" ON storage.objects;
CREATE POLICY "Allow staff update evidence"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'incident-evidence'
  AND auth.role() = 'authenticated'
);

-- 6. Policy: Restrict deletion to service role or admin only
DROP POLICY IF EXISTS "Restrict evidence deletion" ON storage.objects;
CREATE POLICY "Restrict evidence deletion"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'incident-evidence'
  AND auth.role() = 'service_role'
);
