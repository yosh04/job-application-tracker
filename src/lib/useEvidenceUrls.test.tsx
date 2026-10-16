import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getEvidenceUrl, listApplicationFiles } from "./storage";
import { useEvidenceUrls } from "./useEvidenceUrls";

vi.mock("./storage", () => ({
  getEvidenceUrl: vi.fn(),
  listApplicationFiles: vi.fn(),
  isStorageEvidencePath: (value: string) =>
    !(value.startsWith("data:") || value.startsWith("http://") || value.startsWith("https://") || value.startsWith("blob:")),
}));

vi.mock("./supabaseClient", () => ({
  isSupabaseConfigured: true,
  supabase: {},
}));

describe("useEvidenceUrls", () => {
  beforeEach(() => {
    vi.mocked(getEvidenceUrl).mockReset();
    vi.mocked(listApplicationFiles).mockReset().mockResolvedValue({ evidence: [], cv: null });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("recovers available photos even when one stored image path is missing", async () => {
    vi.mocked(getEvidenceUrl).mockImplementation(async (path) => {
      if (path.endsWith("missing.webp")) throw new Error("Object not found");
      return `https://signed.test/${path}`;
    });

    const { result } = renderHook(() =>
      useEvidenceUrls(["user/app/evidence-one.webp", "user/app/evidence-missing.webp", "user/app/evidence-three.webp"]),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.urls.get("user/app/evidence-one.webp")).toBe("https://signed.test/user/app/evidence-one.webp");
    expect(result.current.urls.has("user/app/evidence-missing.webp")).toBe(false);
    expect(result.current.urls.get("user/app/evidence-three.webp")).toBe("https://signed.test/user/app/evidence-three.webp");
  });

  it("refreshes signed URLs when the application's evidence paths change", async () => {
    vi.mocked(getEvidenceUrl).mockImplementation(async (path) => `https://signed.test/${path}`);
    const { result, rerender } = renderHook(
      ({ paths }) => useEvidenceUrls(paths),
      { initialProps: { paths: ["user/app/first.webp"] } },
    );

    await waitFor(() => expect(result.current.urls.has("user/app/first.webp")).toBe(true));
    rerender({ paths: ["user/app/second.webp"] });

    await waitFor(() => expect(result.current.urls.has("user/app/second.webp")).toBe(true));
    expect(result.current.urls.has("user/app/first.webp")).toBe(false);
    expect(getEvidenceUrl).toHaveBeenCalledWith("user/app/second.webp");
  });

  it("recovers and signs orphaned evidence, and exposes a missing CV for repair", async () => {
    vi.mocked(listApplicationFiles).mockResolvedValue({
      evidence: ["user/app/evidence-recovered.webp"],
      cv: { path: "user/app/cv-123-resume.pdf", name: "resume.pdf", size: "120 KB", updatedAt: "2026-06-15" },
    });
    vi.mocked(getEvidenceUrl).mockResolvedValue("https://signed.test/recovered.webp");

    const { result } = renderHook(() => useEvidenceUrls([], "app", null));

    await waitFor(() => expect(result.current.images).toContain("user/app/evidence-recovered.webp"));
    expect(result.current.urls.get("user/app/evidence-recovered.webp")).toBe("https://signed.test/recovered.webp");
    expect(result.current.cv?.path).toBe("user/app/cv-123-resume.pdf");
    expect(listApplicationFiles).toHaveBeenCalledWith("app");
  });

  it("does not recover more than four evidence images", async () => {
    vi.mocked(listApplicationFiles).mockResolvedValue({
      evidence: [
        "user/app/evidence-1.webp",
        "user/app/evidence-2.webp",
        "user/app/evidence-3.webp",
        "user/app/evidence-4.webp",
        "user/app/evidence-5.webp",
      ],
      cv: null,
    });
    vi.mocked(getEvidenceUrl).mockImplementation(async (path) => `https://signed.test/${path}`);

    const { result } = renderHook(() => useEvidenceUrls([], "app"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.images).toHaveLength(4);
  });

  it("reports a folder listing failure instead of silently treating the application as empty", async () => {
    vi.mocked(listApplicationFiles).mockRejectedValue(new Error("Forbidden"));
    const { result } = renderHook(() => useEvidenceUrls([], "app"));

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toContain("No se pudieron recuperar");
    expect(result.current.images).toEqual([]);
  });
});
