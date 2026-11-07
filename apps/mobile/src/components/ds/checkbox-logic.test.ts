import { describe, expect, it } from "vitest";
import { getToggledState, isCheckboxInteractive } from "./checkbox-logic";

describe("getToggledState", () => {
  it("completes a pending checkbox", () => {
    expect(getToggledState("pending", false)).toBe("done");
  });

  it("routes to toVerify when verification is required", () => {
    expect(getToggledState("pending", true)).toBe("toVerify");
  });

  it("reverses a done checkbox back to pending", () => {
    expect(getToggledState("done", false)).toBe("pending");
  });

  it("reverses a toVerify checkbox back to pending", () => {
    expect(getToggledState("toVerify", true)).toBe("pending");
  });

  it("never toggles a transferred checkbox", () => {
    expect(getToggledState("transferred", false)).toBe("transferred");
  });
});

describe("isCheckboxInteractive", () => {
  it("is false only for transferred", () => {
    expect(isCheckboxInteractive("transferred")).toBe(false);
    expect(isCheckboxInteractive("pending")).toBe(true);
    expect(isCheckboxInteractive("done")).toBe(true);
    expect(isCheckboxInteractive("toVerify")).toBe(true);
  });
});
