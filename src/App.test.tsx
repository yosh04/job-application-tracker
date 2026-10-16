import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("./lib/supabaseClient", () => ({
  supabase: null,
  isSupabaseConfigured: false,
}));

describe("application management workflow", () => {
  it("shows global search below the mobile header before sign-in", async () => {
    const user = userEvent.setup();
    render(<App />);

    const header = within(screen.getByRole("banner"));
    expect(header.queryByRole("button", { name: "Entrar" })).toBeNull();
    expect(header.getByRole("button", { name: "Abrir búsqueda global" })).toBeTruthy();
    await user.click(header.getByRole("button", { name: "Abrir búsqueda global" }));
    const searchDialog = screen.getByRole("dialog", { name: "Búsqueda global" });
    expect(within(searchDialog).getAllByText("Microsoft").length).toBeGreaterThan(0);
  });

  it("creates, duplicates, edits, moves, and deletes a job application", async () => {
    const user = userEvent.setup();
    render(<App />);

    const sidebar = within(screen.getByRole("complementary"));
    await user.click(sidebar.getByRole("button", { name: "Programador Frontend" }));
    await user.click(screen.getByRole("button", { name: "Nueva postulación" }));
    const createDialog = screen.getByRole("dialog", { name: "Nueva postulación" });
    await user.type(within(createDialog).getByPlaceholderText("Microsoft"), "Acme Test");
    await user.type(within(createDialog).getByPlaceholderText("Frontend Developer"), "Frontend Engineer");
    await user.click(within(createDialog).getByRole("button", { name: "Guardar postulación" }));

    expect(screen.getByRole("heading", { name: "Acme Test" })).toBeTruthy();
    const notes = screen.getByPlaceholderText("Notas de la entrevista, nombres de reclutadores, seguimientos…");
    await user.type(notes, "Seguimiento importante");
    await user.click(screen.getByRole("button", { name: "Guardar notas" }));
    await user.click(within(screen.getByRole("complementary")).getByRole("button", { name: "Programador Frontend" }));
    await user.click(within(screen.getByRole("complementary")).getByRole("button", { name: "Microsoft" }));
    expect((screen.getByPlaceholderText("Notas de la entrevista, nombres de reclutadores, seguimientos…") as HTMLTextAreaElement).value)
      .toContain("Reclutador: Dana M.");
    await user.click(within(screen.getByRole("complementary")).getByRole("button", { name: "Programador Frontend" }));
    await user.click(screen.getByRole("button", { name: "Ver Acme Test" }));
    expect((screen.getByPlaceholderText("Notas de la entrevista, nombres de reclutadores, seguimientos…") as HTMLTextAreaElement).value)
      .toBe("Seguimiento importante");

    await user.click(screen.getByRole("button", { name: "Más opciones" }));
    await user.click(screen.getByRole("menuitem", { name: "Duplicar" }));
    expect(await screen.findByText("Acme Test (copia)")).toBeTruthy();

    await user.click(within(screen.getByRole("complementary")).getByRole("button", { name: "Programador Frontend" }));
    await user.click(screen.getByRole("button", { name: "Ver Acme Test" }));
    await user.click(screen.getByRole("button", { name: "Editar" }));
    const editDialog = screen.getByRole("dialog", { name: "Editar postulación" });
    const companyInput = within(editDialog).getByPlaceholderText("Microsoft");
    await user.clear(companyInput);
    await user.type(companyInput, "Acme Updated");
    await user.click(within(editDialog).getByRole("button", { name: "Guardar cambios" }));
    expect(screen.getByRole("heading", { name: "Acme Updated" })).toBeTruthy();

    await user.click(within(screen.getByRole("complementary")).getByRole("button", { name: "Programador Frontend" }));
    await user.click(screen.getByRole("button", { name: "Mover Acme Updated" }));
    const moveDialog = screen.getByRole("dialog", { name: "Mover postulación" });
    await user.click(within(moveDialog).getByRole("button", { name: /Backend Developer/ }));
    await user.click(within(moveDialog).getByRole("button", { name: "Mover" }));
    await user.click(within(screen.getByRole("complementary")).getByRole("button", { name: "Backend Developer" }));
    expect(await screen.findByRole("heading", { name: "Backend Developer" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Eliminar Acme Updated" }));
    const deleteDialog = screen.getByRole("dialog", { name: "Eliminar postulación" });
    await user.click(within(deleteDialog).getByRole("button", { name: "Eliminar" }));
    expect(screen.queryByRole("button", { name: "Ver Acme Updated" })).toBeNull();
  }, 18000);

  it("adds evidence images by selecting files from the empty evidence area", async () => {
    const user = userEvent.setup();
    render(<App />);

    const sidebar = within(screen.getByRole("complementary"));
    await user.click(sidebar.getByRole("button", { name: "Programador Frontend" }));
    await user.click(screen.getByRole("button", { name: "Ver Microsoft" }));
    const dropArea = screen.getByRole("button", { name: /Haz clic o arrastra imágenes aquí/ });
    expect(dropArea).toBeTruthy();

    const image = new File(["image"], "captura.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("Seleccionar imágenes de evidencia"), image);

    expect(await screen.findByRole("button", { name: "Ver evidencia 1" })).toBeTruthy();
    expect(await screen.findByText("Se agregaron 1 imagen(es)")).toBeTruthy();

    const addMore = screen.getByRole("button", { name: /Agregar imágenes/ });
    const secondImage = new File(["image two"], "captura-2.jpg", { type: "image/jpeg" });
    fireEvent.dragOver(addMore, { dataTransfer: { files: [secondImage] } });
    fireEvent.drop(addMore, { dataTransfer: { files: [secondImage] } });

    expect(await screen.findByRole("button", { name: "Ver evidencia 2" })).toBeTruthy();
    expect(await screen.findByText("Se agregaron 1 imagen(es)")).toBeTruthy();
  });

  it("never lets a postulación store more than four evidence images", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(within(screen.getByRole("complementary")).getByRole("button", { name: "Programador Frontend" }));
    await user.click(screen.getByRole("button", { name: "Ver Microsoft" }));

    const files = Array.from({ length: 5 }, (_, index) =>
      new File([`image-${index}`], `captura-${index}.jpg`, { type: "image/jpeg" }),
    );
    await user.upload(screen.getByLabelText("Seleccionar imágenes de evidencia"), files);

    expect(await screen.findByRole("button", { name: "Ver evidencia 4" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Ver evidencia 5" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Agregar imágenes/ })).toBeNull();
    expect(await screen.findByText(/Solo se pueden adjuntar 4/)).toBeTruthy();
  });

  it("appends each status change to the application activity timeline", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(within(screen.getByRole("complementary")).getByRole("button", { name: "Programador Frontend" }));
    await user.click(screen.getByRole("button", { name: "Ver Microsoft" }));

    await user.click(screen.getByRole("button", { name: "Cambiar estado" }));
    await user.click(screen.getByRole("menuitem", { name: "Oferta" }));
    await user.click(screen.getByRole("button", { name: "Cambiar estado" }));
    await user.click(screen.getByRole("menuitem", { name: "Rechazado" }));

    expect(screen.getAllByText("Estado actualizado")).toHaveLength(2);
    expect(screen.getByText("Entrevista → Oferta")).toBeTruthy();
    expect(screen.getByText("Oferta → Rechazado")).toBeTruthy();
    expect(screen.getByText("Actividad · 4")).toBeTruthy();
    const latestEvent = screen.getByText("Oferta → Rechazado").closest("li");
    const previousEvent = screen.getByText("Entrevista → Oferta").closest("li");
    expect(latestEvent?.querySelector("span")?.className).toContain("bg-brand");
    expect(previousEvent?.querySelector("span")?.className).toContain("bg-line2");
  });

  it("uploads a CV by dropping it in the CV area", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(within(screen.getByRole("complementary")).getByRole("button", { name: "Programador Frontend" }));
    await user.click(screen.getByRole("button", { name: "Ver Microsoft" }));
    await user.click(screen.getByRole("button", { name: "Más opciones" }));
    await user.click(screen.getByRole("menuitem", { name: "CV personalizado" }));

    const cvLabels = screen.getAllByText("CV - Microsoft Frontend.pdf");
    const dropArea = cvLabels[cvLabels.length - 1].closest(".mb-4");
    expect(dropArea).toBeTruthy();
    const cv = new File(["%PDF-1.4"], "resume.pdf", { type: "application/pdf" });
    fireEvent.dragOver(dropArea!, { dataTransfer: { files: [cv] } });
    expect(screen.getByText("Suelta el archivo para reemplazar el CV")).toBeTruthy();
    fireEvent.drop(dropArea!, { dataTransfer: { files: [cv] } });

    expect((await screen.findAllByText("Microsoft_resume.pdf")).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Guardar CV" }));
    expect((await screen.findAllByText("Microsoft_resume.pdf")).length).toBeGreaterThan(0);
  });

  it("uploads the initial CV by dropping it in the empty CV area", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(within(screen.getByRole("complementary")).getByRole("button", { name: "Programador Frontend" }));
    await user.click(screen.getByRole("button", { name: "Ver Empresa XYZ" }));
    await user.click(screen.getByRole("button", { name: /Adjunta un CV/ }));

    const dropArea = screen.getByText("Selecciona un archivo de CV").closest("label");
    if (!dropArea) throw new Error("CV drop area was not rendered.");
    const cv = new File(["%PDF-1.4"], "resume.pdf", { type: "application/pdf" });
    fireEvent.dragEnter(dropArea, { dataTransfer: { files: [cv], items: [], types: ["Files"] } });
    expect(screen.getByText("Suelta aquí tu archivo de CV")).toBeTruthy();
    fireEvent.drop(dropArea, { dataTransfer: { files: [cv], items: [], types: ["Files"] } });

    expect(await screen.findByText("Empresa_XYZ_resume.pdf")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Guardar CV" }));
    expect((await screen.findAllByText("Empresa_XYZ_resume.pdf")).length).toBeGreaterThan(0);
  });
});
