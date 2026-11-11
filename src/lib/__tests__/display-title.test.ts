import { describe, expect, it } from "vitest";

import { toDisplayTitle } from "@/lib/display-title";

describe("toDisplayTitle", () => {
  it("converts an all-caps title to sentence case", () => {
    expect(toDisplayTitle("ELENA ROGER EN CONCIERTO")).toBe("Elena roger en concierto");
  });

  it("leaves a mixed-case title untouched", () => {
    expect(toDisplayTitle("Elena Roger en concierto")).toBe("Elena Roger en concierto");
  });

  it("handles accented all-caps letters in both directions", () => {
    expect(toDisplayTitle("ÉXODO Y ÁGORA")).toBe("Éxodo y ágora");
  });

  it("restores proper nouns the description writes with a capital", () => {
    expect(toDisplayTitle("ELENA ROGER EN CONCIERTO", "Concierto de Elena Roger.")).toBe("Elena Roger en concierto");
  });

  it("does not capitalize words that only start a sentence in the description", () => {
    expect(toDisplayTitle("GRAN NOCHE DE TANGO", "Tango en vivo. Noche de baile.")).toBe("Gran noche de tango");
  });

  it("falls back to plain sentence case without a description", () => {
    expect(toDisplayTitle("ELENA ROGER EN CONCIERTO", null)).toBe("Elena roger en concierto");
  });

  it("leaves an already sentence-case accented title untouched", () => {
    expect(toDisplayTitle("Éxodo y Ágora")).toBe("Éxodo y Ágora");
  });
});
