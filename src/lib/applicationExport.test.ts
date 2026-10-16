import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import type { Application, Search } from "../types";
import { applicationArchiveFilename, buildApplicationArchive, formatApplicationText } from "./applicationExport";
import { prefixCvFilename } from "./fileNames";

const application: Application = {
  id: "app-1",
  searchId: "search-1",
  company: "Acme",
  position: "Frontend Developer",
  location: "Remoto",
  url: "https://example.com/jobs/1",
  status: "Aplicado",
  appliedAt: "2026-10-01",
  deadline: "2026-10-15",
  notes: "Dar seguimiento el lunes.",
  points: [{ id: "point-1", title: "Experiencia", content: "React y TypeScript" }],
  cv: { name: "Acme_CV.pdf", size: "120 KB", updatedAt: "2026-10-01" },
  images: [],
  createdAt: "2026-10-01",
  updatedAt: "2026-10-01",
};

const search: Search = {
  id: "search-1",
  name: "Frontend",
  description: "",
  createdAt: "2026-10-01",
};

describe("application archive export", () => {
  it("writes application fields, notes, points, and unavailable CV details in Spanish", () => {
    const text = formatApplicationText(application, search, [], false, ["El CV no está disponible."]);

    expect(text).toContain("EMPRESA: Acme");
    expect(text).toContain("BÚSQUEDA: Frontend");
    expect(text).toContain("React y TypeScript");
    expect(text).toContain("Dar seguimiento el lunes.");
    expect(text).toContain("ARCHIVOS NO INCLUIDOS");
    expect(text).toContain("El CV no está disponible.");
    expect(text).toContain("ACTIVIDAD");
  });

  it("creates a ZIP containing the text file and reports metadata-only CVs", async () => {
    const result = await buildApplicationArchive(application, search);
    const zip = await JSZip.loadAsync(result.blob);
    const textFile = await zip.file("informacion.txt")?.async("string");

    expect(Object.keys(zip.files)).toContain("informacion.txt");
    expect(textFile).toContain("Acme_CV.pdf");
    expect(textFile).toContain("solo tiene metadatos");
    expect(result.warnings).toHaveLength(1);
    expect(applicationArchiveFilename(application)).toBe("Acme_Frontend_Developer.zip");
  });

  it("includes data-URL images in the ZIP", async () => {
    const withImage = { ...application, cv: null, images: ["data:image/png;base64,aGVsbG8="] };
    const result = await buildApplicationArchive(withImage, search);
    const zip = await JSZip.loadAsync(result.blob);

    expect(await zip.file("imagenes/evidencia-01.png")?.async("string")).toBe("hello");
  });

  it("includes locally stored prototype CV files in the ZIP", async () => {
    const withCv = {
      ...application,
      cv: { ...application.cv!, dataUrl: "data:application/pdf;base64,JVBERg==" },
    };
    const result = await buildApplicationArchive(withCv, search);
    const zip = await JSZip.loadAsync(result.blob);

    expect(await zip.file("cv/Acme_CV.pdf")?.async("string")).toBe("%PDF");
    expect(result.warnings).toHaveLength(0);
  });

  it("prefixes uploaded CV filenames with a safe company name without double-prefixing", () => {
    const renamed = prefixCvFilename("Acme Tecnología", "C:\\fakepath\\resume final.pdf");

    expect(renamed).toBe("Acme_Tecnologia_resume final.pdf");
    expect(prefixCvFilename("Acme Tecnología", renamed)).toBe(renamed);
  });
});
