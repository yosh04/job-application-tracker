# JobTrack Supabase schema

Slice 1 of Fase 2: database schema only. No app wiring yet.

## What this is

- `migrations/0001_jobtrack_schema.sql` creates three tables:
  `searches`, `applications`, `interest_points`, plus indexes,
  `updated_at` triggers, and Row Level Security (RLS) policies so each
  authenticated user only sees their own rows.
- The app still uses local seeds (`src/seed.ts`). App wiring against
  Supabase comes in the next slice.

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

- No `.env` or app code changes in this slice.
- Seeds stay local for now; data migration comes later.
- RLS is defined here but untested against a live project until you
  apply the SQL in the Dashboard.

## Migration 0002 — private CV storage bucket (Fase 3, slice 1)

`migrations/0002_jobtrack_storage.sql` creates the private bucket
`jobtrack-cvs` (CV uploads only; evidence images stay data-URL until the
next slice).

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

### Notes

- The bucket is **private**: the app reads CVs through short-lived signed
  URLs (1h, see `src/lib/storage.ts`), never public URLs.
- 5 MB size limit and the PDF/DOCX allowlist are enforced in SQL and
  mirrored client-side for early feedback.
