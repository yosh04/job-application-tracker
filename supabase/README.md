# JobTrack Supabase schema

Schema, migrations and runtime integration for JobTrack's Supabase backend.

## What this is

- `migrations/0001_jobtrack_schema.sql` creates three tables:
  `searches`, `applications`, `interest_points`, plus indexes,
  `updated_at` triggers, and Row Level Security (RLS) policies so each
  authenticated user only sees their own rows.
- `migrations/0003_application_activity.sql` adds an append-only activity table.
  The app records status, detail, notes, CV, evidence, and interest-point
  changes so later updates cannot replace earlier timeline entries.
- When `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured,
  the app uses Supabase Auth and reads/writes the signed-in user's workspace.
- Without those variables, the app runs in prototype mode using local sample
  data. Sample data is never uploaded automatically; the signed-in empty
  workspace offers an explicit import action.
- CV files and evidence images use the private `jobtrack-cvs` Storage bucket.
  The bucket's current MIME allowlist must include image types before evidence
  uploads will succeed.

## How to apply (Supabase Dashboard SQL Editor)

1. Open your Supabase project → **SQL Editor** → **New query**.
2. Copy the full contents of `migrations/0001_jobtrack_schema.sql`,
   paste them into the editor, and press **Run**.
3. Required order: the file is self-ordered (extension → `searches` →
   `applications` → `interest_points` → triggers → RLS). Run it once,
   top to bottom. Re-running is safe (`IF NOT EXISTS` /
   `CREATE OR REPLACE` / `DROP ... IF EXISTS` where easy).
4. Do this once per Supabase project (e.g. dev first, prod later).

## How to verify

In the same SQL Editor, run:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('searches', 'applications', 'interest_points');

select policyname, cmd, roles
from pg_policies
where schemaname = 'public'
order by tablename, cmd;
```

Expected: three tables listed, and 12 policies (select/insert/update/delete
× three tables), all scoped to the `authenticated` role with
`user_id = auth.uid()`.

## Notes

- Keep `.env` files out of version control; use `.env.example` as the template.
- RLS policies are defined here, but must be verified against the live
  Supabase project during deployment.

## Migration 0002 — private CV storage bucket (Fase 3, slice 1)

`migrations/0002_jobtrack_storage.sql` defines policies for the private
`jobtrack-cvs` bucket, which stores CV files and evidence images.

### How to apply

1. Apply `0001_jobtrack_schema.sql` first if you have not already.
2. Create the bucket in the Dashboard **Storage** UI (the SQL Editor role
   cannot write `storage.buckets` and fails with `42501`): **New bucket**,
   name `jobtrack-cvs`, **Private** ON, file size limit `5242880` (5 MB),
   allowed MIME types `application/pdf`, `application/msword`,
   `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
3. Open **SQL Editor** → **New query**, paste ONLY section 2 of
   `migrations/0002_jobtrack_storage.sql` (from `-- 2) Storage policies`
   to the end of the file), and press **Run**.
4. Re-running section 2 is safe (`DROP ... IF EXISTS` guards).

### How to verify

In the same SQL Editor, run:

```sql
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'jobtrack-cvs';

select policyname, cmd, roles
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and policyname like 'jobtrack_cvs\_%';
```

Expected: one bucket row (`public = false`), and four policies
(insert/select/update/delete) scoped to the `authenticated` role with
`(storage.foldername(name))[1] = auth.uid()::text`.

## Frontend verification

From the repository root, run:

```sh
npm test
npm run build
```

The tests cover URL/date/CV validation, combined dashboard filters, keyboard
navigation and focus trapping, and the create/duplicate/edit/move/delete flow.

### Notes

- The bucket is **private**: the app reads CVs through short-lived signed
  URLs (1h, see `src/lib/storage.ts`), never public URLs.
- 5 MB size limit and the PDF/DOCX allowlist are enforced in SQL and
  mirrored client-side for early feedback.

## Migration 0003 — application activity history

If `0001_jobtrack_schema.sql` has already been applied, run
`migrations/0003_application_activity.sql` in the Supabase SQL Editor. It adds
the `application_activity` table with row-level security for reading and
inserting only the signed-in user's own events. Existing applications remain
intact; their future changes are recorded in the new timeline.
