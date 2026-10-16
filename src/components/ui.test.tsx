import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Button, Dropdown, MenuItem, Modal } from "./ui";

describe("accessible interactive controls", () => {
  it("supports opening, arrow navigation, and Escape in a dropdown", async () => {
    const user = userEvent.setup();
    render(
      <Dropdown trigger={() => <button type="button">Options</button>}>
        {(close) => (
          <>
            <MenuItem onClick={close}>First action</MenuItem>
            <MenuItem onClick={close}>Second action</MenuItem>
          </>
        )}
      </Dropdown>,
    );

    const trigger = screen.getByRole("button", { name: "Options" });
    await user.click(trigger);
    const first = screen.getByRole("menuitem", { name: "First action" });
    const second = screen.getByRole("menuitem", { name: "Second action" });
    expect(document.activeElement).toBe(first);
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(second);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("traps focus inside a modal and restores focus when it closes", async () => {
    const user = userEvent.setup();
    function ModalHarness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Button onClick={() => setOpen(true)}>Open modal</Button>
          <Modal open={open} onClose={() => setOpen(false)} title="Dialog title">
            <Button>First control</Button>
          </Modal>
        </>
      );
    }
    render(<ModalHarness />);

    const opener = screen.getByRole("button", { name: "Open modal" });
    await user.click(opener);
    const dialog = screen.getByRole("dialog", { name: "Dialog title" });
    const closeButton = screen.getByRole("button", { name: "Cerrar" });
    closeButton.focus();
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(dialog.contains(document.activeElement)).toBe(true);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
