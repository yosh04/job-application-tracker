import { useEffect, useState } from "react";
import { cn } from "../utils/cn";
import { Button, Icon, Input, Label, Modal, Select, Textarea } from "./ui";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { deleteCv, downloadCv, formatFileSize, getCvUrl, uploadCv } from "../lib/storage";
import { isStorageEvidencePath, uploadEvidence } from "../lib/storage";
import { compressEvidenceImage } from "../lib/evidenceImage";
import { isValidISODate, isValidOfferUrl, validateCvFile } from "../lib/validation";
import { prefixCvFilename } from "../lib/fileNames";
import { toDisplayUrl, useEvidenceUrls } from "../lib/useEvidenceUrls";
import { STATUSES, MAX_EVIDENCE_IMAGES, longDate, todayISO, uid, type Application, type InterestPoint, type Search, type Status } from "../types";

/* --------------------------------------------------------- search modal */

export function SearchModal({
  open,
  onClose,
  editing,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  editing?: Search | null;
  onSave: (data: { name: string; description: string }) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setDescription(editing?.description ?? "");
    }
  }, [open, editing]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Renombrar búsqueda" : "Nueva búsqueda"}
      subtitle="Un objetivo agrupa varias postulaciones relacionadas."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!name.trim()}
            onClick={() => onSave({ name: name.trim(), description: description.trim() })}
          >
            {editing ? "Guardar cambios" : "Crear búsqueda"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Nombre</Label>
          <Input
            autoFocus
            placeholder="Programador Frontend"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && name.trim() && onSave({ name: name.trim(), description: description.trim() })}
          />
        </div>
        <div>
          <Label hint="opcional">Descripción</Label>
          <Textarea
            rows={3}
            placeholder="Buscando posiciones frontend junior / remoto"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="flex items-start gap-2.5 rounded-lg border border-line bg-surface/70 p-3">
          <Icon name="spark" className="mt-0.5 h-4 w-4 text-brand" />
          <p className="text-[12px] leading-relaxed text-muted">
            Ejemplos: <span className="text-ink">Desarrollador Angular</span>,{" "}
            <span className="text-ink">Backend Developer</span>, <span className="text-ink">Trabajo remoto</span>,{" "}
            <span className="text-ink">Empresas de Costa Rica</span>.
          </p>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------- application modal */

