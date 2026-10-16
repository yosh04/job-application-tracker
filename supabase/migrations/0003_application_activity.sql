-- Activity is stored as append-only rows so separate edits cannot replace one
-- another when they reach the database close together.
CREATE TABLE IF NOT EXISTS public.application_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.applications (id) ON DELETE CASCADE,
  label text NOT NULL,
  details text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS application_activity_application_created_idx
  ON public.application_activity (application_id, created_at, id);

ALTER TABLE public.application_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS application_activity_select_own ON public.application_activity;
CREATE POLICY application_activity_select_own ON public.application_activity
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS application_activity_insert_own ON public.application_activity;
CREATE POLICY application_activity_insert_own ON public.application_activity
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.applications
      WHERE applications.id = application_activity.application_id
        AND applications.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.application_activity IS
  'Append-only activity timeline for JobTrack applications.';
