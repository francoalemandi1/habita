import { describe, expect, it } from "vitest";

import { isValidCodeVerifier, verifyPkceS256 } from "../pkce";

describe("isValidCodeVerifier", () => {
  it("accepts a 43-char verifier of unreserved characters", () => {
    expect(isValidCodeVerifier("a".repeat(43))).toBe(true);
  });

  it("accepts a 128-char verifier", () => {
    expect(isValidCodeVerifier("a".repeat(128))).toBe(true);
  });

  it("rejects a verifier shorter than 43 chars", () => {
    expect(isValidCodeVerifier("a".repeat(42))).toBe(false);
  });

  it("rejects a verifier longer than 128 chars", () => {
    expect(isValidCodeVerifier("a".repeat(129))).toBe(false);
  });

  it("rejects characters outside the RFC 7636 unreserved set", () => {
    expect(isValidCodeVerifier(`${"a".repeat(42)}+`)).toBe(false);
  });
});

describe("verifyPkceS256", () => {
  it("matches the RFC 7636 appendix B vector", () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const challenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
    expect(verifyPkceS256(verifier, challenge)).toBe(true);
  });

  it("rejects a mismatched verifier/challenge pair", () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    expect(verifyPkceS256(verifier, "wrong-challenge-value-not-matching")).toBe(false);
  });

  it("rejects an invalid verifier before hashing", () => {
    expect(verifyPkceS256("too-short", "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM")).toBe(false);
  });
});
