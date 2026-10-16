// Prototype-only Supabase stub (no real backend wired).
//
// To enable real auth + persistence later:
// 1. Install the client: `npm install @supabase/supabase-js`
// 2. Create a `.env` file with:
//      VITE_SUPABASE_URL=https://your-project.supabase.co
//      VITE_SUPABASE_ANON_KEY=your-anon-key
// 3. Uncomment the code below.
//
// import { createClient } from "@supabase/supabase-js";
//
// const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
// const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
//
// if (!url || !anonKey) {
//   console.warn("[supabase] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — running in prototype mode.");
// }
//
// export const supabase = createClient(url ?? "", anonKey ?? "");

// Prototype placeholder so the rest of the app can import without a dependency.
export const supabase = null;
export const isSupabaseConfigured = false;
