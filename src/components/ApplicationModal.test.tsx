import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApplicationModal } from "./Modals";
import type { Application, Search } from "../types";

vi.mock("../lib/supabaseClient", () => ({
  supabase: null,
  isSupabaseConfigured: false,
}));

const search: Search = {
  id: "search-1",
  name: "Frontend",
  description: "",
  createdAt: "2026-10-16",
};

const application: Application = {
  id: "application-1",
  searchId: search.id,
  company: "Acme",
  position: "Frontend Engineer",
  location: "",
  url: "",
  status: "Aplicado",
  appliedAt: "2026-10-16",
  notes: "",
  points: [],
  cv: null,
  images: ["img-1", "img-2", "img-3", "img-4", "legacy-img-5"],
  createdAt: "2026-10-16",
  updatedAt: "2026-10-16",
};

describe("ApplicationModal evidence limit", () => {
  it("preserves existing images above the limit without allowing additional uploads", () => {
    const onSave = vi.fn();
    const { container } = render(
      <ApplicationModal
        open
        onClose={vi.fn()}
        searches={[search]}
        editing={application}
        onSave={onSave}
      />,
    );

    expect(screen.getByText("Capturas / Evidencia · 5/4")).toBeTruthy();
    expect((container.querySelector('input[type="file"]') as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ images: application.images }));
  });
});
