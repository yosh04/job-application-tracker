import type { Application, ApplicationActivity } from "../types";

let lastActivityTimestamp = 0;

export function createActivityEntry(label: string, details?: string): ApplicationActivity {
  lastActivityTimestamp = Math.max(Date.now(), lastActivityTimestamp + 1);
  return {
    id: crypto.randomUUID(),
    label,
    ...(details ? { details } : {}),
    createdAt: new Date(lastActivityTimestamp).toISOString(),
  };
}

export function describeApplicationChanges(
  previous: Application,
  next: Application,
): ApplicationActivity[] {
  const events: ApplicationActivity[] = [];
  const add = (label: string, details?: string) => events.push(createActivityEntry(label, details));

  if (previous.status !== next.status) add("Estado actualizado", `${previous.status} → ${next.status}`);

  if (previous.searchId !== next.searchId) add("Postulación movida a otra búsqueda");

  const changedFields = [
    previous.company !== next.company && "empresa",
    previous.position !== next.position && "puesto",
    previous.location !== next.location && "ubicación",
    previous.url !== next.url && "URL de la oferta",
    previous.appliedAt !== next.appliedAt && "fecha de aplicación",
    previous.deadline !== next.deadline && "fecha límite",
  ].filter((field): field is string => !!field);
  if (changedFields.length > 0) add("Información de la postulación actualizada", changedFields.join(", "));

  if (previous.notes !== next.notes) add("Notas personales actualizadas");

  const cvChanged =
    previous.cv === null
      ? next.cv !== null
      : next.cv === null ||
        previous.cv.name !== next.cv.name ||
        previous.cv.size !== next.cv.size ||
        previous.cv.updatedAt !== next.cv.updatedAt ||
        previous.cv.path !== next.cv.path ||
        previous.cv.dataUrl !== next.cv.dataUrl;
  if (cvChanged) {
    if (!next.cv) add("CV personalizado quitado");
    else if (!previous.cv) add("CV personalizado agregado", next.cv.name);
    else add("CV personalizado reemplazado", next.cv.name);
  }

  const previousImages = previous.images ?? [];
  const nextImages = next.images ?? [];
  const addedImages = nextImages.filter((image) => !previousImages.includes(image)).length;
  const removedImages = previousImages.filter((image) => !nextImages.includes(image)).length;
  if (addedImages > 0) add("Evidencia agregada", `${addedImages} imagen(es)`);
  if (removedImages > 0) add("Evidencia quitada", `${removedImages} imagen(es)`);

  const oldPoints = previous.points ?? [];
  const newPoints = next.points ?? [];
  const oldById = new Map(oldPoints.map((point) => [point.id, point]));
  const newById = new Map(newPoints.map((point) => [point.id, point]));
  const addedPoints = newPoints.filter((point) => !oldById.has(point.id));
  const removedPoints = oldPoints.filter((point) => !newById.has(point.id));
  const updatedPoints = newPoints.filter((point) => {
    const oldPoint = oldById.get(point.id);
    return oldPoint && (oldPoint.title !== point.title || oldPoint.content !== point.content);
  });
  for (const point of addedPoints) add("Punto de interés agregado", point.title);
  for (const point of updatedPoints) add("Punto de interés actualizado", point.title);
  for (const point of removedPoints) add("Punto de interés eliminado", point.title);

  return events;
}

export function initialApplicationActivity(status: Application["status"]): ApplicationActivity[] {
  return [createActivityEntry("Postulación creada", `Estado inicial: ${status}`)];
}

export function mergeActivityEntries(
  current: ApplicationActivity[],
  persisted: ApplicationActivity[],
): ApplicationActivity[] {
  const entries = new Map<string, ApplicationActivity>();
  for (const event of [...current, ...persisted]) entries.set(event.id, event);
  return [...entries.values()].sort((first, second) =>
    first.createdAt.localeCompare(second.createdAt) || first.id.localeCompare(second.id),
  );
}

export function recordApplicationChanges(
  previous: Application,
  next: Application,
): Application {
  const events = describeApplicationChanges(previous, next);
  if (events.length === 0) return { ...next, activity: previous.activity ?? [] };

  let history = previous.activity ?? [];
  if (history.length === 0) {
    const firstChangeTimestamp = Date.parse(events[0].createdAt);
    const historyStarted = createActivityEntry("Historial iniciado", `Estado existente: ${previous.status}`);
    historyStarted.createdAt = new Date(firstChangeTimestamp - 2).toISOString();
    history = [
      {
        id: crypto.randomUUID(),
        label: "Postulación creada",
        createdAt: `${previous.createdAt}T12:00:00.000Z`,
      },
      historyStarted,
    ];
  }
  return { ...next, activity: [...history, ...events] };
}
