import { describe, expect, it } from "vitest";
import { buildRotationPattern } from "./tareas-rotation-pattern";

const MEMBERS = [
  { id: "m1", name: "Juli" },
  { id: "m2", name: "Sofi" },
  { id: "m3", name: "Tomi" },
];

describe("buildRotationPattern", () => {
  it("replaces the current member's name with 'Vos'", () => {
    expect(buildRotationPattern(MEMBERS, "m1", "DAILY")).toBe("Vos → Sofi → Tomi · todos los días");
  });

  it("keeps stable member-id order regardless of who is current", () => {
    expect(buildRotationPattern(MEMBERS, "m2", "WEEKLY")).toBe("Juli → Vos → Tomi · una vez por semana");
  });
});
