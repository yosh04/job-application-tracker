export const STATUSES = [
  "Guardado",
  "Aplicado",
  "Sin respuesta",
  "Revisión",
  "Entrevista",
  "Oferta",
  "Contratado",
  "Rechazado",
  "Retirado",
] as const;

export type Status = (typeof STATUSES)[number];

export interface InterestPoint {
  id: string;
  title: string;
  content: string;
}

export interface CVFile {
  name: string;
  size: string;
  updatedAt: string;
  /** Supabase Storage object path (<uid>/<applicationId>/<file>). Absent on legacy metadata-only entries. */
  path?: string;
}

export interface Application {
  id: string;
  searchId: string;
  company: string;
  position: string;
  location: string;
  url: string;
  status: Status;
  appliedAt: string;
  deadline?: string;
  notes: string;
  points: InterestPoint[];
  cv: CVFile | null;
  // Evidence images: Storage object paths for new uploads (see storage.ts
  // convention), legacy data-URLs / http URLs render directly as before.
  images: string[];
  createdAt: string;
  updatedAt: string;
}

/** Max evidence images per application (enforced in modal + view). */
export const MAX_EVIDENCE_IMAGES = 4;

export interface Search {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export type View =
  | { type: "overview" }
  | { type: "agenda" }
  | { type: "dashboard"; searchId: string }
  | { type: "application"; id: string };

export const STATUS_META: Record<Status, { dot: string; chip: string }> = {
  Guardado: { dot: "#64748b", chip: "bg-slate-400/10 text-slate-300 border-slate-400/20" },
  Aplicado: { dot: "#3b82f6", chip: "bg-blue-500/12 text-blue-300 border-blue-500/25" },
  "Sin respuesta": { dot: "#a3a3a3", chip: "bg-neutral-400/10 text-neutral-300 border-neutral-400/20" },
  Revisión: { dot: "#818cf8", chip: "bg-indigo-500/12 text-indigo-300 border-indigo-500/25" },
  Entrevista: { dot: "#22d3ee", chip: "bg-cyan-500/12 text-cyan-300 border-cyan-500/25" },
  Oferta: { dot: "#34d399", chip: "bg-emerald-500/12 text-emerald-300 border-emerald-500/25" },
  Contratado: { dot: "#16a34a", chip: "bg-green-600/15 text-green-300 border-green-600/30" },
  Rechazado: { dot: "#f87171", chip: "bg-red-500/12 text-red-300 border-red-500/25" },
  Retirado: { dot: "#5a6578", chip: "bg-white/5 text-faint border-line2" },
};

export const MONTHS_SHORT = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

/** "2026-10-02" -> "02 Oct" */
export function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")} ${MONTHS_SHORT[m - 1]}`;
}

/** "2026-10-02" -> "02/10/2026" */
export function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Fecha de hoy en formato ISO corto (YYYY-MM-DD). */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
