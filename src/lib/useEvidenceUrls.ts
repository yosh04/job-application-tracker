import { useEffect, useMemo, useState } from "react";
import { MAX_EVIDENCE_IMAGES, type CVFile } from "../types";
import { getEvidenceUrl, isStorageEvidencePath, listApplicationFiles } from "./storage";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

/**
 * Resolves images[] entries to displayable <img> src values.
 * Legacy data-URLs / http(s) URLs pass through untouched; storage paths
 * resolve to short-lived signed URLs (1h, private bucket).
 */
export function useEvidenceUrls(
  images: string[],
  applicationId?: string,
  cv?: CVFile | null,
): { urls: Map<string, string>; loading: boolean; images: string[]; cv: CVFile | null; error: string | null } {
  const [urls, setUrls] = useState<Map<string, string>>(new Map());
  const [listedImages, setListedImages] = useState<string[]>([]);
  const [listedCv, setListedCv] = useState<CVFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const backend = isSupabaseConfigured && !!supabase;
  const key = images.join("\n");

  useEffect(() => {
    let cancelled = false;
    setListedImages([]);
    setListedCv(null);
    setError(null);
    setLoading(backend && (!!applicationId || images.some(isStorageEvidencePath)));

    const recoverAndSign = async () => {
      let recovered: string[] = [];
      let recoveredCv: CVFile | null = null;
      if (backend && applicationId) {
        try {
          const files = await listApplicationFiles(applicationId);
          recovered = files.evidence;
          recoveredCv = files.cv;
        } catch (err) {
          console.error(`[storage] listApplicationFiles failed for ${applicationId}`, err);
          if (!cancelled) setError("No se pudieron recuperar los archivos de esta postulación.");
        }
      }

      const allImages = [...new Set([...images, ...recovered])];
      const stored = allImages.filter((value) => backend && isStorageEvidencePath(value));
      const entries = await Promise.all(
        stored.map(async (path) => {
          try {
            return [path, await getEvidenceUrl(path)] as const;
          } catch (err) {
            console.error(`[storage] getEvidenceUrl failed for ${path}`, err);
            return null;
          }
        }),
      );
      if (!cancelled) {
        setListedImages(recovered);
        setListedCv(recoveredCv);
        setUrls(new Map(entries.filter((entry): entry is readonly [string, string] => entry !== null)));
        if (entries.some((entry) => entry === null)) {
          setError((current) => current ?? "No se pudieron cargar algunas imágenes guardadas.");
        }
      }
    };

    recoverAndSign().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, backend, applicationId]);

  const effectiveImages = useMemo(
    () => {
      if (images.length >= MAX_EVIDENCE_IMAGES) return images;
      const merged = [...new Set([...images, ...listedImages])];
      return merged.slice(0, MAX_EVIDENCE_IMAGES);
    },
    // `key` represents the image array; its identity is not stable across component renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, listedImages],
  );

  const effectiveCv =
    cv?.path || cv?.dataUrl || !listedCv
      ? cv ?? listedCv
      : { ...listedCv, ...cv, path: listedCv.path };

  return { urls, loading, images: effectiveImages, cv: effectiveCv, error };
}

/** Maps one images[] entry to its display src (signed URL when resolved). */
export function toDisplayUrl(value: string, urls: Map<string, string>): string {
  if (!isStorageEvidencePath(value)) return value;
  return urls.get(value) ?? "";
}
