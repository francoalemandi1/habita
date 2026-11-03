import { describe, it, expect } from "vitest";
import { getSnackbarDuration, replaceSnackbar } from "@/components/ds/lib/snackbar-logic";

describe("getSnackbarDuration", () => {
  it("defaults to 5s", () => {
    expect(getSnackbarDuration()).toBe(5000);
  });

  it("uses 5s for default tone", () => {
    expect(getSnackbarDuration("default")).toBe(5000);
  });

  it("uses 8s for error tone (§6.13)", () => {
    expect(getSnackbarDuration("error")).toBe(8000);
  });
});

describe("replaceSnackbar", () => {
  it("replaces the current snackbar with the new one, uno a la vez (§6.13)", () => {
    const current = { id: "a", text: "primero" };
    const next = { id: "b", text: "segundo" };
    expect(replaceSnackbar(current, next)).toEqual(next);
  });

  it("returns the new snackbar even when there was none showing", () => {
    const next = { id: "b", text: "segundo" };
    expect(replaceSnackbar(null, next)).toEqual(next);
  });
});
