import { supabase } from "./supabaseClient";
import type { Application, CVFile, InterestPoint, Search, Status } from "../types";

// Supabase persistence layer (Fase 2, slice 2: wiring only, UI untouched).
//
// Mapping notes (see supabase/migrations/0001_jobtrack_schema.sql):
// - App ids are strings; persisted rows use DB uuid strings (replaces uid()).
// - App YYYY-MM-DD strings map to DATE columns (applied_at, deadline) and to
//   the day part of timestamptz columns (created_at, updated_at).
// - cv passes through as jsonb ({name, size, updatedAt} | null).
// - images passes through as text[] (data-URLs today, Storage URLs later).
// - points are interest_points rows grouped by application_id.
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
export type ApplicationInput = Omit<Application, "id" | "createdAt" | "updatedAt">;

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

/** DATE arrives as "YYYY-MM-DD"; timestamptz as full ISO — slice keeps YYYY-MM-DD. */
function toDay(value: string): string {
  return value.slice(0, 10);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Local prototype ids (uid("p_...")) are not DB uuids and must be inserted, not updated. */
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

function mapApplication(row: ApplicationRow, points: InterestPoint[]): Application {
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
  ] = await Promise.all([
    client.from("searches").select("*").order("created_at", { ascending: true }),
    client.from("applications").select("*").order("created_at", { ascending: true }),
    client.from("interest_points").select("*").order("created_at", { ascending: true }),
  ]);
  if (searchError) throw searchError;
  if (appError) throw appError;
  if (pointError) throw pointError;
  const pointsByApp = new Map<string, InterestPoint[]>();
  for (const row of ((pointRows ?? []) as InterestPointRow[])) {
    const list = pointsByApp.get(row.application_id) ?? [];
    list.push(mapPoint(row));
    pointsByApp.set(row.application_id, list);
  }
  return {
    searches: ((searchRows ?? []) as SearchRow[]).map(mapSearch),
    applications: ((appRows ?? []) as ApplicationRow[]).map((row) =>
      mapApplication(row, pointsByApp.get(row.id) ?? []),
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
  return mapApplication(row as ApplicationRow, ((pointRows ?? []) as InterestPointRow[]).map(mapPoint));
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
    .insert({ ...toApplicationPayload(data), user_id: userId })
    .select()
    .single();
  if (error) throw error;
  const appRow = row as ApplicationRow;
  const points = data.points.length > 0 ? await syncPoints(appRow.id, userId, data.points) : [];
  return mapApplication(appRow, points);
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
  const points = await syncPoints(appRow.id, userId, data.points);
  return mapApplication(appRow, points);
}

export async function duplicateApplication(source: Application): Promise<Application> {
  // Points carry an empty id so syncPoints inserts fresh rows with new uuids.
  return createApplication({
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
    images: [...source.images],
  });
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
  if (Object.keys(row).length > 0) {
    const { error } = await client.from("applications").update(row).eq("id", id);
    if (error) throw error;
  }
  if (patch.points !== undefined) {
    await syncPoints(id, userId, patch.points);
  }
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
