import { useMemo } from "react";
import { deadlineUrgency, sortByDeadline } from "../lib/deadlines";
import { shortDate, type Application, type Search } from "../types";
import { cn } from "../utils/cn";
import { Empty, Icon, StatusBadge } from "./ui";
import { DeadlineBadge } from "./DeadlineBadge";

export function DeadlineAgenda({
  applications,
  searches,
  onOpenApplication,
}: {
  applications: Application[];
  searches: Search[];
  onOpenApplication: (id: string) => void;
}) {
  const scheduled = useMemo(() => sortByDeadline([...applications]), [applications]);
  const overdue = scheduled.filter((application) => deadlineUrgency(application.deadline!) === "overdue");
  const upcoming = scheduled.filter((application) => deadlineUrgency(application.deadline!) !== "overdue");
  const searchNames = useMemo(() => new Map(searches.map((search) => [search.id, search.name])), [searches]);

  const rows = (items: Application[]) => items.map((application) => (
    <button
      key={application.id}
      onClick={() => onOpenApplication(application.id)}
      className="flex w-full flex-wrap items-center gap-3 border-b border-line px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-brand/6"
    >
      <span className={cn(
        "w-16 shrink-0 font-mono text-[12px]",
        deadlineUrgency(application.deadline!) === "overdue" ? "text-red-300" : "text-muted",
      )}>
        {shortDate(application.deadline!)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-ink">{application.company}</span>
        <span className="block truncate text-[11.5px] text-muted">{application.position}</span>
      </span>
      <span className="hidden text-[11px] text-faint sm:block">{searchNames.get(application.searchId) ?? "Búsqueda eliminada"}</span>
      <DeadlineBadge deadline={application.deadline} />
      <StatusBadge status={application.status} className="hidden sm:inline-flex" />
      <Icon name="chevron" className="h-4 w-4 text-faint" />
    </button>
  ));

  return (
    <div className="mx-auto w-full max-w-[1080px] px-5 py-7 sm:px-8 sm:py-9">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-2 flex items-center gap-2 text-[12px] text-faint">
            <Icon name="calendar" className="h-3.5 w-3.5" /> Fechas de entrega
          </p>
          <h1 className="text-[26px] font-semibold tracking-tight text-ink sm:text-[30px]">Agenda de vencimientos</h1>
          <p className="mt-1.5 text-[13px] text-muted">Fechas límite ordenadas cronológicamente.</p>
        </div>
        {scheduled.length > 0 && (
          <span className="font-mono text-[11px] text-faint">{scheduled.length} fechas</span>
        )}
      </div>

      {scheduled.length === 0 ? (
        <Empty icon="calendar" title="Sin fechas límite" text="Las postulaciones con fecha límite aparecerán aquí, ordenadas por vencimiento." />
      ) : (
        <div className="space-y-6">
          {overdue.length > 0 && (
            <section>
              <h2 className="mb-2 text-[13px] font-semibold text-red-300">Vencidas · {overdue.length}</h2>
              <div className="overflow-hidden rounded-xl border border-red-500/20 bg-panel">{rows(overdue)}</div>
            </section>
          )}
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-2 text-[13px] font-semibold text-ink">Próximas · {upcoming.length}</h2>
              <div className="overflow-hidden rounded-xl border border-line bg-panel">{rows(upcoming)}</div>
            </section>
          )}
        </div>
      )}

    </div>
  );
}
