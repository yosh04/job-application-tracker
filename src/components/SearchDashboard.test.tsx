import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SearchDashboard } from "./SearchDashboard";
import type { Application, Search } from "../types";

const search: Search = { id: "s1", name: "Frontend", description: "", createdAt: "2025-01-01" };

const applications: Application[] = [
  {
    id: "a1",
    searchId: "s1",
    company: "Acme",
    position: "Frontend Engineer",
    location: "Remoto",
    url: "",
    status: "Entrevista",
    appliedAt: "2025-02-01",
    notes: "",
    points: [],
    cv: null,
    images: [],
    createdAt: "2025-02-01",
    updatedAt: "2025-02-01",
  },
  {
    id: "a2",
    searchId: "s1",
    company: "Globex",
    position: "Backend Engineer",
    location: "San José",
    url: "",
    status: "Oferta",
    appliedAt: "2025-02-02",
    notes: "",
    points: [],
    cv: null,
    images: [],
    createdAt: "2025-02-02",
    updatedAt: "2025-02-02",
  },
];

describe("SearchDashboard", () => {
  it("combines text search and status filters", () => {
    render(
      <SearchDashboard
        search={search}
        applications={applications}
        onOpenApplication={vi.fn()}
        onNewApplication={vi.fn()}
        onRenameSearch={vi.fn()}
        onDeleteSearch={vi.fn()}
        onEdit={vi.fn()}
        onStatusChange={vi.fn()}
        onDuplicate={vi.fn()}
        onMove={vi.fn()}
        onDelete={vi.fn()}
        onOpenCv={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Buscar empresa o puesto…"), { target: { value: "Acme" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrevista1" }));

    expect(screen.getAllByText("Acme").length).toBeGreaterThan(0);
    expect(screen.queryByText("Globex")).toBeNull();
  });

  it("keeps search actions right-aligned and the options menu visible on mobile", async () => {
    const user = userEvent.setup();
    render(
      <SearchDashboard
        search={search}
        applications={applications}
        onOpenApplication={vi.fn()}
        onNewApplication={vi.fn()}
        onRenameSearch={vi.fn()}
        onDeleteSearch={vi.fn()}
        onEdit={vi.fn()}
        onStatusChange={vi.fn()}
        onDuplicate={vi.fn()}
        onMove={vi.fn()}
        onDelete={vi.fn()}
        onOpenCv={vi.fn()}
      />,
    );

    const optionsButton = screen.getByRole("button", { name: "Más opciones" });
    const dropdown = optionsButton.closest(".relative");
    const actions = dropdown?.parentElement;
    expect(actions?.className).toContain("w-full");
    expect(actions?.className).toContain("justify-end");
    expect(actions?.className).toContain("flex-row-reverse");
    expect(within(actions as HTMLElement).getByRole("button", { name: /Nueva postulación/ })).toBeTruthy();

    await user.click(optionsButton);
    expect(screen.getByRole("menuitem", { name: "Editar búsqueda" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Eliminar búsqueda" })).toBeTruthy();
  });

  it("offers the requested actions on mobile application cards", () => {
    const onEdit = vi.fn();
    const onMove = vi.fn();
    const onDelete = vi.fn();
    const onOpenApplication = vi.fn();

    render(
      <SearchDashboard
        search={search}
        applications={applications.slice(0, 1)}
        onOpenApplication={onOpenApplication}
        onNewApplication={vi.fn()}
        onRenameSearch={vi.fn()}
        onDeleteSearch={vi.fn()}
        onEdit={onEdit}
        onStatusChange={vi.fn()}
        onDuplicate={vi.fn()}
        onMove={onMove}
        onDelete={onDelete}
        onOpenCv={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ver Acme" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar Acme" }));
    fireEvent.click(screen.getByRole("button", { name: "Mover Acme" }));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar Acme" }));

    expect(onOpenApplication).toHaveBeenCalledWith("a1");
    expect(onEdit).toHaveBeenCalledWith("a1");
    expect(onMove).toHaveBeenCalledWith("a1");
    expect(onDelete).toHaveBeenCalledWith("a1");
  });

  it("opens the desktop status menu above neighboring rows without clipping", async () => {
    const user = userEvent.setup();
    render(
      <SearchDashboard
        search={search}
        applications={applications}
        onOpenApplication={vi.fn()}
        onNewApplication={vi.fn()}
        onRenameSearch={vi.fn()}
        onDeleteSearch={vi.fn()}
        onEdit={vi.fn()}
        onStatusChange={vi.fn()}
        onDuplicate={vi.fn()}
        onMove={vi.fn()}
        onDelete={vi.fn()}
        onOpenCv={vi.fn()}
      />,
    );

    const statusButton = screen.getByRole("button", { name: "Cambiar estado de Acme" });
    const row = statusButton.closest<HTMLElement>(".group");
    if (!row) throw new Error("Application row was not rendered.");
    expect(row.className).toContain("focus-within:z-20");
    expect(row.parentElement?.className).toContain("overflow-visible");
    expect(row.parentElement?.className).not.toContain("overflow-hidden");

    await user.click(statusButton);
    expect(within(row).getByRole("menu")).toBeTruthy();
    expect(within(row).getByRole("menuitem", { name: "Oferta" })).toBeTruthy();
  });
});
