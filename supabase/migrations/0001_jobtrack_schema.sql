-- JobTrack initial schema (Fase 2, slice 1: schema only, no app wiring yet).
--
-- How to apply: copy-paste this file into the Supabase Dashboard SQL Editor
-- and run it (see supabase/README.md). Do NOT run against production data
-- without a backup. Seeds in src/seed.ts stay local for now.
--
-- Conventions:
--   - All primary keys are uuid with gen_random_uuid() defaults.
--   - Every row carries user_id (auth.users.id) so RLS policies stay simple
--     (interest_points denormalizes user_id instead of joining applications).
--   - Dates from the app model (YYYY-MM-DD strings) map to DATE columns
--     (applied_at, deadline); timestamps map to timestamptz (created_at, updated_at).
--   - cv maps to jsonb: {"name": text, "size": text, "updatedAt": text} | null.
--   - images maps to text[] of private Supabase Storage object paths.

-- 1) UUID generation helper.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- 2) searches
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.searches IS 'JobTrack: a named job search grouping many applications.';
COMMENT ON COLUMN public.searches.user_id IS 'Owner (auth.users.id). RLS restricts rows to user_id = auth.uid().';
COMMENT ON COLUMN public.searches.created_at IS 'Creation timestamp. App model uses YYYY-MM-DD strings; DB stores timestamptz.';

-- ---------------------------------------------------------------------------
-- 3) applications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  search_id uuid NOT NULL REFERENCES public.searches (id) ON DELETE CASCADE,
  company text NOT NULL DEFAULT '',
  position text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  url text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Guardado'
    CONSTRAINT applications_status_check CHECK (status IN (
      'Guardado',
      'Aplicado',
      'Sin respuesta',
      'Revisión',
      'Entrevista',
      'Oferta',
      'Contratado',
      'Rechazado',
      'Retirado'
    )),
  applied_at date NOT NULL DEFAULT CURRENT_DATE,
  deadline date NULL,
  notes text NOT NULL DEFAULT '',
  cv jsonb NULL,
  images text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.applications IS 'JobTrack: a single job application belonging to one search.';
COMMENT ON COLUMN public.applications.status IS 'Must be one of the 9 exact STATUSES from src/types.ts.';
COMMENT ON COLUMN public.applications.applied_at IS 'App model appliedAt (YYYY-MM-DD) stored as DATE.';
COMMENT ON COLUMN public.applications.deadline IS 'Optional app model deadline (YYYY-MM-DD) stored as DATE.';
COMMENT ON COLUMN public.applications.cv IS 'Optional {name, size, updatedAt} object; null when no CV attached.';
COMMENT ON COLUMN public.applications.images IS 'Evidence image object paths in the private jobtrack-cvs Storage bucket.';

-- Indexes for the two most common access patterns: listing one search and
-- filtering by status.
CREATE INDEX IF NOT EXISTS applications_user_search_idx
  ON public.applications (user_id, search_id);
CREATE INDEX IF NOT EXISTS applications_status_idx
  ON public.applications (status);

-- ---------------------------------------------------------------------------
-- 4) interest_points
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.interest_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.applications (id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.interest_points IS 'JobTrack: InterestPoint items (app model Application.points) stored as rows.';
COMMENT ON COLUMN public.interest_points.user_id IS 'Denormalized owner so RLS policies stay simple (no join needed).';
COMMENT ON COLUMN public.interest_points.application_id IS 'Parent application; cascade delete removes orphan points.';

CREATE INDEX IF NOT EXISTS interest_points_application_idx
  ON public.interest_points (application_id);

-- ---------------------------------------------------------------------------
-- 5) updated_at auto-refresh trigger (shared by all three tables)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_updated_at() IS 'Sets updated_at = now() on every UPDATE.';

DROP TRIGGER IF EXISTS searches_updated_at ON public.searches;
CREATE TRIGGER searches_updated_at
  BEFORE UPDATE ON public.searches
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS applications_updated_at ON public.applications;
CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS interest_points_updated_at ON public.interest_points;
CREATE TRIGGER interest_points_updated_at
  BEFORE UPDATE ON public.interest_points
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 6) Row Level Security: users only ever see their own rows
-- ---------------------------------------------------------------------------
ALTER TABLE public.searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interest_points ENABLE ROW LEVEL SECURITY;

-- searches policies
DROP POLICY IF EXISTS searches_select_own ON public.searches;
CREATE POLICY searches_select_own ON public.searches
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS searches_insert_own ON public.searches;
CREATE POLICY searches_insert_own ON public.searches
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS searches_update_own ON public.searches;
CREATE POLICY searches_update_own ON public.searches
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS searches_delete_own ON public.searches;
CREATE POLICY searches_delete_own ON public.searches
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- applications policies
DROP POLICY IF EXISTS applications_select_own ON public.applications;
CREATE POLICY applications_select_own ON public.applications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS applications_insert_own ON public.applications;
CREATE POLICY applications_insert_own ON public.applications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS applications_update_own ON public.applications;
CREATE POLICY applications_update_own ON public.applications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS applications_delete_own ON public.applications;
CREATE POLICY applications_delete_own ON public.applications
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- interest_points policies (denormalized user_id keeps these simple, no join).
DROP POLICY IF EXISTS interest_points_select_own ON public.interest_points;
CREATE POLICY interest_points_select_own ON public.interest_points
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS interest_points_insert_own ON public.interest_points;
CREATE POLICY interest_points_insert_own ON public.interest_points
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS interest_points_update_own ON public.interest_points;
CREATE POLICY interest_points_update_own ON public.interest_points
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS interest_points_delete_own ON public.interest_points;
CREATE POLICY interest_points_delete_own ON public.interest_points
  FOR DELETE TO authenticated USING (user_id = auth.uid());
