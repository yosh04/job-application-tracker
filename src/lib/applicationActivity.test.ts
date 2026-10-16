import { describe, expect, it } from "vitest";
import { SEED_APPLICATIONS } from "../seed";
import { describeApplicationChanges, mergeActivityEntries, recordApplicationChanges } from "./applicationActivity";

describe("application activity history", () => {
  it("records multiple separate changes with their before and after values", () => {
    const previous = SEED_APPLICATIONS[0];
    const first = recordApplicationChanges(previous, { ...previous, status: "Oferta" });
    const second = recordApplicationChanges(first, { ...first, status: "Rechazado" });

    expect(second.activity).toHaveLength(4);
    expect(second.activity?.map((event) => event.label)).toEqual([
      "Postulación creada",
      "Historial iniciado",
      "Estado actualizado",
      "Estado actualizado",
    ]);
    expect(second.activity?.slice(-2).map((event) => event.details)).toEqual([
      "Entrevista → Oferta",
      "Oferta → Rechazado",
    ]);
  });

  it("describes changes to notes, CV, evidence, and interest points", () => {
    const previous = SEED_APPLICATIONS[1];
    const next = {
      ...previous,
      notes: `${previous.notes} Seguimiento.`,
      cv: null,
      images: ["data:image/png;base64,aGVsbG8="],
      points: [...previous.points, { id: "new-point", title: "Portfolio", content: "Compartir enlace" }],
    };
    const events = describeApplicationChanges(previous, next);

    expect(events.map((event) => event.label)).toEqual([
      "Notas personales actualizadas",
      "CV personalizado quitado",
      "Evidencia agregada",
      "Punto de interés agregado",
    ]);
  });

  it("merges delayed persistence results without dropping newer optimistic events", () => {
    const previous = SEED_APPLICATIONS[0];
    const first = recordApplicationChanges(previous, { ...previous, status: "Oferta" });
    const second = recordApplicationChanges(first, { ...first, status: "Rechazado" });

    expect(mergeActivityEntries(second.activity ?? [], first.activity ?? [])).toHaveLength(4);
  });
});
