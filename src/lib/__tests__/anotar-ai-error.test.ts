import { describe, expect, it } from "vitest";
import { classifyParseError, shouldFallbackToClassic } from "@/lib/anotar-ai-error";

describe("classifyParseError", () => {
  it("classifies an aborted request as a timeout regardless of status", () => {
    expect(classifyParseError({ isAbort: true, status: 503 })).toBe("timeout");
  });

  it("classifies a 429 as rate-limited", () => {
    expect(classifyParseError({ status: 429 })).toBe("rate-limited");
  });

  it("classifies a 503 as ai-disabled", () => {
    expect(classifyParseError({ status: 503 })).toBe("ai-disabled");
  });

  it("falls back to network-error for anything else, including no status", () => {
    expect(classifyParseError({})).toBe("network-error");
    expect(classifyParseError({ status: 500 })).toBe("network-error");
  });
});

describe("shouldFallbackToClassic", () => {
  it("keeps the preview for rate-limited", () => {
    expect(shouldFallbackToClassic("rate-limited")).toBe(false);
  });

  it("falls back to the classic form for every other outcome", () => {
    expect(shouldFallbackToClassic("ai-disabled")).toBe(true);
    expect(shouldFallbackToClassic("network-error")).toBe(true);
    expect(shouldFallbackToClassic("timeout")).toBe(true);
  });
});
