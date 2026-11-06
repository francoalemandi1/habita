import { describe, expect, it } from "vitest";
import { mapCatalogToSumarCategories, mapSuggestionsToSumarCategories, sumarLabel } from "../tareas-sumar";

describe("mapCatalogToSumarCategories", () => {
  it("uppercases the catalog's lowercase default frequency", () => {
    const result = mapCatalogToSumarCategories([
      {
        category: "cocina",
        label: "Cocina",
        icon: "🍳",
        tasks: [{ name: "Lavar platos", icon: "🍽️", defaultFrequency: "daily", defaultWeight: 2, estimatedMinutes: 15 }],
      },
    ]);

    expect(result).toEqual([
      {
        name: "cocina",
        label: "Cocina",
        icon: "🍳",
        tasks: [{ name: "Lavar platos", icon: "🍽️", frequency: "DAILY", weight: 2, estimatedMinutes: 15 }],
      },
    ]);
  });
});

describe("sumarLabel", () => {
  it("shows the pending state regardless of count", () => {
    expect(sumarLabel(3, true)).toBe("Sumando…");
  });

  it("uses the singular form for one task", () => {
    expect(sumarLabel(1, false)).toBe("Sumar 1 tarea");
  });

  it("uses the plural form for more than one task", () => {
    expect(sumarLabel(3, false)).toBe("Sumar 3 tareas");
  });
});

describe("mapSuggestionsToSumarCategories", () => {
  it("reshapes AI suggestions into the shared Sumar item shape", () => {
    const result = mapSuggestionsToSumarCategories([
      {
        name: "bano",
        label: "Baño",
        icon: "🛁",
        tasks: [{ name: "Limpiar el baño", icon: "🧽", frequency: "WEEKLY", weight: 3, estimatedMinutes: 20 }],
      },
    ]);

    expect(result).toEqual([
      {
        name: "bano",
        label: "Baño",
        icon: "🛁",
        tasks: [{ name: "Limpiar el baño", icon: "🧽", frequency: "WEEKLY", weight: 3, estimatedMinutes: 20 }],
      },
    ]);
  });
});
