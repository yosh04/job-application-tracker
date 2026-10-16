import type { Application, Search } from "../types";
import { downloadCvBlob, downloadEvidence, isStorageEvidencePath } from "./storage";

function safeFilename(name: string): string {
  return (
    name
      .split(/[\\/]/)
      .pop()
      ?.replace(/[<>:"|?*\x00-\x1f]/g, "_")
      .trim()
      .replace(/[. ]+$/g, "") || "archivo"
  );
}

function imageExtension(source: string, blob: Blob): string {
  const sourcePath = source.startsWith("data:")
    ? ""
    : source.startsWith("http://") || source.startsWith("https://")
      ? new URL(source).pathname
      : source;
  const extension = sourcePath.split(/[\\/]/).pop()?.split(".").pop()?.toLowerCase();
  if (extension && ["jpg", "jpeg", "png", "webp", "gif"].includes(extension)) return extension;
  const mimeExtensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return mimeExtensions[blob.type] ?? "jpg";
}

async function getImageBlob(source: string): Promise<Blob> {
  if (isStorageEvidencePath(source)) return downloadEvidence(source);
  const response = await fetch(source);
  if (!response.ok) throw new Error(`No se pudo descargar una imagen (${response.status}).`);
  return response.blob();
}

export function formatApplicationText(
  app: Application,
  search: Search,
  imageNames: string[],
  cvIncluded: boolean,
  warnings: string[],
): string {
  const lines = [
    `ID DE POSTULACIÓN: ${app.id}`,
    `EMPRESA: ${app.company}`,
    `PUESTO: ${app.position}`,
    `UBICACIÓN: ${app.location || "No especificada"}`,
    `BÚSQUEDA: ${search.name}`,
    `DESCRIPCIÓN DE LA BÚSQUEDA: ${search.description || "Sin descripción"}`,
    `ESTADO: ${app.status}`,
    `FECHA DE APLICACIÓN: ${app.appliedAt}`,
    `FECHA LÍMITE: ${app.deadline || "No especificada"}`,
    `URL DE LA OFERTA: ${app.url || "No especificada"}`,
    `FECHA DE CREACIÓN: ${app.createdAt}`,
    `ÚLTIMA ACTUALIZACIÓN: ${app.updatedAt}`,
    "",
    "ACTIVIDAD",
  ];

  if (!app.activity?.length) lines.push("Sin historial registrado.");
  for (const event of [...(app.activity ?? [])].reverse()) {
    const timestamp = new Date(event.createdAt).toLocaleString("es-CR");
    lines.push(`- ${timestamp}: ${event.label}${event.details ? ` — ${event.details}` : ""}`);
  }

  lines.push(
    "",
    "PUNTOS DE INTERÉS",
  );

  if (app.points.length === 0) lines.push("Sin puntos de interés.");
  for (const point of app.points) {
    lines.push("", `- ${point.title}`, point.content || "(Sin contenido)");
  }

  lines.push("", "NOTAS PERSONALES", app.notes || "(Sin notas)", "", "ARCHIVOS INCLUIDOS");
  lines.push(
    `CV asociado: ${app.cv ? safeFilename(app.cv.name) : "No"}`,
    `Tamaño del CV: ${app.cv?.size ?? "No aplica"}`,
    `CV actualizado: ${app.cv?.updatedAt ?? "No aplica"}`,
    `CV incluido en ZIP: ${app.cv ? (cvIncluded ? "Sí" : "No") : "No aplica"}`,
  );
  lines.push(...(imageNames.length ? imageNames.map((name) => `Imagen: imagenes/${name}`) : ["Sin imágenes adjuntas."]));

  if (warnings.length > 0) {
    lines.push("", "ARCHIVOS NO INCLUIDOS", ...warnings.map((warning) => `- ${warning}`));
  }

  return `${lines.join("\n")}\n`;
}

export async function buildApplicationArchive(
  app: Application,
  search: Search,
): Promise<{ blob: Blob; warnings: string[] }> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const warnings: string[] = [];
  const imageNames: string[] = [];
  let cvIncluded = false;

  if (app.cv) {
    if (app.cv.path) {
      const cvBlob = await downloadCvBlob(app.cv.path);
      zip.file(`cv/${safeFilename(app.cv.name)}`, cvBlob);
      cvIncluded = true;
    } else if (app.cv.dataUrl) {
      const response = await fetch(app.cv.dataUrl);
      if (!response.ok) throw new Error(`No se pudo descargar el CV (${response.status}).`);
      zip.file(`cv/${safeFilename(app.cv.name)}`, await response.blob());
      cvIncluded = true;
    } else {
      warnings.push(`El CV "${safeFilename(app.cv.name)}" solo tiene metadatos y no hay un archivo disponible para descargar.`);
    }
  }

  for (let index = 0; index < (app.images ?? []).length; index += 1) {
    try {
      const source = app.images[index];
      const image = await getImageBlob(source);
      const name = `evidencia-${String(index + 1).padStart(2, "0")}.${imageExtension(source, image)}`;
      imageNames.push(name);
      zip.file(`imagenes/${name}`, image);
    } catch (error) {
      throw new Error(
        `No se pudo incluir la imagen ${index + 1}: ${error instanceof Error ? error.message : "error desconocido"}`,
      );
    }
  }

  zip.file("informacion.txt", formatApplicationText(app, search, imageNames, cvIncluded, warnings));

  return {
    blob: await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } }),
    warnings,
  };
}

export function applicationArchiveFilename(app: Application): string {
  const base = safeFilename(`${app.company}_${app.position}`).replace(/\s+/g, "_");
  return `${base || "postulacion"}.zip`;
}
