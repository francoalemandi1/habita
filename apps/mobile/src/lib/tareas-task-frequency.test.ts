import { describe, expect, it } from "vitest";
import { isTaskFrequency, toTaskFrequency } from "./tareas-task-frequency";

describe("isTaskFrequency", () => {
  it("accepts every known frequency", () => {
    expect(isTaskFrequency("DAILY")).toBe(true);
    expect(isTaskFrequency("WEEKLY")).toBe(true);
    expect(isTaskFrequency("BIWEEKLY")).toBe(true);
    expect(isTaskFrequency("MONTHLY")).toBe(true);
    expect(isTaskFrequency("ONCE")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isTaskFrequency("YEARLY")).toBe(false);
    expect(isTaskFrequency("")).toBe(false);
  });
});

describe("toTaskFrequency", () => {
  it("passes through a recognized value", () => {
    expect(toTaskFrequency("DAILY")).toBe("DAILY");
  });

  it("falls back to WEEKLY by default for an unrecognized value", () => {
    expect(toTaskFrequency("YEARLY")).toBe("WEEKLY");
  });

  it("falls back to the given fallback when provided", () => {
    expect(toTaskFrequency("YEARLY", "ONCE")).toBe("ONCE");
  });
});
