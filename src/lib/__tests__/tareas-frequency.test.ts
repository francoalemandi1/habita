import { describe, expect, it } from "vitest";
import { parseTaskFrequency, TASK_FREQUENCIES } from "../tareas-frequency";

describe("TASK_FREQUENCIES", () => {
  it("lists every TaskFrequency value", () => {
    expect(TASK_FREQUENCIES).toEqual(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "ONCE"]);
  });
});

describe("parseTaskFrequency", () => {
  it("accepts a lowercase value, case-insensitively", () => {
    expect(parseTaskFrequency("daily")).toBe("DAILY");
  });

  it("accepts an already-uppercase value", () => {
    expect(parseTaskFrequency("MONTHLY")).toBe("MONTHLY");
  });

  it("falls back to WEEKLY by default for an invalid value", () => {
    expect(parseTaskFrequency("yearly")).toBe("WEEKLY");
  });

  it("falls back to the given fallback when provided", () => {
    expect(parseTaskFrequency("yearly", "ONCE")).toBe("ONCE");
  });
});
