import { useEffect, useState } from "react";
import { cn } from "../utils/cn";
import { Button, Icon, Input, Label, Modal, Select, Textarea } from "./ui";
import { STATUSES, MAX_EVIDENCE_IMAGES, longDate, todayISO, type Application, type InterestPoint, type Search, type Status } from "../types";

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
  const [cv, setCv] = useState<Application["cv"]>(null);
  const [images, setImages] = useState<string[]>([]);
  const [imgWarning, setImgWarning] = useState<string | null>(null);
  const [pendingImg, setPendingImg] = useState<number | null>(null);

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
    setCv(editing?.cv ?? null);
    setImages(editing?.images ? [...editing.images].slice(0, MAX_EVIDENCE_IMAGES) : []);
    setPt({ title: "", content: "" });
    setImgWarning(null);
  }, [open, editing, defaultSearchId, searches]);

  const valid = form.company.trim() && form.position.trim();
  const imagesFull = images.length >= MAX_EVIDENCE_IMAGES;

  // TODO(supabase): migrate to Supabase Storage bucket — upload files and store public URLs instead of data-URLs.
  const handleImageFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = MAX_EVIDENCE_IMAGES - images.length;
    if (remaining <= 0) {
      setImgWarning(`Máximo ${MAX_EVIDENCE_IMAGES} imágenes por postulación`);
      return;
    }
    const selected = Array.from(files).slice(0, remaining);
    if (files.length > remaining) setImgWarning(`Máximo ${MAX_EVIDENCE_IMAGES} imágenes por postulación`);
    selected.forEach((file) => {
      if (file.size > 2 * 1024 * 1024)
        setImgWarning("Archivo grande (>2 MB): se guarda solo en este prototipo y puede ralentizar la app");
      const reader = new FileReader();
      reader.onload = () => {
        const url = typeof reader.result === "string" ? reader.result : null;
        if (!url) return;
        setImages((prev) => (prev.length >= MAX_EVIDENCE_IMAGES ? prev : [...prev, url]));
      };
      reader.readAsDataURL(file);
    });
  };

  const submit = () => {
    if (!valid) return;
    onSave({
      ...form,
      company: form.company.trim(),
      position: form.position.trim(),
      deadline: form.deadline.trim() ? form.deadline.trim() : undefined,
      points,
      cv,
      images: images.slice(0, MAX_EVIDENCE_IMAGES),
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
            <Button variant="primary" size="sm" disabled={!valid} onClick={submit}>
              {editing ? "Guardar cambios" : "Guardar postulación"}
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
            <Label>URL de la oferta</Label>
            <Input
              placeholder="https://…"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="font-mono text-[12.5px]"
            />
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
              <Input type="date" value={form.appliedAt} onChange={(e) => setForm({ ...form, appliedAt: e.target.value })} />
            </div>
            <div>
              <Label hint="opcional">Fecha límite</Label>
              <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
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
                  setPoints([...points, { id: `p_${Date.now()}`, title: pt.title.trim(), content: pt.content.trim() }]);
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
                <p className="font-mono text-[10.5px] text-faint">PDF · {cv.size}</p>
              </div>
              <button onClick={() => setCv(null)} className="text-faint hover:text-red-300" aria-label="Quitar CV">
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() =>
                setCv({ name: `CV - ${form.company.trim() || "Empresa"}.pdf`, size: "236 KB", updatedAt: todayISO() })
              }
              className="flex w-full flex-col items-center rounded-md border border-dashed border-line2 px-4 py-5 transition-colors hover:border-brand/45 hover:bg-brand/5"
            >
              <Icon name="upload" className="mb-2 h-4 w-4 text-muted" />
              <p className="text-[12.5px] text-ink">Arrastra tu CV aquí</p>
              <p className="mt-0.5 font-mono text-[10.5px] text-faint">PDF · DOCX · máx 5 MB</p>
            </button>
          )}
        </div>

        {/* evidence images */}
        <div className="rounded-lg border border-line bg-surface/50 p-3.5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-faint uppercase">
              Capturas / Evidencia · {images.length}/{MAX_EVIDENCE_IMAGES}
            </p>
          </div>
          {images.length > 0 && (
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {images.map((src, i) => (
                <div key={i} className="group relative overflow-hidden rounded-md border border-line">
                  <img src={src} alt={`Evidencia ${i + 1}`} className="h-20 w-full object-cover" />
                  <button
                    onClick={() => setPendingImg(i)}
                    className="absolute top-1 right-1 rounded-full bg-black/70 p-1 text-white transition-opacity hover:bg-red-500/90"
                    aria-label={`Quitar imagen ${i + 1}`}
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
              {imagesFull ? `Máximo ${MAX_EVIDENCE_IMAGES} imágenes alcanzado` : "Agrega capturas de la oferta"}
            </p>
            <p className="mt-0.5 font-mono text-[10.5px] text-faint">PNG · JPG · máx {MAX_EVIDENCE_IMAGES}</p>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={imagesFull}
              className="hidden"
              onChange={(e) => {
                handleImageFiles(e.target.files);
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
  const [progress, setProgress] = useState<number | null>(null);
  const [draft, setDraft] = useState<Application["cv"]>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(app?.cv ?? null);
    setProgress(null);
  }, [open, app]);

  const simulate = () => {
    if (progress !== null) return;
    setProgress(0);
    const timer = setInterval(() => {
      setProgress((p) => {
        const next = (p ?? 0) + Math.random() * 22 + 8;
        if (next >= 100) {
          clearInterval(timer);
          setDraft({
            name: `CV - ${app?.company ?? "Empresa"}.pdf`,
            size: "248 KB",
            updatedAt: todayISO(),
          });
          setTimeout(() => setProgress(null), 500);
          return 100;
        }
        return next;
      });
    }, 160);
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
          <Button variant="primary" size="sm" disabled={!draft} onClick={() => onSave(draft)}>
            Guardar CV
          </Button>
        </>
      }
    >
      {app?.cv && draft && progress === null && (
        <div className="mb-4 rounded-lg border border-line bg-panel p-5">
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-lg border border-brand/25 bg-brand/10 text-brand-soft">
              <Icon name="file" className="h-6 w-6" />
            </div>
            <p className="text-[14px] font-medium text-ink">{draft.name}</p>
            <p className="mt-1 font-mono text-[11.5px] text-faint">
              PDF · {draft.size} · actualizado {longDate(draft.updatedAt)}
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="xs">
                <Icon name="eye" className="h-3.5 w-3.5" /> Ver
              </Button>
              <Button variant="subtle" size="xs" onClick={() => setDraft(null)}>
                <Icon name="upload" className="h-3.5 w-3.5" /> Reemplazar
              </Button>
            </div>
          </div>
          <div className="mt-5 border-t border-line pt-4">
            <p className="mb-2 text-[10.5px] tracking-[0.14em] text-faint uppercase">Vista previa del documento</p>
            <div className="space-y-2 rounded-md border border-line bg-surface/60 p-4">
              {[92, 78, 85, 60, 88, 45, 70].map((w, i) => (
                <div key={i} className="h-2 rounded-full bg-elev2" style={{ width: `${w}%` }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {(progress !== null || (!app?.cv && !draft)) && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            simulate();
          }}
          className={cn(
            "flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
            progress !== null ? "border-brand/60 bg-brand/6" : "border-line2 bg-surface/40 hover:border-brand/45 hover:bg-brand/5",
          )}
        >
          <div
            className={cn(
              "mb-3 flex h-12 w-12 items-center justify-center rounded-lg border border-line2 bg-elev",
              progress !== null ? "text-brand" : "text-muted",
            )}
          >
            <Icon name={progress !== null ? "trend" : "upload"} className="h-5 w-5" />
          </div>

          {progress === null ? (
            <>
              <p className="text-[14px] font-medium text-ink">Arrastra tu CV aquí</p>
              <p className="mt-1 text-[12.5px] text-muted">o</p>
              <Button variant="primary" size="sm" className="mt-2.5" onClick={simulate}>
                Seleccionar archivo
              </Button>
              <p className="mt-3 font-mono text-[10.5px] text-faint">PDF · DOCX · máx 5 MB</p>
            </>
          ) : (
            <>
              <p className="text-[13px] text-ink">Subiendo CV - {app?.company}.pdf…</p>
              <div className="mt-3 h-1.5 w-full max-w-[240px] overflow-hidden rounded-full bg-elev2">
                <div
                  className="h-full rounded-full bg-brand transition-all duration-200"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <p className="mt-2 font-mono text-[11px] text-faint">{Math.min(Math.round(progress), 100)}%</p>
            </>
          )}
        </div>
      )}

      <p className="mt-3 text-[11.5px] leading-relaxed text-faint">
        En el prototipo la carga es simulada: no se suben archivos reales, solo se asocia un CV a esta postulación.
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
