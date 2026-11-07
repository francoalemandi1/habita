import { describe, expect, it } from "vitest";

import {
  isExpenseCategory,
  isRecurringFrequency,
  toExpenseCategory,
  toRecurringFrequency,
} from "@/lib/plata-service-enums";

describe("isExpenseCategory", () => {
  it("accepts every known category", () => {
    expect(isExpenseCategory("GROCERIES")).toBe(true);
    expect(isExpenseCategory("OTHER")).toBe(true);
  });

  it("rejects an unknown or malformed value", () => {
    expect(isExpenseCategory("groceries")).toBe(false);
    expect(isExpenseCategory("NOT_A_CATEGORY")).toBe(false);
    expect(isExpenseCategory("")).toBe(false);
  });
});

describe("toExpenseCategory", () => {
  it("returns the value when it's a known category", () => {
    expect(toExpenseCategory("RENT", "OTHER")).toBe("RENT");
  });

  it("falls back for null, undefined or an unknown value", () => {
    expect(toExpenseCategory(null, "OTHER")).toBe("OTHER");
    expect(toExpenseCategory(undefined, "OTHER")).toBe("OTHER");
    expect(toExpenseCategory("bogus", "OTHER")).toBe("OTHER");
  });
});

describe("isRecurringFrequency", () => {
  it("accepts every known frequency", () => {
    expect(isRecurringFrequency("WEEKLY")).toBe(true);
    expect(isRecurringFrequency("YEARLY")).toBe(true);
  });

  it("rejects an unknown or malformed value", () => {
    expect(isRecurringFrequency("DAILY")).toBe(false);
  });
});

describe("toRecurringFrequency", () => {
  it("returns the value when it's a known frequency", () => {
    expect(toRecurringFrequency("BIMONTHLY", "MONTHLY")).toBe("BIMONTHLY");
  });

  it("falls back for null, undefined or an unknown value", () => {
    expect(toRecurringFrequency(null, "MONTHLY")).toBe("MONTHLY");
    expect(toRecurringFrequency("bogus", "MONTHLY")).toBe("MONTHLY");
  });
});
