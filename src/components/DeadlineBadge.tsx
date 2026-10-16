import { cn } from "../utils/cn";
import { deadlineUrgency, daysUntilDeadline } from "../lib/deadlines";
import { shortDate } from "../types";

export function DeadlineBadge({ deadline }: { deadline?: string }) {
  if (!deadline) return null;

  const days = daysUntilDeadline(deadline);
  const urgency = deadlineUrgency(deadline);
  const label =
    urgency === "overdue"
      ? `Vencida · ${shortDate(deadline)}`
      : urgency === "today"
        ? "Vence hoy"
        : urgency === "soon"
          ? days === 1
            ? `Mañana · ${shortDate(deadline)}`
            : `En ${days} días · ${shortDate(deadline)}`
          : `Vence ${shortDate(deadline)}`;

  return (
    <span
      aria-label={`Fecha límite: ${label}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium whitespace-nowrap",
        urgency === "overdue"
          ? "border-red-500/30 bg-red-500/10 text-red-300"
          : urgency === "today" || urgency === "soon"
            ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
            : "border-line2 bg-elev text-muted",
      )}
    >
      {label}
    </span>
  );
}
