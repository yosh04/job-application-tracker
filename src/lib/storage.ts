import { supabase } from "./supabaseClient";
import { todayISO } from "../types";
import { validateCvFile as getCvFileValidationError } from "./validation";
export { CV_MAX_BYTES } from "./validation";

// Supabase Storage helpers (Fase 3: CV in slice 1, evidence images in slice 2).
//
// Bucket: private `jobtrack-cvs` (reused for evidence — no new bucket).
// Layout: "<userId>/<applicationId>/cv-<timestamp>-<sanitizedName>"
//         "<userId>/<applicationId>/evidence-<timestamp>-<sanitizedName>"
// Path-based storage policies ("own folder") already cover the evidence prefix.
//
// images[] CONVENTION: the array stores Supabase Storage object paths
// (relative keys, e.g. "uid/app-id/evidence-1234-shot.png") for new uploads.
// Legacy entries keep rendering as before: values starting with "data:",
// "http", or "blob:" (local object-URL previews) are used directly as <img>
// src; anything else is treated as a storage path and resolved through a
// short-lived signed URL (see isStorageEvidencePath + getEvidenceUrl).
//
// The bucket must allow PDF/DOC/DOCX plus JPEG/PNG/WEBP/GIF MIME types for
// CV and evidence uploads to succeed.

export const CV_BUCKET = "jobtrack-cvs";

export interface UploadedCv {
  path: string;
  name: string;
  size: string;
  updatedAt: string;
}

function getClient() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

async function requireUserId(): Promise<string> {
  const client = getClient();
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  const id = data.user?.id;
  // Fail fast with a clear message: storage policies deny anonymous access anyway.
  if (!id) throw new Error("No active session: storage policies deny access without auth.uid().");
  return id;
}

/** 245760 -> "240 KB". Matches the display format used by CV metadata. */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/** Strips path segments and unsafe chars so the name is safe inside a storage key. */
function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "cv";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
  return cleaned.slice(0, 120) || "cv";
}

function validateCvFile(file: File): void {
  const error = getCvFileValidationError(file);
  if (error) throw new Error(error);
}

/**
 * Uploads a CV into the caller's own folder and returns the metadata stored
 * in the application row (cv jsonb). Throws on invalid type/size or when
 * there is no active session.
 */
export async function uploadCv(
  userId: string,
  applicationId: string,
  file: File,
): Promise<UploadedCv> {
  const client = getClient();
  const sessionId = await requireUserId();
  if (sessionId !== userId) {
    throw new Error("Session user does not match the target upload folder.");
  }
  validateCvFile(file);
  const path = `${userId}/${applicationId}/cv-${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error } = await client.storage.from(CV_BUCKET).upload(path, file, { upsert: true });
  if (error) throw error;
  return {
    path,
    name: file.name,
    size: formatFileSize(file.size),
    updatedAt: todayISO(),
  };
}

/** Returns a short-lived (1h) signed URL for a private CV object. */
export async function getCvUrl(path: string): Promise<string> {
  const client = getClient();
  await requireUserId();
  const { data, error } = await client.storage.from(CV_BUCKET).createSignedUrl(path, 3600);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error("Could not generate a signed URL for this CV.");
  return data.signedUrl;
}

/** Downloads a private CV object as a Blob. */
export async function downloadCvBlob(path: string): Promise<Blob> {
  const client = getClient();
  await requireUserId();
  const { data, error } = await client.storage.from(CV_BUCKET).download(path);
  if (error) throw error;
  if (!data) throw new Error("CV download returned no data.");
  return data;
}

/** Downloads a private CV object through a temporary anchor element. */
export async function downloadCv(path: string, filename: string): Promise<void> {
  const data = await downloadCvBlob(path);
  const url = URL.createObjectURL(data);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Removes CV objects from private storage. No-op for an empty list. */
export async function deleteCv(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const client = getClient();
  await requireUserId();
  const { error } = await client.storage.from(CV_BUCKET).remove(paths);
  if (error) throw error;
}

/* ------------------------------------------------------- evidence images */

export const EVIDENCE_BUCKET = CV_BUCKET;

/** 5 MB max per evidence image (mirrors the CV limit; keeps duplicates cheap). */
export const EVIDENCE_MAX_BYTES = 5 * 1024 * 1024;

const EVIDENCE_ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif"];

/**
 * True when an images[] entry is a Supabase Storage path needing a signed
 * URL. Legacy data-URLs, remote http(s) URLs, and local blob: previews
 * render directly and return false.
 */
export function isStorageEvidencePath(value: string): boolean {
  return !(
    value.startsWith("data:") ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("blob:")
  );
}

function validateEvidenceFile(file: File): void {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  // Extension allowlist is early client-side feedback only; the bucket also
  // enforces allowed_mime_types server-side.
  if (!EVIDENCE_ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error("Only PNG, JPG, JPEG, WEBP or GIF images are allowed.");
  }
  if (file.size > EVIDENCE_MAX_BYTES) {
    throw new Error("Image exceeds the 5 MB limit.");
  }
}

/**
 * Uploads an evidence image into the caller's own application folder and
 * returns the storage path to store in images[]. Throws on invalid
 * type/size, missing session, or server-side rejection (e.g. bucket mime
 * allowlist without image types).
 */
export async function uploadEvidence(
  userId: string,
  applicationId: string,
  file: File,
): Promise<string> {
  const client = getClient();
  const sessionId = await requireUserId();
  if (sessionId !== userId) {
    throw new Error("Session user does not match the target upload folder.");
  }
  validateEvidenceFile(file);
  const path = `${userId}/${applicationId}/evidence-${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error } = await client.storage.from(EVIDENCE_BUCKET).upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

/** Returns a short-lived (1h) signed URL for a private evidence object. */
export async function getEvidenceUrl(path: string): Promise<string> {
  const client = getClient();
  await requireUserId();
  const { data, error } = await client.storage.from(EVIDENCE_BUCKET).createSignedUrl(path, 3600);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error("Could not generate a signed URL for this image.");
  return data.signedUrl;
}

/** Downloads a private evidence object as a Blob (used for duplication). */
export async function downloadEvidence(path: string): Promise<Blob> {
  const client = getClient();
  await requireUserId();
  const { data, error } = await client.storage.from(EVIDENCE_BUCKET).download(path);
  if (error) throw error;
  if (!data) throw new Error("Evidence download returned no data.");
  return data;
}

/**
 * Copies a stored evidence file into another application's folder and
 * returns the new storage path. Small files only (<= EVIDENCE_MAX_BYTES),
 * so download + re-upload stays cheap. Falls back to the extension of the
 * source key when the Blob carries no MIME type.
 */
export async function copyEvidenceToApplication(
  userId: string,
  sourcePath: string,
  targetApplicationId: string,
): Promise<string> {
  const blob = await downloadEvidence(sourcePath);
  const base = sourcePath.split("/").pop() ?? "evidence";
  const ext = base.split(".").pop()?.toLowerCase() ?? "";
  const mime = blob.type || (ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : ext === "webp" ? "image/webp" : "image/jpeg");
  const file = new File([blob], sanitizeFileName(base), { type: mime });
  return uploadEvidence(userId, targetApplicationId, file);
}

/** Removes evidence objects from private storage. No-op for an empty list. */
export async function deleteEvidence(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const client = getClient();
  await requireUserId();
  const { error } = await client.storage.from(EVIDENCE_BUCKET).remove(paths);
  if (error) throw error;
}
