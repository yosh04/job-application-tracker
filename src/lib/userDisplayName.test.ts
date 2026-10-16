import { describe, expect, it } from "vitest";
import { userDisplayName } from "./userDisplayName";

describe("userDisplayName", () => {
  it("formats the email name before the @ as a readable display name", () => {
    expect(userDisplayName("anton.escor4@gmail.com")).toBe("Anton Escor4");
    expect(userDisplayName("job-track_user+test@example.com")).toBe("Job Track User Test");
  });

  it("uses a fallback when there is no email name", () => {
    expect(userDisplayName(null)).toBe("Mi espacio");
    expect(userDisplayName("@example.com")).toBe("Mi espacio");
  });
});
