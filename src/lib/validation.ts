export const CV_MAX_BYTES = 5 * 1024 * 1024;
const CV_TYPES: Record<string, string[]> = {
  pdf: ["application/pdf"],
  doc: ["application/msword"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};

export function isValidOfferUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function validateCvFile(file: Pick<File, "name" | "size" | "type">): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const allowedMimeTypes = CV_TYPES[extension];
  if (!allowedMimeTypes || (file.type && !allowedMimeTypes.includes(file.type))) {
    return "El CV debe ser un archivo PDF, DOC o DOCX válido.";
  }
  if (!Number.isFinite(file.size) || file.size <= 0) return "El archivo del CV está vacío.";
  if (file.size > CV_MAX_BYTES) return "El CV no puede superar los 5 MB.";
  return null;
}
