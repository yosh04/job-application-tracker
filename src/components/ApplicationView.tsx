import { useState } from "react";
import { cn } from "../utils/cn";
import {
  Button,
  Icon,
  IconButton,
  Input,
  Label,
  Textarea,
  Dropdown,
  MenuItem,
  MenuSeparator,
  SectionTitle,
  StatusBadge,
  StatusDot,
} from "./ui";
import { longDate, shortDate, STATUSES, todayISO, type Application, type InterestPoint, type Search, type Status } from "../types";

function InfoRow({ label, value, mono, icon }: { label: string; value?: string; mono?: boolean; icon?: string }) {
  return (
    <div>
      <p className="mb-1 text-[10.5px] font-semibold tracking-[0.14em] text-faint uppercase">{label}</p>
      {value ? (
        <p className={cn("flex items-center gap-1.5 text-[13.5px] text-ink", mono && "font-mono text-[12.5px] break-all")}>
          {icon && <Icon name={icon} className="h-3.5 w-3.5 text-faint" />}
          {value}
        </p>
      ) : (
        <p className="text-[13.5px] text-faint">—</p>
      )}
    </div>
  );
}

function PointCard({
  point,
  onSave,
  onDelete,
}: {
  point: InterestPoint;
  onSave: (title: string, content: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(point.title);
  const [content, setContent] = useState(point.content);

  if (editing) {
    return (
      <div className="rounded-lg border border-brand/35 bg-brand/4 p-3.5">
        <Label>Título del punto</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        <div className="mt-3">
          <Label>Contenido</Label>
          <Textarea rows={4} value={content} onChange={(e) => setContent(e.target.value)} />
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" size="xs" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="xs"
            onClick={() => {
              onSave(title.trim() || point.title, content);
              setEditing(false);
            }}
          >
            Guardar punto
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative rounded-lg border border-line bg-panel p-3.5 transition-colors hover:border-line2">
      <div className="absolute top-2.5 right-2.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <IconButton label="Editar punto" className="h-6.5 w-6.5" onClick={() => setEditing(true)}>
          <Icon name="pencil" className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton label="Eliminar punto" className="h-6.5 w-6.5 hover:bg-red-500/12 hover:text-red-300" onClick={onDelete}>
          <Icon name="trash" className="h-3.5 w-3.5" />
        </IconButton>
      </div>
      <p className="pr-16 text-[10.5px] font-semibold tracking-[0.14em] text-brand-soft uppercase">{point.title}</p>
      <div className="my-2 h-px bg-line" />
      <p className="text-[13.5px] leading-relaxed whitespace-pre-line text-muted">{point.content}</p>
    </div>
  );
}

export function ApplicationView({
  app,
  search,
  onBack,
  onEdit,
  onDuplicate,
  onMove,
  onDelete,
  onStatusChange,
  onSavePoint,
  onDeletePoint,
  onAddPoint,
  onSaveNotes,
  onOpenCvModal,
  onRemoveCv,
  onPatch,
}: {
  app: Application;
  search: Search;
  onBack: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onMove: () => void;
  onDelete: () => void;
  onStatusChange: (s: Status) => void;
  onSavePoint: (id: string, title: string, content: string) => void;
  onDeletePoint: (id: string) => void;
  onAddPoint: (title: string, content: string) => void;
  onSaveNotes: (notes: string) => void;
  onOpenCvModal: () => void;
  onRemoveCv: () => void;
  onPatch: (patch: Partial<Application>) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [nPts, setNPts] = useState({ title: "", content: "" });
  const [notes, setNotes] = useState(app.notes);
  const [notesDirty, setNotesDirty] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const images = app.images ?? [];

  return (
    <div className="mx-auto w-full max-w-[1080px] px-5 py-7 sm:px-8 sm:py-9">
      <button
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-1.5 text-[12.5px] text-muted transition-colors hover:text-ink"
      >
        <Icon name="back" className="h-3.5 w-3.5" />
        {search.name}
      </button>

      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-5 rounded-xl border border-line bg-gradient-to-b from-elev/80 to-panel p-5 sm:p-6">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-brand/25 bg-brand/10 text-[15px] font-semibold text-brand-soft">
            {app.company.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-[24px] leading-tight font-semibold tracking-tight text-ink sm:text-[27px]">{app.company}</h1>
            <p className="mt-1 text-[14.5px] text-muted">{app.position}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-faint">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="pin" className="h-3.5 w-3.5" /> {app.location || "Sin ubicación"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="calendar" className="h-3.5 w-3.5" /> Aplicó el {longDate(app.appliedAt)}
              </span>
              {app.deadline ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5",
                    app.deadline < todayISO() ? "font-medium text-red-300" : "text-amber-200/90",
                  )}
                >
                  <Icon name="calendar" className="h-3.5 w-3.5" /> Fecha límite: {longDate(app.deadline)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 opacity-70">
                  <Icon name="calendar" className="h-3.5 w-3.5" /> Sin fecha límite
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Icon name="folder" className="h-3.5 w-3.5" /> {search.name}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Dropdown
            width="w-44"
            align="left"
            trigger={(open) => (
              <button className="inline-flex items-center gap-1.5">
                <StatusBadge status={app.status} />
                <Icon name="caret" className={cn("h-3.5 w-3.5 text-faint transition-transform", open && "rotate-180")} />
              </button>
            )}
          >
            {(close) => (
              <>
                <p className="px-2.5 pt-1 pb-1.5 text-[10.5px] tracking-[0.14em] text-faint uppercase">Cambiar estado</p>
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      onStatusChange(s);
                      close();
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-left text-[13px] transition-colors",
                      s === app.status ? "bg-brand/12 text-ink" : "text-muted hover:bg-white/6 hover:text-ink",
                    )}
                  >
                    <StatusDot status={s} className="h-1.5 w-1.5" />
                    {s}
                    {s === app.status && <Icon name="check" className="ml-auto h-3.5 w-3.5 text-brand" />}
                  </button>
                ))}
              </>
            )}
          </Dropdown>

          <Button variant="subtle" size="sm" onClick={onEdit}>
            <Icon name="pencil" />
            Editar
          </Button>

          <Dropdown
            trigger={(open) => (
              <IconButton label="Más opciones" className={cn(open && "bg-white/8 text-ink")}>
                <Icon name="dots" />
              </IconButton>
            )}
          >
            {(close) => (
              <>
                <MenuItem icon="pencil" onClick={() => { close(); onEdit(); }}>
                  Editar
                </MenuItem>
                <MenuItem icon="copy" onClick={() => { close(); onDuplicate(); }}>
                  Duplicar
                </MenuItem>
                <MenuItem icon="move" onClick={() => { close(); onMove(); }}>
                  Mover a…
                </MenuItem>
                <MenuItem icon="file" onClick={() => { close(); onOpenCvModal(); }}>
                  CV personalizado
                </MenuItem>
                <MenuSeparator />
                <MenuItem icon="trash" danger onClick={() => { close(); onDelete(); }}>
                  Eliminar postulación
                </MenuItem>
              </>
            )}
          </Dropdown>
        </div>
      </div>

      {/* body */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.55fr_1fr]">
        {/* left */}
        <div className="space-y-8">
          <section>
            <SectionTitle>Información</SectionTitle>
            <div className="rounded-xl border border-line bg-panel p-5">
              <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                <InfoRow label="Empresa" value={app.company} />
                <InfoRow label="Puesto" value={app.position} />
                <InfoRow label="Ubicación" value={app.location} icon="pin" />
                <InfoRow label="Fecha de aplicación" value={longDate(app.appliedAt)} icon="calendar" />
                <InfoRow
                  label="Fecha límite"
                  value={app.deadline ? longDate(app.deadline) : undefined}
                  icon="calendar"
                />
              </div>
              <div className="mt-5 border-t border-line pt-4">
                <p className="mb-1 text-[10.5px] font-semibold tracking-[0.14em] text-faint uppercase">URL de la oferta</p>
                {app.url ? (
                  <a
                    href={app.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group inline-flex items-center gap-1.5 font-mono text-[12.5px] break-all text-brand-soft hover:underline"
                  >
                    {app.url}
                    <Icon name="external" className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />
                  </a>
                ) : (
                  <p className="text-[13.5px] text-faint">—</p>
                )}
              </div>
            </div>
          </section>

          <section>
            <SectionTitle
              action={
                !adding && (
                  <button
                    onClick={() => setAdding(true)}
                    className="inline-flex items-center gap-1 text-[12px] text-brand-soft transition-colors hover:text-white"
                  >
                    <Icon name="plus" className="h-3.5 w-3.5" strokeWidth={2} /> Agregar punto
                  </button>
                )
              }
            >
              Puntos de interés · {app.points.length}
            </SectionTitle>

            <div className="space-y-2.5">
              {app.points.map((p) => (
                <PointCard
                  key={p.id}
                  point={p}
                  onSave={(t, c) => onSavePoint(p.id, t, c)}
                  onDelete={() => onDeletePoint(p.id)}
                />
              ))}

              {adding && (
                <div className="anim-pop rounded-lg border border-brand/35 bg-brand/4 p-3.5">
                  <Label>Título del punto</Label>
                  <Input
                    autoFocus
                    placeholder="Ej. Requisitos importantes"
                    value={nPts.title}
                    onChange={(e) => setNPts({ ...nPts, title: e.target.value })}
                  />
                  <div className="mt-3">
                    <Label>Contenido</Label>
                    <Textarea
                      rows={4}
                      placeholder="• 2+ años de experiencia&#10;• Inglés B2"
                      value={nPts.content}
                      onChange={(e) => setNPts({ ...nPts, content: e.target.value })}
                    />
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => {
                        setAdding(false);
                        setNPts({ title: "", content: "" });
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="primary"
                      size="xs"
                      onClick={() => {
                        if (!nPts.title.trim()) return;
                        onAddPoint(nPts.title.trim(), nPts.content);
                        setNPts({ title: "", content: "" });
                        setAdding(false);
                      }}
                    >
                      Agregar punto
                    </Button>
                  </div>
                </div>
              )}

              {app.points.length === 0 && !adding && (
                <div className="rounded-lg border border-dashed border-line2 bg-surface/40 px-4 py-8 text-center">
                  <p className="text-[13px] text-muted">Sin puntos de interés todavía.</p>
                  <p className="mt-1 text-[12px] text-faint">Guarda aquí qué pedían y qué debes preparar.</p>
                  <Button variant="outline" size="xs" className="mt-3" onClick={() => setAdding(true)}>
                    <Icon name="plus" className="h-3.5 w-3.5" /> Agregar punto
                  </Button>
                </div>
              )}
            </div>
          </section>

          <section>
            <SectionTitle>Notas personales</SectionTitle>
            <div className="rounded-xl border border-line bg-panel p-4">
              <Textarea
                rows={4}
                value={notes}
                placeholder="Notas de la entrevista, nombres de reclutadores, seguimientos…"
                onChange={(e) => {
                  setNotes(e.target.value);
                  setNotesDirty(true);
                }}
              />
              <div className="mt-3 flex items-center justify-between">
                <p className="text-[11.5px] text-faint">Se guarda por postulación.</p>
                <Button
                  variant={notesDirty ? "primary" : "outline"}
                  size="xs"
                  disabled={!notesDirty}
                  onClick={() => {
                    onSaveNotes(notes);
                    setNotesDirty(false);
                  }}
                >
                  <Icon name="check" className="h-3.5 w-3.5" /> Guardar notas
                </Button>
              </div>
            </div>
          </section>
        </div>

        {/* right */}
        <div className="space-y-6">
          <section>
            <SectionTitle>Estado</SectionTitle>
            <div className="rounded-xl border border-line bg-panel p-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => onStatusChange(s)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors",
                    s === app.status ? "bg-brand/12 text-ink" : "text-muted hover:bg-white/5 hover:text-ink",
                  )}
                >
                  <StatusDot status={s} />
                  <span className="flex-1">{s}</span>
                  {s === app.status && <Icon name="check" className="h-3.5 w-3.5 text-brand" />}
                </button>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle>CV personalizado</SectionTitle>
            {app.cv ? (
              <div className="overflow-hidden rounded-xl border border-line bg-panel">
                <div className="flex flex-col items-center px-4 py-7 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg border border-brand/25 bg-brand/10 text-brand-soft">
                    <Icon name="file" className="h-5 w-5" />
                  </div>
                  <p className="max-w-full truncate text-[13.5px] font-medium text-ink">{app.cv.name}</p>
                  <p className="mt-1 font-mono text-[11.5px] text-faint">
                    PDF · {app.cv.size} · actualizado {shortDate(app.cv.updatedAt)}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button variant="subtle" size="xs" onClick={onOpenCvModal}>
                      <Icon name="eye" className="h-3.5 w-3.5" /> Ver
                    </Button>
                    <Button variant="outline" size="xs" onClick={onOpenCvModal}>
                      Reemplazar
                    </Button>
                  </div>
                </div>
                <button
                  onClick={onRemoveCv}
                  className="w-full border-t border-line py-2 text-[12px] text-faint transition-colors hover:bg-red-500/8 hover:text-red-300"
                >
                  Quitar CV de esta postulación
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenCvModal}
                className="group flex w-full flex-col items-center rounded-xl border border-dashed border-line2 bg-surface/40 px-4 py-8 transition-colors hover:border-brand/45 hover:bg-brand/5"
              >
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-line2 bg-elev text-muted transition-colors group-hover:text-brand-soft">
                  <Icon name="upload" className="h-5 w-5" />
                </div>
                <p className="text-[13px] font-medium text-ink">Arrastra tu CV aquí</p>
                <p className="mt-0.5 text-[12px] text-faint">o haz clic para seleccionarlo</p>
                <p className="mt-2.5 font-mono text-[10.5px] text-faint">PDF · DOCX · máx 5 MB</p>
              </button>
            )}
          </section>

          <section>
            <SectionTitle>Capturas / Evidencia · {images.length}</SectionTitle>
            {images.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {images.map((src, i) => (
                  <div key={i} className="group relative overflow-hidden rounded-lg border border-line">
                    <button onClick={() => setPreview(src)} className="block w-full" aria-label={`Ver evidencia ${i + 1}`}>
                      <img
                        src={src}
                        alt={`Evidencia ${i + 1}`}
                        className="h-28 w-full object-cover transition-opacity hover:opacity-90"
                      />
                    </button>
                    <button
                      onClick={() => onPatch({ images: images.filter((_, j) => j !== i) })}
                      className="absolute top-1.5 right-1.5 rounded-full bg-black/70 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500/90"
                      aria-label={`Quitar imagen ${i + 1}`}
                    >
                      <Icon name="x" className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-line2 bg-surface/40 px-4 py-6 text-center">
                <p className="text-[12.5px] text-muted">Sin capturas todavía.</p>
                <p className="mt-1 text-[11.5px] text-faint">Edita la postulación para adjuntar capturas de la oferta.</p>
              </div>
            )}
            {preview && (
              <div
                className="anim-fade fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                onClick={() => setPreview(null)}
              >
                <img
                  src={preview}
                  alt="Evidencia ampliada"
                  className="anim-pop max-h-[85vh] max-w-full rounded-lg border border-line2"
                  onClick={(e) => e.stopPropagation()}
                />
                <a
                  href={preview}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-md border border-line2 bg-elev px-3 py-1.5 text-[12px] text-ink hover:border-brand/50"
                >
                  Abrir en pestaña nueva
                </a>
              </div>
            )}
          </section>

          <section>
            <SectionTitle>Actividad</SectionTitle>
            <div className="rounded-xl border border-line bg-panel p-4">
              <ol className="relative space-y-4 border-l border-line pl-4">
                {[
                  { label: "Postulación creada", date: app.createdAt },
                  { label: "Última actualización", date: app.updatedAt },
                  { label: `Estado actual · ${app.status}`, date: app.appliedAt },
                ].map((item, i) => (
                  <li key={i} className="relative">
                    <span
                      className={cn(
                        "absolute top-1 -left-[21px] h-2 w-2 rounded-full ring-3 ring-panel",
                        i === 2 ? "bg-brand" : "bg-line2",
                      )}
                    />
                    <p className="text-[12.5px] text-ink">{item.label}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-faint">{longDate(item.date)}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