export function ApplicationModal({
  open,
  onClose,
  searches,
  defaultSearchId,
  editing,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  searches: Search[];
  defaultSearchId?: string;
  editing?: Application | null;
  onSave: (data: {
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
    cv: Application["cv"];
    images: string[];
    /** Files picked for a not-yet-created application; App uploads them post-create. */
    newImageFiles?: File[];
  }) => void;
}) {
  const [form, setForm] = useState({
    searchId: defaultSearchId ?? searches[0]?.id ?? "",
    company: "",
    position: "",
    location: "",
    url: "",
    status: "Aplicado" as Status,
    appliedAt: todayISO(),
    deadline: "",
    notes: "",
  });
  const [points, setPoints] = useState<InterestPoint[]>([]);
  const [pt, setPt] = useState({ title: "", content: "" });
  const cv = editing?.cv ?? null;
  const [images, setImages] = useState<string[]>([]);
  // Files picked for a new (unsaved) application: no applicationId exists yet,
  // so they preview via object URLs and upload in App.saveApplication post-create.
  const [pending, setPending] = useState<{ id: string; file: File; preview: string }[]>([]);
  const [imgWarning, setImgWarning] = useState<string | null>(null);
  const [imgUploading, setImgUploading] = useState(false);
  const [pendingImg, setPendingImg] = useState<number | null>(null);

  // Prototype fallback (no backend): data-URLs, no real upload.
  const backend = isSupabaseConfigured && !!supabase;
  // Resolve signed URLs for stored evidence paths (private bucket).
  const { urls: evidenceUrls, loading: evidenceLoading } = useEvidenceUrls(backend ? images : []);

  const revokePending = (list: { preview: string }[]) => {
    list.forEach((p) => URL.revokeObjectURL(p.preview));
  };

  useEffect(() => {
    if (!open) return;
    setForm({
      searchId: editing?.searchId ?? defaultSearchId ?? searches[0]?.id ?? "",
      company: editing?.company ?? "",
      position: editing?.position ?? "",
      location: editing?.location ?? "",
      url: editing?.url ?? "",
      status: editing?.status ?? "Aplicado",
      appliedAt: editing?.appliedAt ?? todayISO(),
      deadline: editing?.deadline ?? "",
      notes: editing?.notes ?? "",
    });
    setPoints(editing?.points ? editing.points.map((p) => ({ ...p })) : []);
    setImages(editing?.images ? [...editing.images].slice(0, MAX_EVIDENCE_IMAGES) : []);
    setPending((prev) => {
      revokePending(prev);
      return [];
    });
    setPt({ title: "", content: "" });
    setImgWarning(null);
    setImgUploading(false);
  }, [open, editing, defaultSearchId, searches]);

  const urlError = !isValidOfferUrl(form.url) ? "Ingresa una URL válida que comience con http:// o https://." : "";
  const appliedAtError = !isValidISODate(form.appliedAt) ? "Ingresa una fecha de aplicación válida." : "";
  const deadlineError = form.deadline
    ? !isValidISODate(form.deadline)
      ? "Ingresa una fecha límite válida."
      : isValidISODate(form.appliedAt) && form.deadline < form.appliedAt
        ? "La fecha límite no puede ser anterior a la fecha de aplicación."
        : ""
    : "";
  const valid =
    !!form.company.trim() &&
    !!form.position.trim() &&
    !!form.searchId &&
    isValidISODate(form.appliedAt) &&
    !urlError &&
    !deadlineError;
  const totalImages = images.length + pending.length;
  const imagesFull = totalImages >= MAX_EVIDENCE_IMAGES;

  // Evidence images (Fase 3, slice 2): images[] stores Storage paths for new
  // uploads; legacy data-URLs / http URLs render directly (see storage.ts).
  // - Prototype (!backend): previous data-URL behavior, unchanged.
  // - Editing with backend: upload on select (same as the CV flow); the
  //   applicationId already exists. Cancelling afterwards may orphan the
  //   uploaded object — accepted, consistent with CV uploads.
  // - Creating with backend: no applicationId yet, so files preview via
  //   object URLs and upload in App.saveApplication right after create.
  const handleImageFiles = async (files: FileList | null) => {
    if (!files) return;
    const remaining = MAX_EVIDENCE_IMAGES - totalImages;
    if (remaining <= 0) {
      setImgWarning(`Máximo ${MAX_EVIDENCE_IMAGES} imágenes por postulación`);
      return;
    }
    const selected = Array.from(files).slice(0, remaining);
    if (files.length > remaining) setImgWarning(`Máximo ${MAX_EVIDENCE_IMAGES} imágenes por postulación`);
    else setImgWarning(null);

    setImgUploading(true);
    try {
      const optimized: File[] = [];
      const failures: string[] = [];
      for (const file of selected) {
        const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
        if (!["png", "jpg", "jpeg", "webp", "gif"].includes(extension) || (file.type && !file.type.startsWith("image/"))) {
          failures.push(`${file.name}: formato no permitido`);
          continue;
        }
        try {
          optimized.push(await compressEvidenceImage(file));
        } catch (error) {
          failures.push(`${file.name}: ${error instanceof Error ? error.message : "no se pudo optimizar"}`);
        }
      }

      if (optimized.length === 0) {
        setImgWarning(failures.length > 0 ? failures.join(". ") : "No se pudo optimizar ninguna imagen.");
        return;
      }

      if (!backend || !supabase) {
        for (const file of optimized) {
          try {
            const url = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () =>
                typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("No se pudo leer el archivo."));
              reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer el archivo."));
              reader.readAsDataURL(file);
            });
            setImages((prev) =>
              prev.length + pending.length >= MAX_EVIDENCE_IMAGES ? prev : [...prev, url],
            );
          } catch (error) {
            failures.push(`${file.name}: ${error instanceof Error ? error.message : "no se pudo leer"}`);
          }
        }
        setImgWarning(failures.length > 0 ? failures.join(". ") : null);
        return;
      }

      if (!editing) {
        setPending((prev) => {
          const room = MAX_EVIDENCE_IMAGES - images.length - prev.length;
          const staged = optimized.slice(0, Math.max(room, 0)).map((file, i) => ({
            id: `pending_${crypto.randomUUID()}_${i}`,
            file,
            preview: URL.createObjectURL(file),
          }));
          return [...prev, ...staged];
        });
        setImgWarning(failures.length > 0 ? failures.join(". ") : null);
        return;
      }

      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      const userId = data.user?.id;
      if (!userId) throw new Error("No active session.");
      for (const file of optimized) {
        try {
          const path = await uploadEvidence(userId, editing.id, file);
          setImages((prev) => (prev.length >= MAX_EVIDENCE_IMAGES ? prev : [...prev, path]));
        } catch (err) {
          failures.push(`${file.name}: ${err instanceof Error ? err.message : "Image upload failed."}`);
        }
      }
      setImgWarning(failures.length > 0 ? failures.join(". ") : null);
    } catch (err) {
      setImgWarning(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setImgUploading(false);
    }
  };

  const removePending = (id: string) => {
    setPending((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((p) => p.id !== id);
    });
  };

  const submit = () => {
    if (!valid || imgUploading) return;
    onSave({
      ...form,
      company: form.company.trim(),
      position: form.position.trim(),
      url: form.url.trim(),
      deadline: form.deadline.trim() ? form.deadline.trim() : undefined,
      points,
      cv,
      images: images.slice(0, MAX_EVIDENCE_IMAGES),
      ...(pending.length > 0 ? { newImageFiles: pending.map((p) => p.file) } : {}),
    });
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        width="max-w-xl"
        title={editing ? "Editar postulación" : "Nueva postulación"}
        subtitle="Toda la información relevante de esta oportunidad concreta."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" disabled={!valid || imgUploading} onClick={submit}>
              {imgUploading ? "Subiendo…" : editing ? "Guardar cambios" : "Guardar postulación"}
            </Button>
          </>
        }
      >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Empresa</Label>
            <Input
              autoFocus
              placeholder="Microsoft"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
          </div>
          <div>
            <Label>Puesto</Label>
            <Input
              placeholder="Frontend Developer"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
            />
          </div>
          <div>
            <Label>Ubicación</Label>
            <Input placeholder="Remoto" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div>
            <Label hint="opcional">Búsqueda destino</Label>
            <Select value={form.searchId} onChange={(e) => setForm({ ...form, searchId: e.target.value })}>
              {searches.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label hint="opcional">URL de la oferta</Label>
            <Input
              type="url"
              placeholder="https://…"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="font-mono text-[12.5px]"
              aria-invalid={!!urlError}
            />
            {urlError && <p className="mt-1 text-[11.5px] text-red-300" role="alert">{urlError}</p>}
          </div>
          <div>
            <Label>Estado</Label>
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
            <div>
              <Label>Fecha</Label>
              <Input
                type="date"
                required
                value={form.appliedAt}
                onChange={(e) => setForm({ ...form, appliedAt: e.target.value })}
                aria-invalid={!!appliedAtError}
              />
              {appliedAtError && <p className="mt-1 text-[11.5px] text-red-300" role="alert">{appliedAtError}</p>}
            </div>
            <div>
              <Label hint="opcional">Fecha límite</Label>
              <Input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                aria-invalid={!!deadlineError}
              />
              {deadlineError && <p className="mt-1 text-[11.5px] text-red-300" role="alert">{deadlineError}</p>}
            </div>
          </div>
        </div>

        {/* points */}
        <div className="rounded-lg border border-line bg-surface/50 p-3.5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-faint uppercase">
              Puntos de interés · {points.length}
            </p>
          </div>
          <div className="space-y-2">
            {points.map((p) => (
              <div key={p.id} className="group flex items-start gap-2.5 rounded-md border border-line bg-panel px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10.5px] font-semibold tracking-[0.12em] text-brand-soft uppercase">{p.title}</p>
                  <p className="mt-1 line-clamp-2 text-[12.5px] whitespace-pre-line text-muted">{p.content}</p>
                </div>
                <button
                  onClick={() => setPoints(points.filter((x) => x.id !== p.id))}
                  className="mt-0.5 text-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-300"
                  aria-label="Quitar punto"
                >
                  <Icon name="x" className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
              <Input
                placeholder="Título"
                value={pt.title}
                onChange={(e) => setPt({ ...pt, title: e.target.value })}
                className="py-2 text-[12.5px]"
              />
              <Input
                placeholder="Contenido…"
                value={pt.content}
                onChange={(e) => setPt({ ...pt, content: e.target.value })}
                className="py-2 text-[12.5px]"
              />
              <Button
                variant="subtle"
                size="sm"
                className="h-full"
                disabled={!pt.title.trim()}
                onClick={() => {
                  setPoints([...points, { id: uid("p"), title: pt.title.trim(), content: pt.content.trim() }]);
                  setPt({ title: "", content: "" });
                }}
              >
                <Icon name="plus" className="h-3.5 w-3.5" strokeWidth={2} /> Agregar
              </Button>
            </div>
          </div>
        </div>

        {/* cv */}
        <div className="rounded-lg border border-line bg-surface/50 p-3.5">
          <p className="mb-3 text-[11px] font-semibold tracking-[0.14em] text-faint uppercase">CV personalizado</p>
          {cv ? (
            <div className="flex items-center gap-3 rounded-md border border-brand/30 bg-brand/6 px-3 py-2.5">
              <Icon name="file" className="h-4 w-4 text-brand-soft" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] text-ink">{cv.name}</p>
                <p className="font-mono text-[10.5px] text-faint">{cv.name.split(".").pop()?.toUpperCase()} · {cv.size}</p>
              </div>
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-line2 px-4 py-4 text-center text-[12.5px] text-muted">
              Guarda la postulación y adjunta el archivo desde la ficha. Se validará el tipo y tamaño del CV.
            </p>
          )}
        </div>

        {/* evidence images */}
        <div className="rounded-lg border border-line bg-surface/50 p-3.5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-faint uppercase">
              Capturas / Evidencia · {totalImages}/{MAX_EVIDENCE_IMAGES}
            </p>
          </div>
          {(images.length > 0 || pending.length > 0) && (
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {images.map((src, i) => {
                const stored = backend && isStorageEvidencePath(src);
                const display = stored ? toDisplayUrl(src, evidenceUrls) : src;
                return (
                  <div key={`img-${i}`} className="group relative overflow-hidden rounded-md border border-line">
                    {display ? (
                      <img src={display} alt={`Evidencia ${i + 1}`} className="h-20 w-full object-cover" />
                    ) : (
                      <div className="flex h-20 w-full items-center justify-center bg-elev text-[11px] text-faint">
                        {evidenceLoading ? "Cargando…" : "Sin vista previa"}
                      </div>
                    )}
                    <button
                      onClick={() => setPendingImg(i)}
                      className="absolute top-1 right-1 rounded-full bg-black/70 p-1 text-white transition-opacity hover:bg-red-500/90"
                      aria-label={`Quitar imagen ${i + 1}`}
                    >
                      <Icon name="x" className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
              {pending.map((p) => (
                <div key={p.id} className="group relative overflow-hidden rounded-md border border-dashed border-brand/40">
                  <img src={p.preview} alt="Evidencia pendiente" className="h-20 w-full object-cover opacity-90" />
                  <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[9.5px] text-amber-200/90">
                    Se sube al guardar
                  </span>
                  <button
                    onClick={() => removePending(p.id)}
                    className="absolute top-1 right-1 rounded-full bg-black/70 p-1 text-white transition-opacity hover:bg-red-500/90"
                    aria-label="Quitar imagen pendiente"
                  >
                    <Icon name="x" className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <label
            className={cn(
              "flex w-full flex-col items-center rounded-md border border-dashed border-line2 px-4 py-5 transition-colors",
              imagesFull ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:border-brand/45 hover:bg-brand/5",
            )}
          >
            <Icon name="upload" className="mb-2 h-4 w-4 text-muted" />
            <p className="text-[12.5px] text-ink">
              {imagesFull
                ? `Máximo ${MAX_EVIDENCE_IMAGES} imágenes alcanzado`
                : imgUploading
                  ? "Subiendo imágenes…"
                  : "Agrega capturas de la oferta"}
            </p>
            <p className="mt-0.5 font-mono text-[10.5px] text-faint">
              PNG · JPG · optimización automática · máx. {MAX_EVIDENCE_IMAGES}
            </p>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={imagesFull || imgUploading}
              className="hidden"
              onChange={(e) => {
                void handleImageFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          {imgWarning && <p className="mt-2 text-[11.5px] leading-relaxed text-amber-200/90">{imgWarning}</p>}
        </div>

        <div>
          <Label hint="opcional">Notas</Label>
          <Textarea
            rows={2}
            placeholder="Notas iniciales, nombre del reclutador…"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
      </div>
      </Modal>
      <ConfirmModal
        open={pendingImg !== null}
        onClose={() => setPendingImg(null)}
        onConfirm={() => {
          if (pendingImg !== null) setImages((prev) => prev.filter((_, j) => j !== pendingImg));
          setImgWarning(null);
          setPendingImg(null);
        }}
        title="Eliminar imagen"
        message="Se eliminará esta captura de la postulación. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
      />
    </>
  );
}

/* ------------------------------------------------------------- move modal */

export function MoveModal({
  open,
  onClose,
  app,
  searches,
  onMove,
}: {
  open: boolean;
  onClose: () => void;
  app?: Application | null;
  searches: Search[];
  onMove: (targetId: string, newSearchName?: string) => void;
}) {
  const [target, setTarget] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (!open || !app) return;
    setTarget(searches.find((s) => s.id !== app.searchId)?.id ?? "");
    setCreating(false);
    setNewName("");
  }, [open, app, searches]);

  const current = searches.find((s) => s.id === app?.searchId);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Mover postulación"
      subtitle="La postulación cambia de objetivo, no se duplica."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!creating && !target}
            onClick={() => onMove(creating ? "__new__" : target)}
          >
            <Icon name="move" className="h-3.5 w-3.5" /> Mover
          </Button>
        </>
      }
    >
      {app && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-line bg-surface/70 p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-line2 bg-elev text-[11.5px] font-semibold text-brand-soft">
              {app.company.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-medium text-ink">{app.company}</p>
              <p className="truncate text-[12px] text-muted">{app.position}</p>
            </div>
          </div>

          <div className="relative grid grid-cols-2 items-center gap-3 rounded-lg border border-line bg-panel px-3 py-3 text-center">
            <div>
              <p className="text-[10.5px] tracking-[0.14em] text-faint uppercase">Origen</p>
              <p className="mt-1 truncate text-[13px] text-muted">{current?.name ?? "—"}</p>
            </div>
            <Icon name="move" className="absolute left-1/2 hidden h-4 w-4 -translate-x-1/2 text-brand" />
            <div>
              <p className="text-[10.5px] tracking-[0.14em] text-faint uppercase">Destino</p>
              <p className="mt-1 truncate text-[13px] font-medium text-brand-soft">
                {creating ? newName.trim() || "Nueva búsqueda" : searches.find((s) => s.id === target)?.name ?? "—"}
              </p>
            </div>
          </div>

          <div>
            <Label>Destino</Label>
            <div className="space-y-1.5">
              {searches.map((s) => {
                const isCurrent = s.id === app.searchId;
                const checked = !creating && target === s.id;
                return (
                  <button
                    key={s.id}
                    disabled={isCurrent}
                    onClick={() => {
                      setTarget(s.id);
                      setCreating(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors",
                      checked ? "border-brand/50 bg-brand/10" : "border-line hover:border-line2 hover:bg-elev/60",
                      isCurrent && "cursor-not-allowed opacity-40",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-full border",
                        checked ? "border-brand bg-brand" : "border-line2",
                      )}
                    >
                      {checked && <Icon name="check" className="h-2.5 w-2.5 text-white" strokeWidth={3.5} />}
                    </span>
                    <Icon name="folder" className={cn("h-4 w-4", checked ? "text-brand" : "text-faint")} />
                    <span className={cn("flex-1 truncate text-[13px]", checked ? "text-ink" : "text-muted")}>{s.name}</span>
                    {isCurrent && <span className="text-[10.5px] tracking-wide text-faint uppercase">actual</span>}
                  </button>
                );
              })}

              <button
                onClick={() => setCreating(true)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md border border-dashed px-3 py-2.5 text-left transition-colors",
                  creating ? "border-brand/50 bg-brand/10" : "border-line2 hover:border-brand/40 hover:bg-brand/5",
                )}
              >
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full border",
                    creating ? "border-brand bg-brand" : "border-line2",
                  )}
                >
                  {creating && <Icon name="check" className="h-2.5 w-2.5 text-white" strokeWidth={3.5} />}
                </span>
                <Icon name="plus" className={cn("h-4 w-4", creating ? "text-brand" : "text-faint")} strokeWidth={2} />
                <span className={cn("text-[13px]", creating ? "text-ink" : "text-muted")}>Crear nueva búsqueda</span>
              </button>

              {creating && (
                <Input
                  autoFocus
                  placeholder="Nombre de la nueva búsqueda"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onMove("__new__")}
                />
              )}
            </div>
          </div>

          <p className="flex items-start gap-2 text-[11.5px] leading-relaxed text-faint">
            <Icon name="spark" className="mt-px h-3.5 w-3.5 shrink-0 text-brand/70" />
            En este prototipo la acción es <span className="text-muted">Mover</span>: sigue existiendo una única postulación,
            solo cambia de objetivo.
          </p>
        </div>
      )}
    </Modal>
  );
}

/* ---------------------------------------------------------------- cv modal */

export function CVModal({
  open,
  onClose,
  app,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  app?: Application | null;
  onSave: (cv: Application["cv"]) => void;
}) {
  const [draft, setDraft] = useState<Application["cv"]>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [busy, setBusy] = useState<"download" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [draggingCv, setDraggingCv] = useState(false);

  // Prototype fallback (no backend): metadata only, no real upload.
  const backend = isSupabaseConfigured && !!supabase;
  const draftPath = draft?.path ?? null;
  // Legacy entries predate Storage uploads: metadata only, no preview.
  const legacy = backend && !!draft && !draftPath;

  useEffect(() => {
    if (!open) return;
    setDraft(app?.cv ?? null);
    setUploading(false);
    setUploadName(null);
    setBusy(null);
    setError(null);
    setPreviewUrl(null);
    setPreviewLoading(false);
    setDraggingCv(false);
  }, [open, app]);

  // Resolve a short-lived signed URL for stored CVs (private bucket).
  useEffect(() => {
    if (!open || !backend || !draftPath) return;
    let cancelled = false;
    setPreviewLoading(true);
    getCvUrl(draftPath)
      .then((url) => {
        if (!cancelled) setPreviewUrl(url);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not generate the preview link.");
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, backend, draftPath]);

  const handleFiles = async (files: File[] | FileList | null) => {
    const file = files?.[0];
    if (!file || uploading) return;
    setError(null);
    const validationError = validateCvFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!app) {
      setError("No application selected.");
      return;
    }
    const namedFile = new File([file], prefixCvFilename(app.company, file.name), {
      type: file.type,
      lastModified: file.lastModified,
    });
    // Keep a local copy in prototype mode so the application archive can include the CV.
    if (!backend || !supabase) {
      setUploading(true);
      setUploadName(namedFile.name);
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read CV file."));
          reader.onerror = () => reject(reader.error ?? new Error("Could not read CV file."));
          reader.readAsDataURL(namedFile);
        });
        setDraft({ name: namedFile.name, size: formatFileSize(file.size), updatedAt: todayISO(), dataUrl });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not read CV file.");
      } finally {
        setUploading(false);
        setUploadName(null);
      }
      return;
    }
    setUploading(true);
    setUploadName(namedFile.name);
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) throw new Error("No active session.");
      const uploaded = await uploadCv(userId, app.id, namedFile);
      setDraft(uploaded);
      setPreviewUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "CV upload failed.");
    } finally {
      setUploading(false);
      setUploadName(null);
    }
  };

  const handleCvDragEnter = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!uploading && busy === null) setDraggingCv(true);
  };

  const handleCvDragOver = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    if (!uploading && busy === null) setDraggingCv(true);
  };

  const handleCvDragLeave = (event: React.DragEvent<HTMLElement>) => {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
    setDraggingCv(false);
  };

  const handleCvDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDraggingCv(false);
    if (uploading || busy !== null) return;
    const itemFiles = Array.from(event.dataTransfer.items ?? [])
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);
    const files = itemFiles.length > 0 ? itemFiles : Array.from(event.dataTransfer.files ?? []);
    void handleFiles(files);
  };

  const handleDownload = async () => {
    if (!draftPath || busy) return;
    setBusy("download");
    setError(null);
    try {
      await downloadCv(draftPath, draft?.name ?? "cv");
    } catch (err) {
      setError(err instanceof Error ? err.message : "CV download failed.");
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    if (busy) return;
    setBusy("delete");
    setError(null);
    try {
      if (draftPath && backend) await deleteCv([draftPath]);
      setDraft(null);
      setPreviewUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the CV file.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="CV personalizado"
      subtitle={app ? `${app.company} · ${app.position}` : undefined}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!draft || uploading || busy !== null}
            onClick={() => onSave(draft)}
          >
            Guardar CV
          </Button>
        </>
      }
    >
      {draft && (
        <div
          onDragEnter={handleCvDragEnter}
          onDragOver={handleCvDragOver}
          onDragLeave={handleCvDragLeave}
          onDrop={handleCvDrop}
          className={cn(
            "mb-4 rounded-lg border bg-panel p-5 transition-colors",
            draggingCv ? "border-brand bg-brand/8" : "border-line",
          )}
        >
          {draggingCv && (
            <p className="mb-3 text-center text-[12px] font-medium text-brand-soft">
              Suelta el archivo para reemplazar el CV
            </p>
          )}
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-lg border border-brand/25 bg-brand/10 text-brand-soft">
              <Icon name="file" className="h-6 w-6" />
            </div>
            <p className="text-[14px] font-medium text-ink">{draft.name}</p>
            <p className="mt-1 font-mono text-[11.5px] text-faint">
              {draft.size} · actualizado {longDate(draft.updatedAt)}
            </p>
            {legacy && (
              <p className="mt-2 max-w-[320px] text-[11.5px] leading-relaxed text-amber-200/90">
                Legacy file (no stored copy): replace it to enable preview and download.
              </p>
            )}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {previewUrl ? (
                <Button variant="outline" size="xs" onClick={() => window.open(previewUrl, "_blank", "noopener")}>
                  <Icon name="eye" className="h-3.5 w-3.5" /> Ver
                </Button>
              ) : (
                backend &&
                !legacy && (
                  <span className="inline-flex h-7 items-center px-2.5 text-[12px] text-faint">
                    {previewLoading || uploading ? "Generando enlace…" : "Sin vista previa"}
                  </span>
                )
              )}
              {backend && draftPath && (
                <Button variant="outline" size="xs" onClick={() => void handleDownload()} disabled={busy !== null}>
                  {busy === "download" ? "Descargando…" : "Descargar"}
                </Button>
              )}
              <label className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-line bg-elev2 px-2.5 text-[12px] text-ink transition-colors hover:border-line2 hover:bg-[#1a2334]">
                <Icon name="upload" className="h-3.5 w-3.5" /> Reemplazar
                <input
                  type="file"
                  accept=".pdf,.docx,.doc"
                  className="hidden"
                  disabled={uploading || busy !== null}
                  onChange={(e) => {
                    void handleFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
              <Button variant="subtle" size="xs" onClick={() => void handleDelete()} disabled={busy !== null}>
                <Icon name="trash" className="h-3.5 w-3.5" /> {busy === "delete" ? "Quitando…" : "Quitar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {!draft && (
        <label
          onDragEnter={handleCvDragEnter}
          onDragOver={handleCvDragOver}
          onDragLeave={handleCvDragLeave}
          onDrop={handleCvDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
            uploading
              ? "border-brand/60 bg-brand/6"
              : draggingCv
                ? "border-brand bg-brand/10"
                : "border-line2 bg-surface/40 hover:border-brand/45 hover:bg-brand/5",
          )}
        >
          <div
            className={cn(
              "mb-3 flex h-12 w-12 items-center justify-center rounded-lg border border-line2 bg-elev",
              uploading ? "text-brand" : "text-muted",
            )}
          >
            <Icon name={uploading ? "trend" : "upload"} className="h-5 w-5" />
          </div>

          {uploading ? (
            <>
              <p className="text-[13px] text-ink">Subiendo {uploadName ?? "CV"}…</p>
              <div className="mt-3 h-1.5 w-full max-w-[240px] overflow-hidden rounded-full bg-elev2">
                <div className="h-full w-full animate-pulse rounded-full bg-brand" />
              </div>
            </>
          ) : (
            <>
              <p className="text-[14px] font-medium text-ink">
                {draggingCv ? "Suelta aquí tu archivo de CV" : "Selecciona un archivo de CV"}
              </p>
              {!draggingCv && (
                <>
                  <p className="mt-1 text-[12.5px] text-muted">o</p>
                  <span className="mt-2.5 inline-flex h-8.5 items-center rounded-md bg-brand px-3 text-[13px] font-medium text-white">
                    Seleccionar archivo
                  </span>
                </>
              )}
              <p className="mt-3 font-mono text-[10.5px] text-faint">PDF · DOC · DOCX · máx 5 MB</p>
            </>
          )}
          <input
            type="file"
            accept=".pdf,.docx,.doc"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              void handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      )}

      {error && <p className="mt-3 text-[12px] leading-relaxed text-red-300" role="alert">{error}</p>}

      <p className="mt-3 text-[11.5px] leading-relaxed text-faint">
        {backend
          ? "Stored in your private Supabase Storage folder. Preview and download use short-lived signed URLs (1h)."
          : "En el prototipo la carga es simulada: no se suben archivos reales, solo se asocia un CV a esta postulación."}
      </p>
    </Modal>
  );
}

/* ------------------------------------------------------- confirm modal */

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Eliminar",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-md"
      title={title}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm}>
            <Icon name="trash" className="h-3.5 w-3.5" /> {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/6 p-4">
        <Icon name="trash" className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
        <p className="text-[13px] leading-relaxed text-muted">{message}</p>
      </div>
    </Modal>
  );
}

/* ----------------------------------------------------------------- toast */

export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [message, onDone]);

  if (!message) return null;
  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-60 -translate-x-1/2">
      <div className="anim-toast flex items-center gap-2.5 rounded-lg border border-brand/35 bg-elev px-4 py-2.5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.9)]">
        <Icon name="check" className="h-4 w-4 text-brand-soft" strokeWidth={2.4} />
        <span className="text-[13px] text-ink">{message}</span>
      </div>
    </div>
  );
}
