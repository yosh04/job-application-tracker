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
  and table_name in ('searches', 'applications', 'interest_points', 'application_activity');

select policyname, cmd, roles
from pg_policies
where schemaname = 'public'
order by tablename, cmd;
```

Expected: four tables listed, and 14 policies: select/insert/update/delete
× the three workspace tables, plus select/insert on `application_activity`.
All are scoped to the `authenticated` role and the signed-in user.

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
   `application/vnd.openxmlformats-officedocument.wordprocessingml.document`,
   `image/jpeg`, `image/png`, `image/webp`, and `image/gif`. If the bucket
   already exists, edit its **Allowed MIME types** to include all seven.
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
- 5 MB size limit and the CV/image allowlist are enforced by the bucket and
  mirrored client-side for early feedback.

## Migration 0003 — application activity history

Run `migrations/0003_application_activity.sql` after `0001_jobtrack_schema.sql`
in the Supabase SQL Editor. It adds
the `application_activity` table with row-level security for reading and
inserting only the signed-in user's own events. Existing applications remain
intact; their future changes are recorded in the new timeline.

## Netlify deployment

The repository's `netlify.toml` sets the build command (`npm run build`),
publish directory (`dist`), Node 22, and SPA fallback routing. Production
builds fail if either Supabase variable is missing. Before the first deploy:

1. Apply migrations `0001_jobtrack_schema.sql` and
   `0003_application_activity.sql`, configure the private Storage bucket and
   its policies as described above, then verify the tables and policies.
2. In Netlify, configure `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` for the production deploy context. Configure them
   for preview contexts too if you want previews to use Supabase.
3. In Supabase **Authentication → URL Configuration**, set the Netlify site
   URL as the Site URL and add the site URL (and any custom domain) to the
   allowed redirect URLs. If you use deploy previews, add the Netlify preview
   pattern `https://**--<site-name>.netlify.app/**` too. Email confirmation
   and password recovery now redirect to the current app origin, so add the
   exact local development origin as well (for example
   `http://localhost:5173/**` or `http://127.0.0.1:5175/**`, matching the URL
   you actually use).
4. If you enable Google OAuth, register the Supabase callback URL shown in
   the Supabase Google provider settings with Google; the Netlify site URL is
   the allowed post-login redirect, not Google's OAuth callback URL.
5. Deploy, then verify sign-up/sign-in/sign-out, data isolation with separate
   users, CV upload/download, evidence image upload, and application activity.

The Supabase anon/publishable key is intended for browser use; keep service
role keys and other secrets out of `VITE_*` variables and client code.
