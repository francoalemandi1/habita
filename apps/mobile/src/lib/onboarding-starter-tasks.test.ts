import { describe, expect, it } from "vitest";

import { starterTasksFor } from "./onboarding-starter-tasks";

describe("starterTasksFor", () => {
  it("returns ~5 tasks for solo", () => {
    const tasks = starterTasksFor("solo");

    expect(tasks.length).toBe(5);
  });

  it("returns ~7 tasks for pareja", () => {
    const tasks = starterTasksFor("pareja");

    expect(tasks.length).toBe(7);
  });

  it("returns ~7 tasks for compartida, favouring shared areas over personal ones", () => {
    const tasks = starterTasksFor("compartida");

    expect(tasks.length).toBe(7);
    expect(tasks.some((t) => t.name === "Limpiar baños")).toBe(true);
    expect(tasks.some((t) => t.name === "Hacer cama")).toBe(false);
  });

  it("returns ~9 tasks for familia, including child-related tasks", () => {
    const tasks = starterTasksFor("familia");

    expect(tasks.length).toBe(9);
    expect(tasks.some((t) => t.name === "Preparar lonchera")).toBe(true);
  });

  it("resolves frequency, weight and estimatedMinutes from the onboarding catalog", () => {
    const tasks = starterTasksFor("solo");
    const lavarPlatos = tasks.find((t) => t.name === "Lavar platos");

    expect(lavarPlatos).toEqual({
      name: "Lavar platos",
      frequency: "DAILY",
      weight: 2,
      estimatedMinutes: 15,
    });
  });
});
