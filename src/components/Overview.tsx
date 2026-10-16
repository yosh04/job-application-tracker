import { cn } from "../utils/cn";
import { Button, Icon, StatusBadge } from "./ui";
import { shortDate, type Application, type Search } from "../types";
import { sortByDeadline } from "../lib/deadlines";
import { DeadlineBadge } from "./DeadlineBadge";

function BigStat({ value, label, accent }: { value: number | string; label: string; accent?: boolean }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-5",
        accent ? "border-brand/35 bg-brand/6" : "border-line bg-panel",
      )}
    >
      <p
        className={cn(
          "font-mono text-[34px] leading-none font-medium tracking-tight",
          accent ? "text-brand-soft" : "text-ink",
        )}
      >
        {value}
      </p>
      <p className="mt-2.5 text-[11.5px] tracking-[0.1em] text-muted uppercase">{label}</p>
      {accent && <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-brand/18 blur-2xl" />}
    </div>
  );
}

export function Overview({
  searches,
  applications,
  onOpenSearch,
  onOpenApplication,
  onNewSearch,
  onNewApplication,
  onOpenAgenda,
}: {
  searches: Search[];
  applications: Application[];
  onOpenSearch: (id: string) => void;
  onOpenApplication: (id: string) => void;
  onNewSearch: () => void;
  onNewApplication: () => void;
  onOpenAgenda: () => void;
}) {
  const count = (s: StatusOrString) => applications.filter((a) => a.status === s).length;
  const interviews = count("Entrevista");
  const offers = count("Oferta");
  const answered = interviews + offers + count("Rechazado") + count("Retirado");
  const rate = applications.length ? Math.round((answered / applications.length) * 100) : 0;

  const recent = [...applications].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).slice(0, 6);
  const upcomingDeadlines = sortByDeadline([...applications]).slice(0, 5);

  return (
    <div className="mx-auto w-full max-w-[1080px] px-5 py-7 sm:px-8 sm:py-9">
      <div className="grid-bg relative overflow-hidden rounded-xl border border-line px-5 py-8 sm:px-8">
        <div className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-brand/14 blur-3xl" />
        <p className="relative text-[11px] font-semibold tracking-[0.2em] text-brand-soft uppercase">JobTrack</p>
        <h1 className="relative mt-2 max-w-lg text-[27px] leading-tight font-semibold tracking-tight text-ink sm:text-[32px]">
          Organiza tu búsqueda de empleo.
        </h1>
        <p className="relative mt-2 max-w-md text-[13.5px] leading-relaxed text-muted">
          Una carpeta representa una búsqueda laboral; una postulación representa una oportunidad concreta dentro de esa
          búsqueda.
        </p>
        <div className="relative mt-5 flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={onNewSearch}>
            <Icon name="plus" strokeWidth={2} /> Nueva búsqueda
          </Button>
          <Button variant="subtle" size="sm" onClick={onNewApplication}>
            <Icon name="briefcase" /> Nueva postulación
          </Button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <BigStat value={applications.length} label="Postulaciones" />
        <BigStat value={interviews} label="Entrevistas" accent />
        <BigStat value={offers} label="Ofertas" />
        <BigStat value={`${rate}%`} label="Tasa de respuesta" />
      </div>

      <section className="mt-9">
        <div className="mb-3.5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-ink">Vencimientos más cercanos</h2>
            <p className="mt-1 text-[12px] text-muted">Fechas límite ordenadas por proximidad.</p>
          </div>
          <Button variant="outline" size="xs" onClick={onOpenAgenda}>
            <Icon name="calendar" /> Ver agenda
          </Button>
        </div>
        {upcomingDeadlines.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line2 bg-surface/30 px-4 py-5 text-[12.5px] text-faint">
            No hay postulaciones con fecha límite.
          </p>
        ) : (
          <div className="divide-line overflow-hidden rounded-xl border border-line bg-panel">
            {upcomingDeadlines.map((application) => (
              <button
                key={application.id}
                onClick={() => onOpenApplication(application.id)}
                className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-brand/6"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-ink">{application.company}</span>
                  <span className="block truncate text-[11.5px] text-muted">{application.position}</span>
                </span>
                <DeadlineBadge deadline={application.deadline} />
                <StatusBadge status={application.status} className="hidden sm:inline-flex" />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mt-9">
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold tracking-tight text-ink">Mis búsquedas</h2>
          <span className="font-mono text-[11px] text-faint">{searches.length} objetivos</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {searches.map((s) => {
            const apps = applications.filter((a) => a.searchId === s.id);
            const inSearch = (st: string) => apps.filter((a) => a.status === st).length;
            return (
              <button
                key={s.id}
                onClick={() => onOpenSearch(s.id)}
                className="group flex flex-col rounded-xl border border-line bg-panel p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:bg-elev/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md border border-brand/25 bg-brand/10 text-brand-soft">
                      <Icon name="folder" />
                    </span>
                    <p className="text-[14px] font-medium text-ink">{s.name}</p>
                  </div>
                  <Icon name="chevron" className="h-4 w-4 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
                </div>
                <p className="mt-2.5 line-clamp-2 min-h-[34px] text-[12.5px] leading-relaxed text-muted">
                  {s.description || "Sin descripción."}
                </p>
                <div className="mt-3 flex items-center gap-3 border-t border-line pt-3 text-[11.5px] text-faint">
                  <span>{apps.length} postulaciones</span>
                  {inSearch("Entrevista") > 0 && (
                    <span className="text-cyan-300/80">{inSearch("Entrevista")} entrevista</span>
                  )}
                  {inSearch("Oferta") > 0 && <span className="text-emerald-300/80">{inSearch("Oferta")} oferta</span>}
                  <span className="ml-auto font-mono">{shortDate(s.createdAt)}</span>
                </div>
              </button>
            );
          })}
          <button
            onClick={onNewSearch}
            className="flex min-h-[148px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line2 bg-surface/30 text-muted transition-colors hover:border-brand/45 hover:bg-brand/5 hover:text-brand-soft"
          >
            <Icon name="plus" className="h-5 w-5" strokeWidth={1.8} />
            <span className="text-[13px]">Nueva búsqueda</span>
          </button>
        </div>
      </section>

      <section className="mt-9">
        <h2 className="mb-3.5 text-[15px] font-semibold tracking-tight text-ink">Actividad reciente</h2>
        <div className="divide-line overflow-hidden rounded-xl border border-line bg-panel">
          {recent.map((a) => (
            <button
              key={a.id}
              onClick={() => onOpenApplication(a.id)}
              className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-brand/6"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line2 bg-elev text-[11px] font-semibold text-brand-soft">
                {a.company.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-ink">{a.company}</p>
                <p className="truncate text-[12px] text-muted">{a.position}</p>
              </div>
              <StatusBadge status={a.status} className="hidden sm:inline-flex" />
              <span className="hidden font-mono text-[11px] text-faint sm:inline">{shortDate(a.updatedAt)}</span>
              <span aria-hidden="true" className="inline-flex h-7 w-7 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                <Icon name="chevron" className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

type StatusOrString = string;
