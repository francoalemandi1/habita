import { describe, expect, it } from "vitest";
import { buildRotationPatternText } from "../tareas-rotation";

describe("buildRotationPatternText", () => {
  it("orders members by id and labels the current member as Vos", () => {
    const members = [
      { id: "b-sofi", name: "Sofi" },
      { id: "a-vos", name: "Yo" },
      { id: "c-tomi", name: "Tomi" },
    ];

    expect(buildRotationPatternText(members, "a-vos", "DAILY")).toBe("Vos → Sofi → Tomi · todos los días");
  });

  it("falls back to the raw frequency value when there is no label", () => {
    expect(buildRotationPatternText([{ id: "a", name: "Ana" }], "a", "CUSTOM")).toBe("Vos · CUSTOM");
  });
});
