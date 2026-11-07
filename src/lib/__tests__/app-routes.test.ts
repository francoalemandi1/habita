import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  APP_ROUTES,
  CASA_ROUTES,
  LEGACY_ROUTE_ALIASES,
  MOBILE_LEGACY_ROUTE_ALIASES,
  normalizeAppPath,
  PERFIL_ROUTES,
  PLATA_ROUTES,
  TAREAS_ROUTES,
} from "@habita/contracts";

describe("normalizeAppPath", () => {
  it("maps a legacy path to its canonical route", () => {
    expect(normalizeAppPath("/dashboard")).toBe("/casa");
  });

  it("keeps the query string and hash", () => {
    expect(normalizeAppPath("/my-tasks?highlight=abc#top")).toBe("/tareas?highlight=abc#top");
  });

  it("ignores a trailing slash", () => {
    expect(normalizeAppPath("/compras/")).toBe("/super");
  });

  it("leaves unknown paths and sub-paths unchanged", () => {
    expect(normalizeAppPath("/unknown")).toBe("/unknown");
    expect(normalizeAppPath("/compras/123")).toBe("/compras/123");
  });

  it("maps /tasks to Tareas on web and mobile", () => {
    expect(normalizeAppPath("/tasks")).toBe("/tareas");
    expect(normalizeAppPath("/tasks", MOBILE_LEGACY_ROUTE_ALIASES)).toBe("/tareas");
  });

  it("maps the old task screens into the Tareas place", () => {
    expect(normalizeAppPath("/plan")).toBe("/tareas/plan");
    expect(normalizeAppPath("/plans")).toBe("/tareas/plan/historial");
    expect(normalizeAppPath("/rotations")).toBe("/tareas/rotaciones");
    expect(normalizeAppPath("/roulette")).toBe("/tareas/rotaciones?sorteo=1");
    expect(normalizeAppPath("/progress?from=push")).toBe("/tareas?v=reparto&from=push");
    expect(normalizeAppPath("/suggest-tasks")).toBe("/tareas/sumar");
    expect(normalizeAppPath("/transfers")).toBe("/avisos");
  });

  it("maps the URLs older notifications were sent with", () => {
    expect(normalizeAppPath("/expenses")).toBe("/plata");
    expect(normalizeAppPath("/settings")).toBe("/perfil");
  });

  it("maps the old Services and Cómo venimos screens into the Plata place", () => {
    expect(normalizeAppPath("/services")).toBe(PLATA_ROUTES.servicios);
    expect(normalizeAppPath("/expense-insights")).toBe(PLATA_ROUTES.comoVenimos);
  });

  it("maps the old Descubrí screen to the Planes list in Casa", () => {
    expect(normalizeAppPath("/descubrir")).toBe(CASA_ROUTES.plans);
  });

  it("maps /fund to the Fondo view inside Plata", () => {
    expect(normalizeAppPath("/fund")).toBe("/plata?v=fondo");
  });

  it("maps the old create screens to the Anotar sheet (handoff §5.1)", () => {
    expect(normalizeAppPath("/new-expense")).toBe("/plata?anotar=expense");
    expect(normalizeAppPath("/new-task")).toBe("/tareas?anotar=task");
  });

  it("merges an alias target's own query with the path's query and hash", () => {
    expect(normalizeAppPath("/fund?highlight=abc#top")).toBe("/plata?v=fondo&highlight=abc#top");
    expect(normalizeAppPath("/fund#top")).toBe("/plata?v=fondo#top");
  });
});

describe("route tables", () => {
  it("only points aliases at canonical routes, ignoring any view query", () => {
    const canonical = new Set<string>([
      ...Object.values(APP_ROUTES),
      ...Object.values(TAREAS_ROUTES),
      ...Object.values(PERFIL_ROUTES),
      ...Object.values(PLATA_ROUTES),
      ...Object.values(CASA_ROUTES),
    ]);
    for (const target of Object.values(MOBILE_LEGACY_ROUTE_ALIASES)) {
      const base = target.split("?")[0] ?? target;
      expect(canonical.has(base)).toBe(true);
    }
  });

  it("never aliases a canonical route to something else", () => {
    for (const route of Object.values(APP_ROUTES)) {
      expect(LEGACY_ROUTE_ALIASES[route]).toBeUndefined();
    }
  });
});

describe("web pages", () => {
  const mainRoutesDir = path.join(process.cwd(), "src/app/(app)/(main)");

  it("has a page for every canonical web route", () => {
    for (const route of [
      ...Object.values(APP_ROUTES),
      ...Object.values(TAREAS_ROUTES),
      ...Object.values(PERFIL_ROUTES),
      ...Object.values(PLATA_ROUTES),
      ...Object.values(CASA_ROUTES),
    ]) {
      expect(existsSync(path.join(mainRoutesDir, route, "page.tsx")), route).toBe(true);
    }
  });
});
