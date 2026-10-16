import { afterEach, describe, expect, it, vi } from "vitest";
import { compressEvidenceImage } from "./evidenceImage";
import { EVIDENCE_MAX_BYTES } from "./validation";

describe("compressEvidenceImage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("resizes and converts an image to WebP while keeping its base filename", async () => {
    const close = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 4000, height: 2000, close }));
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
      callback(new Blob(["small image"], { type: "image/webp" }));
    });

    const result = await compressEvidenceImage(
      new File([new Uint8Array(EVIDENCE_MAX_BYTES + 1)], "evidence.png", { type: "image/png" }),
    );

    expect(result.name).toBe("evidence.webp");
    expect(result.type).toBe("image/webp");
    expect(result.size).toBeLessThan(EVIDENCE_MAX_BYTES);
    expect(close).toHaveBeenCalledOnce();
    expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      "image/webp",
      0.82,
    );
  });

  it("rejects an image that remains above 5 MB after quality and dimension reductions", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({
      width: 4000,
      height: 3000,
      close: vi.fn(),
    }));
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
      callback({ size: EVIDENCE_MAX_BYTES + 1, type: "image/webp" } as Blob);
    });

    await expect(
      compressEvidenceImage(new File(["x"], "huge.jpg", { type: "image/jpeg" })),
    ).rejects.toThrow("sigue superando 5 MB después de optimizarla");
  });

  it("keeps a small original when image decoding is unavailable", async () => {
    vi.stubGlobal("createImageBitmap", undefined);
    const original = new File(["image"], "photo.jpg", { type: "image/jpeg" });

    await expect(compressEvidenceImage(original)).resolves.toBe(original);
  });
});
