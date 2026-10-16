import { supabase } from "./supabaseClient";
import { copyEvidenceToApplication, isStorageEvidencePath } from "./storage";
import { initialApplicationActivity } from "./applicationActivity";
import { MAX_EVIDENCE_IMAGES, type Application, type ApplicationActivity, type CVFile, type InterestPoint, type Search, type Status } from "../types";

// Supabase persistence layer for the user's workspace.
//
// Mapping notes (see supabase/migrations/0001_jobtrack_schema.sql):
// - App ids are strings; persisted rows use DB uuid strings (replaces uid()).
// - App YYYY-MM-DD strings map to DATE columns (applied_at, deadline) and to
//   the day part of timestamptz columns (created_at, updated_at).
// - cv passes through as jsonb ({name, size, updatedAt, path?} | null).
// - images passes through as text[]: Storage paths for new uploads
//   (see storage.ts convention), legacy data-URLs / http URLs untouched.
// - points are interest_points rows grouped by application_id.
// - activity is stored as append-only application_activity rows.
// - Every write stamps user_id from the active session (RLS requires it).

interface SearchRow {
  id: string;
  user_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface ApplicationRow {
  id: string;
  user_id: string;
  search_id: string;
  company: string;
  position: string;
  location: string;
  url: string;
  status: string;
  applied_at: string;
  deadline: string | null;
  notes: string;
  cv: CVFile | null;
  images: string[] | null;
  created_at: string;
  updated_at: string;
}

interface ApplicationActivityRow {
  id: string;
  application_id: string;
  label: string;
  details: string | null;
  created_at: string;
}

interface InterestPointRow {
  id: string;
  user_id: string;
  application_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  searches: Search[];
  applications: Application[];
}

export type SearchInput = { name: string; description: string };
export type ApplicationInput = Omit<Application, "id" | "createdAt" | "updatedAt"> & {
  activity?: ApplicationActivity[];
};

function getClient() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

async function requireUserId(): Promise<string> {
  const client = getClient();
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  const id = data.user?.id;
  // Fail fast with a clear message: RLS policies deny anonymous access anyway.
  if (!id) throw new Error("No active session: RLS denies access without auth.uid().");
  return id;
}

async function insertActivityEntries(
  applicationId: string,
  userId: string,
  entries: ApplicationActivity[],
): Promise<void> {
  if (entries.length === 0) return;
  const client = getClient();
  const { error } = await client.from("application_activity").insert(
    entries.map((entry) => ({
      id: entry.id,
      user_id: userId,
      application_id: applicationId,
      label: entry.label,
      details: entry.details ?? null,
      created_at: entry.createdAt,
    })),
  );
  if (error) throw error;
}

/** DATE arrives as "YYYY-MM-DD"; timestamptz as full ISO — slice keeps YYYY-MM-DD. */
function toDay(value: string): string {
  return value.slice(0, 10);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Locally generated point ids are not DB uuids and must be inserted, not updated. */
function isUuid(id: string): boolean {
  return UUID_RE.test(id);
}

function mapSearch(row: SearchRow): Search {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    createdAt: toDay(row.created_at),
  };
}

function mapPoint(row: InterestPointRow): InterestPoint {
  return { id: row.id, title: row.title ?? "", content: row.content ?? "" };
}

function mapActivity(row: ApplicationActivityRow): ApplicationActivity {
  return {
    id: row.id,
    label: row.label,
    ...(row.details ? { details: row.details } : {}),
    createdAt: row.created_at,
  };
}

function mapApplication(
  row: ApplicationRow,
  points: InterestPoint[],
  activity: ApplicationActivity[],
): Application {
  return {
    id: row.id,
    searchId: row.search_id,
    company: row.company ?? "",
    position: row.position ?? "",
    location: row.location ?? "",
    url: row.url ?? "",
    status: row.status as Status,
    appliedAt: toDay(row.applied_at),
    ...(row.deadline ? { deadline: toDay(row.deadline) } : {}),
    notes: row.notes ?? "",
    points,
    cv: row.cv ?? null,
    images: row.images ?? [],
    activity,
    createdAt: toDay(row.created_at),
    updatedAt: toDay(row.updated_at),
  };
}

function toApplicationPayload(data: ApplicationInput) {
  return {
    search_id: data.searchId,
    company: data.company,
    position: data.position,
    location: data.location,
    url: data.url,
    status: data.status,
    applied_at: data.appliedAt,
    // Empty string means "no deadline" in the app model; store NULL instead.
    deadline: data.deadline ? data.deadline : null,
    notes: data.notes,
    cv: data.cv,
    images: data.images,
  };
}

/* ------------------------------------------------------------------ reads */

export async function loadWorkspace(): Promise<Workspace> {
  const client = getClient();
  await requireUserId();
  const [
    { data: searchRows, error: searchError },
    { data: appRows, error: appError },
    { data: pointRows, error: pointError },
    { data: activityRows, error: activityError },
  ] = await Promise.all([
    client.from("searches").select("*").order("created_at", { ascending: true }),
    client.from("applications").select("*").order("created_at", { ascending: true }),
    client.from("interest_points").select("*").order("created_at", { ascending: true }),
    client.from("application_activity").select("*").order("created_at", { ascending: true }).order("id", { ascending: true }),
  ]);
  if (searchError) throw searchError;
  if (appError) throw appError;
  if (pointError) throw pointError;
  if (activityError) throw activityError;
  const pointsByApp = new Map<string, InterestPoint[]>();
  for (const row of ((pointRows ?? []) as InterestPointRow[])) {
    const list = pointsByApp.get(row.application_id) ?? [];
    list.push(mapPoint(row));
    pointsByApp.set(row.application_id, list);
  }
  const activityByApp = new Map<string, ApplicationActivity[]>();
  for (const row of ((activityRows ?? []) as ApplicationActivityRow[])) {
    const list = activityByApp.get(row.application_id) ?? [];
    list.push(mapActivity(row));
    activityByApp.set(row.application_id, list);
  }
  return {
    searches: ((searchRows ?? []) as SearchRow[]).map(mapSearch),
    applications: ((appRows ?? []) as ApplicationRow[]).map((row) =>
      mapApplication(row, pointsByApp.get(row.id) ?? [], activityByApp.get(row.id) ?? []),
    ),
  };
}

async function fetchApplication(id: string): Promise<Application> {
  const client = getClient();
  const { data: row, error } = await client.from("applications").select("*").eq("id", id).single();
  if (error) throw error;
  const { data: pointRows, error: pointError } = await client
    .from("interest_points")
    .select("*")
    .eq("application_id", id)
    .order("created_at", { ascending: true });
  if (pointError) throw pointError;
  const { data: activityRows, error: activityError } = await client
    .from("application_activity")
    .select("*")
    .eq("application_id", id)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (activityError) throw activityError;
  return mapApplication(
    row as ApplicationRow,
    ((pointRows ?? []) as InterestPointRow[]).map(mapPoint),
    ((activityRows ?? []) as ApplicationActivityRow[]).map(mapActivity),
  );
}

/* ---------------------------------------------------------------- searches */

export async function createSearch(data: SearchInput): Promise<Search> {
  const client = getClient();
  const userId = await requireUserId();
  const { data: row, error } = await client
    .from("searches")
    .insert({ user_id: userId, name: data.name, description: data.description })
    .select()
    .single();
  if (error) throw error;
  return mapSearch(row as SearchRow);
}

export async function updateSearch(id: string, data: SearchInput): Promise<Search> {
  const client = getClient();
  await requireUserId();
  const { data: row, error } = await client
    .from("searches")
    .update({ name: data.name, description: data.description })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return mapSearch(row as SearchRow);
}

export async function deleteSearch(id: string): Promise<void> {
  const client = getClient();
  await requireUserId();
  // Cascades to applications + interest_points via foreign keys.
  const { error } = await client.from("searches").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------------------------------------ applications */

/**
 * Reconciles nested points: deletes rows missing from the current list, then
 * updates rows with DB uuids and inserts rows with local-only ids (letting
 * Postgres generate their uuids). Returns points with resolved DB ids.
 */
async function syncPoints(
  applicationId: string,
  userId: string,
  points: InterestPoint[],
): Promise<InterestPoint[]> {
  const client = getClient();
  const { data: existing, error: fetchError } = await client
    .from("interest_points")
    .select("id")
    .eq("application_id", applicationId);
  if (fetchError) throw fetchError;
  const existingIds = new Set(((existing ?? []) as { id: string }[]).map((r) => r.id));
  const keepIds = new Set(points.filter((p) => isUuid(p.id)).map((p) => p.id));
  const staleIds = [...existingIds].filter((id) => !keepIds.has(id));
  if (staleIds.length > 0) {
    const { error } = await client.from("interest_points").delete().in("id", staleIds);
    if (error) throw error;
  }
  const resolved: InterestPoint[] = [];
  for (const point of points) {
    if (isUuid(point.id) && existingIds.has(point.id)) {
      const { data, error } = await client
        .from("interest_points")
        .update({ title: point.title, content: point.content })
        .eq("id", point.id)
        .select()
        .single();
      if (error) throw error;
      resolved.push(mapPoint(data as InterestPointRow));
    } else {
      const { data, error } = await client
        .from("interest_points")
        .insert({
          user_id: userId,
          application_id: applicationId,
          title: point.title,
          content: point.content,
        })
        .select()
        .single();
      if (error) throw error;
      resolved.push(mapPoint(data as InterestPointRow));
    }
  }
  return resolved;
}

export async function createApplication(data: ApplicationInput): Promise<Application> {
  const client = getClient();
  const userId = await requireUserId();
  const { data: row, error } = await client
    .from("applications")
    .insert({
      ...toApplicationPayload(data),
      user_id: userId,
    })
    .select()
    .single();
  if (error) throw error;
  const appRow = row as ApplicationRow;
  if (data.points.length > 0) await syncPoints(appRow.id, userId, data.points);
  await insertActivityEntries(
    appRow.id,
    userId,
    data.activity?.length ? data.activity : initialApplicationActivity(data.status),
  );
  return fetchApplication(appRow.id);
}

export async function updateApplication(id: string, data: ApplicationInput): Promise<Application> {
  const client = getClient();
  const userId = await requireUserId();
  const { data: row, error } = await client
    .from("applications")
    .update(toApplicationPayload(data))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  const appRow = row as ApplicationRow;
  await syncPoints(appRow.id, userId, data.points);
  await insertActivityEntries(appRow.id, userId, data.activity ?? []);
  return fetchApplication(appRow.id);
}

export async function duplicateApplication(source: Application): Promise<Application> {
  // Points carry an empty id so syncPoints inserts fresh rows with new uuids.
  // Evidence: legacy entries (data-URL / http) copy by value; stored files
  // are COPIED (download + re-upload) into the new application's folder so
  // the duplicate owns its objects and deleting one side never breaks the
  // other. A failed copy falls back to the shared source path so no image
  // is silently lost.
  const userId = await requireUserId();
  const sourceImages = (source.images ?? []).slice(0, MAX_EVIDENCE_IMAGES);
  const legacy = sourceImages.filter((v) => !isStorageEvidencePath(v));
  const stored = sourceImages.filter(isStorageEvidencePath);
  const created = await createApplication({
    searchId: source.searchId,
    company: `${source.company} (copia)`,
    position: source.position,
    location: source.location,
    url: source.url,
    status: source.status,
    appliedAt: source.appliedAt,
    ...(source.deadline ? { deadline: source.deadline } : {}),
    notes: source.notes,
    points: source.points.map((p) => ({ id: "", title: p.title, content: p.content })),
    cv: source.cv,
    images: [...legacy],
  });
  if (stored.length === 0) return created;
  const copied: string[] = [];
  for (const path of stored) {
    try {
      copied.push(await copyEvidenceToApplication(userId, path, created.id));
    } catch (err) {
      console.error("[storage] copyEvidenceToApplication failed, sharing source path", err);
      copied.push(path);
    }
  }
  return patchApplication(created.id, { images: [...legacy, ...copied] });
}

export async function moveApplication(id: string, searchId: string): Promise<Application> {
  const client = getClient();
  await requireUserId();
  const { error } = await client.from("applications").update({ search_id: searchId }).eq("id", id);
  if (error) throw error;
  return fetchApplication(id);
}

export async function deleteApplication(id: string): Promise<void> {
  const client = getClient();
  await requireUserId();
  // Cascades to interest_points via foreign key.
  const { error } = await client.from("applications").delete().eq("id", id);
  if (error) throw error;
}

/** Generic scalar patch (status, notes, cv, images, ...). Syncs points when included. */
export async function patchApplication(id: string, patch: Partial<Application>): Promise<Application> {
  const client = getClient();
  const userId = await requireUserId();
  const row: Record<string, unknown> = {};
  if (patch.searchId !== undefined) row.search_id = patch.searchId;
  if (patch.company !== undefined) row.company = patch.company;
  if (patch.position !== undefined) row.position = patch.position;
  if (patch.location !== undefined) row.location = patch.location;
  if (patch.url !== undefined) row.url = patch.url;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.appliedAt !== undefined) row.applied_at = patch.appliedAt;
  if (patch.deadline !== undefined) row.deadline = patch.deadline ? patch.deadline : null;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.cv !== undefined) row.cv = patch.cv;
  if (patch.images !== undefined) row.images = patch.images;
  if (patch.activity !== undefined) row.activity = patch.activity;
  if (Object.keys(row).length > 0) {
    const { error } = await client.from("applications").update(row).eq("id", id);
    if (error) throw error;
  }
  if (patch.points !== undefined) {
    await syncPoints(id, userId, patch.points);
  }
  if (patch.activity !== undefined) await insertActivityEntries(id, userId, patch.activity);
  return fetchApplication(id);
}

/* ------------------------------------------------------------------ points */

export async function addPoint(
  applicationId: string,
  title: string,
  content: string,
): Promise<InterestPoint> {
  const client = getClient();
  const userId = await requireUserId();
  const { data, error } = await client
    .from("interest_points")
    .insert({ user_id: userId, application_id: applicationId, title, content })
    .select()
    .single();
  if (error) throw error;
  return mapPoint(data as InterestPointRow);
}

export async function savePoint(pointId: string, title: string, content: string): Promise<void> {
  const client = getClient();
  await requireUserId();
  const { error } = await client
    .from("interest_points")
    .update({ title, content })
    .eq("id", pointId);
  if (error) throw error;
}

export async function deletePoint(pointId: string): Promise<void> {
  const client = getClient();
  await requireUserId();
  const { error } = await client.from("interest_points").delete().eq("id", pointId);
  if (error) throw error;
}
