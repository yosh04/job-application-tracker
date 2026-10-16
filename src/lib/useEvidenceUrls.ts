import { useEffect, useState } from "react";
import { getEvidenceUrl, isStorageEvidencePath } from "./storage";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

/**
 * Resolves images[] entries to displayable <img> src values.
 * Legacy data-URLs / http(s) URLs pass through untouched; storage paths
 * resolve to short-lived signed URLs (1h, private bucket).
 */
export function useEvidenceUrls(images: string[]): { urls: Map<string, string>; loading: boolean } {
  const [urls, setUrls] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const backend = isSupabaseConfigured && !!supabase;
  const key = images.join("\n");

  useEffect(() => {
    const stored = images.filter((v) => backend && isStorageEvidencePath(v));
    if (stored.length === 0) {
      setUrls(new Map());
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all(stored.map(async (path) => [path, await getEvidenceUrl(path)] as const))
      .then((entries) => {
        if (!cancelled) setUrls(new Map(entries));
      })
      .catch((err) => {
        console.error("[storage] getEvidenceUrl failed", err);
        if (!cancelled) setUrls(new Map());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, backend]);

  return { urls, loading };
}

/** Maps one images[] entry to its display src (signed URL when resolved). */
export function toDisplayUrl(value: string, urls: Map<string, string>): string {
  if (!isStorageEvidencePath(value)) return value;
  return urls.get(value) ?? "";
}
