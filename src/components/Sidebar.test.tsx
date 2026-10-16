import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "./Sidebar";

describe("Sidebar user alias", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("lets the user edit, save, and cancel a locally persisted alias", async () => {
    const user = userEvent.setup();
    render(
      <Sidebar
        userEmail="anton.escor4@gmail.com"
        searches={[]}
        applications={[]}
        view={{ type: "overview" }}
        expanded={{}}
        onToggle={vi.fn()}
        onSelectSearch={vi.fn()}
        onSelectApplication={vi.fn()}
        onOverview={vi.fn()}
        onAgenda={vi.fn()}
        onNewSearch={vi.fn()}
        onRenameSearch={vi.fn()}
        onDeleteSearch={vi.fn()}
        onNewApplication={vi.fn()}
      />,
    );

    const aliasButton = screen.getByRole("button", { name: "Editar alias: Anton Escor4" });
    await user.click(aliasButton);
    const input = screen.getByRole("textbox", { name: "Alias de usuario" });
    await user.clear(input);
    await user.type(input, "Antony");
    await user.click(screen.getByRole("button", { name: "Guardar alias" }));

    expect(screen.getByRole("button", { name: "Editar alias: Antony" })).toBeTruthy();
    expect(localStorage.getItem("jobtrack:alias:anton.escor4@gmail.com")).toBe("Antony");

    await user.click(screen.getByRole("button", { name: "Editar alias: Antony" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Alias de usuario" }), { target: { value: "Discard me" } });
    await user.click(screen.getByRole("button", { name: "Cancelar alias" }));

    expect(screen.getByRole("button", { name: "Editar alias: Antony" })).toBeTruthy();
    expect(localStorage.getItem("jobtrack:alias:anton.escor4@gmail.com")).toBe("Antony");
  });
});
