-- JobTrack private CV storage bucket (Fase 3, slice 1: CV only).
--
-- How to apply:
--   Dashboard SQL Editor runs without ownership on storage.buckets, so it
--   rejects section 1 below with 42501. Create the bucket in the Dashboard
--   Storage UI instead (name jobtrack-cvs, private, 5 MB limit, PDF/DOCX
--   mime allowlist), then run ONLY section 2 in the SQL Editor.
--   Section 1 is kept for service_role/psql applies. Apply after
--   0001_jobtrack_schema.sql (see supabase/README.md).
-- Re-running is safe (ON CONFLICT / DROP ... IF EXISTS guards).
--
-- Conventions (same as 0001):
--   - Users only ever touch their own objects: the first folder segment of
--     the object path must equal auth.uid()::text (layout "<uid>/<appId>/...").
--   - The bucket is private (public = false): the app reads files through
--     short-lived signed URLs (see src/lib/storage.ts getCvUrl), never
--     through public URLs.
--   - 5 MB size limit and PDF/DOCX mime allowlist are enforced here in SQL
--     and mirrored client-side (see src/lib/storage.ts) for early feedback.

-- ---------------------------------------------------------------------------
-- 1) Private bucket for CV uploads (5 MB max, PDF/DOCX only) — REFERENCE ONLY
-- ---------------------------------------------------------------------------
-- Dashboard note: the SQL Editor role is not owner of storage.buckets and
-- fails this INSERT with 42501. Create the bucket via Dashboard Storage UI
-- and SKIP to section 2 when applying from the editor. Keep this statement
-- for service_role / psql applies.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'jobtrack-cvs',
  'jobtrack-cvs',
  false,
  5242880,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

COMMENT ON TABLE storage.buckets IS 'JobTrack: jobtrack-cvs holds private per-user CV uploads (path layout <uid>/<applicationId>/<file>).';

-- ---------------------------------------------------------------------------
-- 2) Storage policies: authenticated users manage only their own folder
-- ---------------------------------------------------------------------------

-- INSERT: upload into your own folder only.
DROP POLICY IF EXISTS jobtrack_cvs_insert_own ON storage.objects;
CREATE POLICY jobtrack_cvs_insert_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'jobtrack-cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- SELECT: read (and sign URLs for) your own folder only.
DROP POLICY IF EXISTS jobtrack_cvs_select_own ON storage.objects;
CREATE POLICY jobtrack_cvs_select_own ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'jobtrack-cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE: replace/move your own files only.
DROP POLICY IF EXISTS jobtrack_cvs_update_own ON storage.objects;
CREATE POLICY jobtrack_cvs_update_own ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'jobtrack-cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'jobtrack-cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE: remove your own files only.
DROP POLICY IF EXISTS jobtrack_cvs_delete_own ON storage.objects;
CREATE POLICY jobtrack_cvs_delete_own ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'jobtrack-cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
