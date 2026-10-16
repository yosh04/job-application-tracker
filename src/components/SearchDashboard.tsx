import { useMemo, useState } from "react";
import { cn } from "../utils/cn";
import { Button, Empty, Icon, IconButton, StatusBadge, StatusDot, Dropdown, MenuItem, MenuSeparator } from "./ui";
import { shortDate, type Application, type Search, type Status, STATUSES } from "../types";
import { DeadlineBadge } from "./DeadlineBadge";

function StatCard({
  value,
  label,
  accent,
}: {
  value: number | string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border bg-panel px-4 py-3.5",
        accent ? "border-brand/35 bg-brand/6" : "border-line",
      )}
    >
      <p className={cn("font-mono text-[26px] leading-none font-medium tracking-tight", accent ? "text-brand-soft" : "text-ink")}>
        {value}
      </p>
      <p className="mt-2 text-[11.5px] tracking-wide text-muted uppercase">{label}</p>
      {accent && <div className="absolute -top-8 -right-8 h-20 w-20 rounded-full bg-brand/16 blur-2xl" />}
    </div>
  );
}

export function SearchDashboard({
  search,
  applications,
  onOpenApplication,
  onNewApplication,
  onRenameSearch,
  onDeleteSearch,
  onEdit,
  onStatusChange,
  onDuplicate,
  onMove,
  onDelete,
  onOpenCv,
}: {
  search: Search;
  applications: Application[];
  onOpenApplication: (id: string) => void;
  onNewApplication: () => void;
  onRenameSearch: () => void;
  onDeleteSearch: () => void;
  onEdit: (id: string) => void;
  onStatusChange: (id: string, status: Status) => void;
  onDuplicate: (id: string) => void;
  onMove: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenCv: (id: string) => void;
}) {
  const [filter, setFilter] = useState<Status | "Todas">("Todas");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    applications.forEach((a) => (c[a.status] = (c[a.status] ?? 0) + 1));
    return c;
  }, [applications]);

  const filtered = applications.filter((a) => {
    const matchStatus = filter === "Todas" || a.status === filter;
    const q = query.trim().toLowerCase();
    const matchQuery =
      !q ||
      a.company.toLowerCase().includes(q) ||
      a.position.toLowerCase().includes(q) ||
      a.location.toLowerCase().includes(q);
    return matchStatus && matchQuery;
  });

  const total = applications.length;
  const interview = counts["Entrevista"] ?? 0;
  const inProgress = (counts["Aplicado"] ?? 0) + (counts["Revisión"] ?? 0);
  const offers = counts["Oferta"] ?? 0;

  const segments: Status[] = STATUSES.filter((s) => counts[s]);
  const activeFilters: (Status | "Todas")[] = ["Todas", ...STATUSES.filter((s) => counts[s])];

  return (
    <div className="mx-auto w-full max-w-[1080px] px-5 py-7 sm:px-8 sm:py-9">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-[12px] text-faint">
            <Icon name="folder" className="h-3.5 w-3.5" />
            Objetivo de búsqueda
          </div>
          <h1 className="text-[26px] leading-tight font-semibold tracking-tight text-ink sm:text-[30px]">{search.name}</h1>
          <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-muted">{search.description || "Sin descripción."}</p>
          <p className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-faint">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="layers" className="h-3.5 w-3.5" /> {total} postulaciones
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="calendar" className="h-3.5 w-3.5" /> Creada el {shortDate(search.createdAt)}
            </span>
          </p>
        </div>

        <div className="relative z-30 ml-auto flex w-full flex-row-reverse items-center justify-end gap-2 sm:w-auto sm:flex-row">
          <Dropdown
            trigger={(open) => (
              <IconButton label="Más opciones" className={cn(open && "bg-white/8 text-ink")}>
                <Icon name="dots" />
              </IconButton>
            )}
          >
            {(close) => (
              <>
                <MenuItem
                  icon="pencil"
                  onClick={() => {
                    close();
                    onRenameSearch();
                  }}
                >
                  Editar búsqueda
                </MenuItem>
                <MenuSeparator />
                <MenuItem
                  icon="trash"
                  danger
                  onClick={() => {
                    close();
                    onDeleteSearch();
                  }}
                >
                  Eliminar búsqueda
                </MenuItem>
              </>
            )}
          </Dropdown>
          <Button variant="primary" size="sm" onClick={onNewApplication}>
            <Icon name="plus" strokeWidth={2} />
            Nueva postulación
          </Button>
        </div>
      </div>

      {/* stats */}
      <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard value={total} label="Aplicadas" />
        <StatCard value={interview} label="Entrevista" accent />
        <StatCard value={inProgress} label="En proceso" />
        <StatCard value={offers} label="Ofertas" accent={offers > 0} />
      </div>

      {/* distribution bar */}
      <div className="mt-4 rounded-lg border border-line bg-panel p-4">
        <div className="mb-2.5 flex items-center justify-between">
          <p className="text-[11.5px] tracking-[0.14em] text-faint uppercase">Distribución por estado</p>
          <p className="font-mono text-[11px] text-faint">{total} total</p>
        </div>
        {total === 0 ? (
          <p className="text-[12.5px] text-faint">Aún no hay postulaciones en este objetivo.</p>
        ) : (
          <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-elev">
            {segments.map((s) => (
              <div
                key={s}
                title={`${s}: ${counts[s]}`}
                style={{
                  width: `${((counts[s] ?? 0) / total) * 100}%`,
                  background: `linear-gradient(180deg, ${
                    { Aplicado: "#3b82f6", "Sin respuesta": "#a3a3a3", Revisión: "#818cf8", Entrevista: "#22d3ee", Oferta: "#34d399", Contratado: "#16a34a", Rechazado: "#f87171", Retirado: "#5a6578", Guardado: "#64748b" }[s]
                  }, ${s === "Entrevista" ? "#0e7490" : s === "Oferta" ? "#059669" : s === "Contratado" ? "#14532d" : s === "Rechazado" ? "#b91c1c" : "#1e3a8a"})`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* applications */}
      <div className="mt-9">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold tracking-tight text-ink">Postulaciones</h2>
          <div className="relative">
            <Icon name="search" className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar empresa o puesto…"
              className="h-8.5 w-[190px] rounded-md border border-line bg-surface pr-3 pl-8 text-[12.5px] text-ink placeholder:text-faint focus:border-brand/50 focus:outline-none"
            />
          </div>
        </div>

        {/* filters */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {activeFilters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-colors",
                filter === f
                  ? "border-brand/45 bg-brand/12 text-brand-soft"
                  : "border-line bg-transparent text-muted hover:border-line2 hover:text-ink",
              )}
            >
              {f !== "Todas" && <StatusDot status={f} className="h-1.5 w-1.5" />}
              {f}
              <span className="font-mono text-[10.5px] text-faint">
                {f === "Todas" ? total : counts[f]}
              </span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <Empty
            icon="briefcase"
            title={total === 0 ? "Todavía no hay postulaciones" : "Sin resultados"}
            text={
              total === 0
                ? "Crea la primera postulación de este objetivo para empezar a darle seguimiento."
                : "Ninguna postulación coincide con el filtro o la búsqueda actual."
            }
            action={
              total === 0 ? (
                <Button variant="primary" size="sm" onClick={onNewApplication}>
                  <Icon name="plus" strokeWidth={2} /> Nueva postulación
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => { setFilter("Todas"); setQuery(""); }}>
                  Limpiar filtros
                </Button>
              )
            }
          />
        ) : (
          <>
            {/* desktop table */}
            <div className="hidden overflow-visible rounded-lg border border-line md:block">
              <div className="grid grid-cols-[1.1fr_1.5fr_150px_140px_44px] items-center gap-3 border-b border-line bg-elev/70 px-4 py-2.5 text-[11px] font-semibold tracking-[0.12em] text-faint uppercase">
                <span>Empresa</span>
                <span>Puesto</span>
                <span>Estado</span>
                <span>Fecha</span>
                <span />
              </div>
              {filtered.map((app, i) => (
                <div
                  key={app.id}
                  onClick={() => onOpenApplication(app.id)}
                  className={cn(
                    "group relative grid cursor-pointer grid-cols-[1.1fr_1.5fr_150px_140px_44px] items-center gap-3 px-4 py-3 transition-colors hover:z-10 hover:bg-brand/6 focus-within:z-20",
                    i !== filtered.length - 1 && "border-b border-line",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line2 bg-elev text-[11px] font-semibold text-brand-soft">
                      {app.company.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="truncate text-[13.5px] font-medium text-ink">{app.company}</span>
                    {app.cv && <Icon name="file" className="h-3.5 w-3.5 shrink-0 text-faint" />}
                  </div>
                  <span className="truncate text-[13px] text-muted">{app.position}</span>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Dropdown
                      width="w-40"
                      trigger={(open) => (
                        <button type="button" aria-label={`Cambiar estado de ${app.company}`} className="inline-flex items-center gap-1">
                          <StatusBadge status={app.status} />
                          <Icon name="caret" className={cn("h-3 w-3 text-faint transition-transform", open && "rotate-180")} />
                        </button>
                      )}
                    >
                      {(close) => (
                        <>
                          <div role="presentation" className="px-2.5 pt-1 pb-1.5 text-[10.5px] tracking-[0.14em] text-faint uppercase">Cambiar estado</div>
                          {STATUSES.map((s) => (
                            <button
                              key={s}
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                onStatusChange(app.id, s);
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
                  </div>
                  <div className="flex min-w-0 flex-col items-start gap-1">
                    <span className="font-mono text-[12px] text-faint">{shortDate(app.appliedAt)}</span>
                    <DeadlineBadge deadline={app.deadline} />
                  </div>
                  <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                    <Dropdown
                      trigger={(open) => (
                        <IconButton
                          label="Opciones"
                          className={cn("h-7 w-7", open ? "opacity-100" : "opacity-0 group-hover:opacity-100")}
                        >
                          <Icon name="dots" />
                        </IconButton>
                      )}
                    >
                      {(close) => (
                        <>
                          <MenuItem icon="eye" onClick={() => { close(); onOpenApplication(app.id); }}>
                            Ver ficha
                          </MenuItem>
                          {app.cv && (
                            <MenuItem icon="file" onClick={() => { close(); onOpenCv(app.id); }}>
                              Ver CV
                            </MenuItem>
                          )}
                          <MenuItem icon="copy" onClick={() => { close(); onDuplicate(app.id); }}>
                            Duplicar
                          </MenuItem>
                          <MenuItem icon="move" onClick={() => { close(); onMove(app.id); }}>
                            Mover a…
                          </MenuItem>
                          <MenuSeparator />
                          <MenuItem icon="trash" danger onClick={() => { close(); onDelete(app.id); }}>
                            Eliminar
                          </MenuItem>
                        </>
                      )}
                    </Dropdown>
                  </div>
                </div>
              ))}
            </div>

            {/* mobile cards */}
            <div className="space-y-2.5 md:hidden">
              {filtered.map((app) => (
                <div
                  key={app.id}
                  className="rounded-lg border border-line bg-panel p-4 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => onOpenApplication(app.id)}
                    className="w-full text-left focus-visible:outline-none"
                  >
                    <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14.5px] font-medium text-ink">{app.company}</p>
                      <p className="mt-0.5 truncate text-[13px] text-muted">{app.position}</p>
                    </div>
                    <StatusBadge status={app.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11.5px] text-faint">
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="pin" className="h-3.5 w-3.5" /> {app.location || "—"}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="calendar" className="h-3.5 w-3.5" /> {shortDate(app.appliedAt)}
                      </span>
                      {app.deadline && <DeadlineBadge deadline={app.deadline} />}
                    </div>
                  </button>
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
                    <Button variant="outline" size="xs" onClick={() => onOpenApplication(app.id)}>
                      <Icon name="eye" className="h-3.5 w-3.5" /> Ver {app.company}
                    </Button>
                    <Button variant="outline" size="xs" onClick={() => onEdit(app.id)}>
                      <Icon name="pencil" className="h-3.5 w-3.5" /> Editar {app.company}
                    </Button>
                    <Button variant="outline" size="xs" onClick={() => onMove(app.id)}>
                      <Icon name="move" className="h-3.5 w-3.5" /> Mover {app.company}
                    </Button>
                    <Button variant="danger" size="xs" onClick={() => onDelete(app.id)}>
                      <Icon name="trash" className="h-3.5 w-3.5" /> Eliminar {app.company}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
