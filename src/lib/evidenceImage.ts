import { EVIDENCE_MAX_BYTES } from "./validation";

const MAX_IMAGE_DIMENSION = 2560;
const OUTPUT_QUALITIES = [0.82, 0.68, 0.54, 0.4];
const RESIZE_FACTOR = 0.8;
const MAX_RESIZE_ATTEMPTS = 6;

function outputExtension(type: string): string {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  return "webp";
}

function encodeCanvas(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("El navegador no pudo optimizar esta imagen."));
      },
      "image/webp",
      quality,
    );
  });
}

export async function compressEvidenceImage(file: File): Promise<File> {
  if (typeof createImageBitmap !== "function") {
    if (file.size <= EVIDENCE_MAX_BYTES) return file;
    throw new Error("Este navegador no puede optimizar imágenes grandes.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("No se pudo abrir la imagen para optimizarla.");
  }

  try {
    const canvas = document.createElement("canvas");
    let scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));

    for (let resizeAttempt = 0; resizeAttempt <= MAX_RESIZE_ATTEMPTS; resizeAttempt += 1) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("El navegador no pudo preparar la imagen para optimizarla.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (const quality of OUTPUT_QUALITIES) {
        const blob = await encodeCanvas(canvas, quality);
        if (blob.size <= EVIDENCE_MAX_BYTES) {
          if (blob.size >= file.size && file.size <= EVIDENCE_MAX_BYTES) return file;
          const extension = outputExtension(blob.type);
          const baseName = file.name.replace(/\.[^.]+$/, "");
          return new File([blob], `${baseName}.${extension}`, {
            type: blob.type || "image/webp",
            lastModified: file.lastModified,
          });
        }
      }

      scale *= RESIZE_FACTOR;
    }
  } finally {
    bitmap.close();
  }

  throw new Error("La imagen sigue superando 5 MB después de optimizarla.");
}
