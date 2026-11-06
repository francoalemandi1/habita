import { describe, expect, it } from "vitest";
import { isInAppPath, toInAppHref } from "./navigation";

describe("isInAppPath", () => {
  it("accepts absolute in-app paths", () => {
    expect(isInAppPath("/avisos")).toBe(true);
    expect(isInAppPath("/tareas/plan?x=1")).toBe(true);
  });

  it("rejects protocol-relative paths", () => {
    expect(isInAppPath("//evil.com")).toBe(false);
  });

  it("rejects non-string and non-absolute values", () => {
    expect(isInAppPath(undefined)).toBe(false);
    expect(isInAppPath(42)).toBe(false);
    expect(isInAppPath("avisos")).toBe(false);
    expect(isInAppPath("https://habita.casa/avisos")).toBe(false);
  });
});

describe("toInAppHref", () => {
  it("rewrites legacy routes to their canonical place", () => {
    expect(toInAppHref("/tasks?highlight=1")).toBe("/tareas?highlight=1");
  });

  it("keeps routes that did not move", () => {
    expect(toInAppHref("/super")).toBe("/super");
  });

  it("sends the old plan screen into Tareas", () => {
    expect(toInAppHref("/plan")).toBe("/tareas/plan");
  });

  it("rejects unsafe values", () => {
    expect(toInAppHref("//evil.com")).toBeNull();
    expect(toInAppHref(undefined)).toBeNull();
  });
});
