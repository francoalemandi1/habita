import { describe, expect, it } from "vitest";

import {
  APP_ROUTES,
  LEGACY_ROUTE_ALIASES,
  MOBILE_LEGACY_ROUTE_ALIASES,
  normalizeAppPath,
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
    expect(normalizeAppPath("/plan")).toBe("/plan");
    expect(normalizeAppPath("/compras/123")).toBe("/compras/123");
  });

  it("keeps web /tasks but maps it on mobile", () => {
    expect(normalizeAppPath("/tasks")).toBe("/tasks");
    expect(normalizeAppPath("/tasks", MOBILE_LEGACY_ROUTE_ALIASES)).toBe("/tareas");
  });

  it("maps the URLs older notifications were sent with", () => {
    expect(normalizeAppPath("/expenses")).toBe("/plata");
    expect(normalizeAppPath("/settings")).toBe("/perfil");
  });
});

describe("route tables", () => {
  it("only points aliases at canonical routes", () => {
    const canonical = new Set<string>(Object.values(APP_ROUTES));
    for (const target of Object.values(MOBILE_LEGACY_ROUTE_ALIASES)) {
      expect(canonical.has(target)).toBe(true);
    }
  });

  it("never aliases a canonical route to something else", () => {
    for (const route of Object.values(APP_ROUTES)) {
      expect(LEGACY_ROUTE_ALIASES[route]).toBeUndefined();
    }
  });
});
