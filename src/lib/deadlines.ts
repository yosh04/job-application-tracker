import { todayISO, type Application } from "../types";

export type DeadlineUrgency = "overdue" | "today" | "soon" | "later";

export function daysUntilDeadline(deadline: string): number {
  const [year, month, day] = deadline.split("-").map(Number);
  const [todayYear, todayMonth, todayDay] = todayISO().split("-").map(Number);
  const deadlineTime = Date.UTC(year, month - 1, day);
  const todayTime = Date.UTC(todayYear, todayMonth - 1, todayDay);
  return Math.round((deadlineTime - todayTime) / 86_400_000);
}

export function deadlineUrgency(deadline: string): DeadlineUrgency {
  const days = daysUntilDeadline(deadline);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= 7) return "soon";
  return "later";
}

export function sortByDeadline(applications: Application[]): Application[] {
  return applications
    .filter((application) => !!application.deadline)
    .sort((a, b) => a.deadline!.localeCompare(b.deadline!) || a.company.localeCompare(b.company));
}
