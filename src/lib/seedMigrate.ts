import { SEED_APPLICATIONS, SEED_SEARCHES } from "../seed";
import { createApplication, createSearch } from "./db";

// One-shot seed import (Fase 2, slice 3). Never runs automatically — App.tsx
// calls it only from the explicit "Importar datos de ejemplo" button shown in
// the empty-workspace state (configured backend + session + zero searches).
// Seeds carry prototype ids (s_frontend, a_microsoft, p1, ...) which are not
// DB uuids, so every row is inserted fresh and old ids are remapped.
export async function importSeeds(): Promise<{ searches: number; applications: number }> {
  const searchIdMap = new Map<string, string>();
  try {
    for (const seed of SEED_SEARCHES) {
      const created = await createSearch({ name: seed.name, description: seed.description });
      searchIdMap.set(seed.id, created.id);
    }
    let applications = 0;
    for (const seed of SEED_APPLICATIONS) {
      const searchId = searchIdMap.get(seed.searchId);
      // Throws for toast display when a seed references an unknown search.
      if (!searchId) throw new Error(`Seed references unknown search "${seed.searchId}".`);
      await createApplication({
        searchId,
        company: seed.company,
        position: seed.position,
        location: seed.location,
        url: seed.url,
        status: seed.status,
        appliedAt: seed.appliedAt,
        ...(seed.deadline ? { deadline: seed.deadline } : {}),
        notes: seed.notes,
        // Empty ids force fresh DB uuids via syncPoints insert path.
        points: seed.points.map((p) => ({ id: "", title: p.title, content: p.content })),
        cv: seed.cv,
        images: [...seed.images],
      });
      applications += 1;
    }
    return { searches: searchIdMap.size, applications };
  } catch (err) {
    // Surface RLS/session failures verbatim so the toast explains the cause.
    if (err instanceof Error) throw err;
    throw new Error("No se pudieron importar los datos de ejemplo.");
  }
}
