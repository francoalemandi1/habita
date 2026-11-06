import { describe, expect, it } from "vitest";

import { isStaleParseResponse, shouldParse } from "./anotar-parse-logic";

describe("shouldParse", () => {
  it("rejects text shorter than the minimum char count", () => {
    expect(shouldParse("hi", null)).toBe(false);
  });

  it("accepts trimmed text at or above the minimum char count", () => {
    expect(shouldParse("  gas  ", null)).toBe(true);
  });

  it("rejects text identical to the last parsed text", () => {
    expect(shouldParse("Luz 5000", "Luz 5000")).toBe(false);
  });

  it("accepts text that differs from the last parsed text", () => {
    expect(shouldParse("Luz 5000 pago yo", "Luz 5000")).toBe(true);
  });
});

describe("isStaleParseResponse", () => {
  it("is stale when the requested text no longer matches the latest text", () => {
    expect(isStaleParseResponse("Luz 5000", "Luz 5000 pago yo")).toBe(true);
  });

  it("is not stale when the requested text still matches the latest text", () => {
    expect(isStaleParseResponse("Luz 5000", "Luz 5000")).toBe(false);
  });

  it("ignores surrounding whitespace differences", () => {
    expect(isStaleParseResponse("Luz 5000", "  Luz 5000  ")).toBe(false);
  });
});
