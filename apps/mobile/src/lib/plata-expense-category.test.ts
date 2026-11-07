import { describe, expect, it } from "vitest";

import { isExpenseCategory, toExpenseCategory } from "./plata-expense-category";

describe("isExpenseCategory", () => {
  it("accepts every known category", () => {
    expect(isExpenseCategory("GROCERIES")).toBe(true);
    expect(isExpenseCategory("OTHER")).toBe(true);
  });

  it("rejects an unknown or malformed value", () => {
    expect(isExpenseCategory("groceries")).toBe(false);
    expect(isExpenseCategory("NOT_A_CATEGORY")).toBe(false);
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
