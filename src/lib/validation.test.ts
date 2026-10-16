import { describe, expect, it } from "vitest";
import { isValidISODate, isValidOfferUrl, validateCvFile } from "./validation";

describe("application input validation", () => {
  it("allows empty offer URLs and accepts only absolute HTTP(S) URLs", () => {
    expect(isValidOfferUrl("")).toBe(true);
    expect(isValidOfferUrl("https://example.com/jobs/1")).toBe(true);
    expect(isValidOfferUrl("http://example.com")).toBe(true);
    expect(isValidOfferUrl("javascript:alert(1)")).toBe(false);
    expect(isValidOfferUrl("example.com/job")).toBe(false);
  });

  it("validates ISO calendar dates, including leap years", () => {
    expect(isValidISODate("2024-02-29")).toBe(true);
    expect(isValidISODate("2025-02-29")).toBe(false);
    expect(isValidISODate("2025-13-01")).toBe(false);
    expect(isValidISODate("2025-1-01")).toBe(false);
  });

  it("accepts supported non-empty CV files within 5 MB", () => {
    expect(validateCvFile({ name: "resume.PDF", size: 100, type: "application/pdf" })).toBeNull();
    expect(validateCvFile({
      name: "resume.docx",
      size: 5 * 1024 * 1024,
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    })).toBeNull();
    expect(validateCvFile({ name: "resume.exe", size: 100, type: "application/octet-stream" })).toContain("PDF, DOC o DOCX");
    expect(validateCvFile({ name: "resume.pdf", size: 0, type: "application/pdf" })).toContain("vacío");
    expect(validateCvFile({ name: "resume.pdf", size: 5 * 1024 * 1024 + 1, type: "application/pdf" })).toContain("5 MB");
    expect(validateCvFile({ name: "resume.pdf", size: 100, type: "text/plain" })).toContain("PDF, DOC o DOCX");
  });
});
