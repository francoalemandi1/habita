import { describe, it, expect } from "vitest";
import { isConfirmNameMatch } from "@/components/ds/lib/dialog-logic";

describe("isConfirmNameMatch", () => {
  it("matches the exact household name (§6.16)", () => {
    expect(isConfirmNameMatch("Casa Alemandi", "Casa Alemandi")).toBe(true);
  });

  it("tolerates trailing/leading whitespace from the input", () => {
    expect(isConfirmNameMatch("  Casa Alemandi  ", "Casa Alemandi")).toBe(true);
  });

  it("rejects a mismatched name", () => {
    expect(isConfirmNameMatch("Casa Perez", "Casa Alemandi")).toBe(false);
  });

  it("rejects an empty input", () => {
    expect(isConfirmNameMatch("", "Casa Alemandi")).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(isConfirmNameMatch("casa alemandi", "Casa Alemandi")).toBe(false);
  });
});
