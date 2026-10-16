import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getEvidenceUrl } from "./storage";
import { useEvidenceUrls } from "./useEvidenceUrls";

vi.mock("./storage", () => ({
  getEvidenceUrl: vi.fn(),
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
});
