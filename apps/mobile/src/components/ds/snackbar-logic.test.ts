import { describe, expect, it } from "vitest";
import { getSnackbarDuration, resolveSnackbarQueue } from "./snackbar-logic";
import type { SnackbarRequest } from "./snackbar-logic";

describe("getSnackbarDuration", () => {
  it("defaults to 5s", () => {
    expect(getSnackbarDuration()).toBe(5000);
    expect(getSnackbarDuration("default")).toBe(5000);
    expect(getSnackbarDuration("navigation")).toBe(5000);
  });

  it("uses 8s for errors", () => {
    expect(getSnackbarDuration("error")).toBe(8000);
  });
});

describe("resolveSnackbarQueue", () => {
  it("replaces whatever is currently showing with the incoming request", () => {
    const current: SnackbarRequest = { id: "a", text: "Hecha" };
    const incoming: SnackbarRequest = { id: "b", text: "Pasada a Sofi" };

    expect(resolveSnackbarQueue(current, incoming)).toBe(incoming);
    expect(resolveSnackbarQueue(null, incoming)).toBe(incoming);
  });
});
