import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../utils/cn";
import { shortDate, STATUSES, type Application, type Search, type Status } from "../types";
import { Button, Icon, StatusBadge } from "./ui";
import { DeadlineBadge } from "./DeadlineBadge";

type SortOrder = "applied-desc" | "applied-asc" | "deadline-asc" | "deadline-desc";

export function GlobalSearch({
  open,
  applications,
  searches,
  onClose,
  onOpenApplication,
}: {
  open: boolean;
  applications: Application[];
  searches: Search[];
  onClose: () => void;
  onOpenApplication: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status | "Todas">("Todas");
  const [sort, setSort] = useState<SortOrder>("applied-desc");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setStatus("Todas");
    setSort("applied-desc");
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const searchNames = useMemo(() => new Map(searches.map((search) => [search.id, search.name])), [searches]);
  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const matches = applications.filter((application) => {
      const matchesStatus = status === "Todas" || application.status === status;
      const searchableText = [
        application.company,
        application.position,
        application.location,
        application.notes,
      ]
        .join("\n")
        .toLocaleLowerCase();
      return matchesStatus && (!normalizedQuery || searchableText.includes(normalizedQuery));
    });

    return matches.sort((a, b) => {
      if (sort.startsWith("deadline")) {
        const direction = sort === "deadline-asc" ? 1 : -1;
        if (!a.deadline && !b.deadline) return b.appliedAt.localeCompare(a.appliedAt);
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return direction * a.deadline.localeCompare(b.deadline) || b.appliedAt.localeCompare(a.appliedAt);
      }
      const direction = sort === "applied-asc" ? 1 : -1;
      return direction * a.appliedAt.localeCompare(b.appliedAt) || a.company.localeCompare(b.company);
    });
  }, [applications, query, sort, status]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/72 px-3 pt-[8vh] backdrop-blur-[3px] sm:px-6 sm:pt-[12vh]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-label="Búsqueda global"
        aria-modal="true"
        className="anim-pop flex max-h-[78vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-line2 bg-panel shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]"
        role="dialog"
      >
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <Icon name="search" className="h-5 w-5 text-brand-soft" />
          <input
            ref={inputRef}
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Empresa, puesto, ubicación o notas…"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-faint"
          />
          <kbd className="hidden rounded border border-line2 px-1.5 py-0.5 font-mono text-[10px] text-faint sm:inline">ESC</kbd>
          <Button variant="ghost" size="xs" onClick={onClose} aria-label="Cerrar búsqueda">
            Cerrar
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <label className="sr-only" htmlFor="global-search-status">Filtrar por estado</label>
          <select
            id="global-search-status"
            value={status}
            onChange={(event) => setStatus(event.target.value as Status | "Todas")}
            className="h-8 rounded-md border border-line bg-surface px-2 text-[12px] text-ink focus:border-brand/50 focus:outline-none"
          >
            <option value="Todas">Todos los estados</option>
            {STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <label className="sr-only" htmlFor="global-search-sort">Ordenar resultados</label>
          <select
            id="global-search-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortOrder)}
            className="h-8 rounded-md border border-line bg-surface px-2 text-[12px] text-ink focus:border-brand/50 focus:outline-none"
          >
            <option value="applied-desc">Aplicación: más recientes</option>
            <option value="applied-asc">Aplicación: más antiguas</option>
            <option value="deadline-asc">Vencimiento: más próximo</option>
            <option value="deadline-desc">Vencimiento: más lejano</option>
          </select>
          <span className="ml-auto text-[11px] text-faint">{results.length} resultados</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px] text-muted">
              {applications.length === 0 ? "Aún no hay postulaciones." : "No hay resultados para esos filtros."}
            </p>
          ) : (
            results.map((application) => (
              <button
                key={application.id}
                onClick={() => {
                  onOpenApplication(application.id);
                  onClose();
                }}
                className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-elev focus-visible:bg-elev"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line2 bg-elev text-[11px] font-semibold text-brand-soft">
                  {application.company.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[13.5px] font-medium text-ink">{application.company}</span>
                    <StatusBadge status={application.status} className="px-2 py-0 text-[10.5px]" />
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] text-muted">
                    {application.position}{application.location ? ` · ${application.location}` : ""}
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-2 text-[10.5px] text-faint">
                    <span>{searchNames.get(application.searchId) ?? "Búsqueda eliminada"}</span>
                    <span>Aplicada {shortDate(application.appliedAt)}</span>
                    <DeadlineBadge deadline={application.deadline} />
                  </span>
                </span>
                <Icon name="chevron" className={cn("mt-2 h-4 w-4 text-faint")} />
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
