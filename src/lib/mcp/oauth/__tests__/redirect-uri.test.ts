import { describe, expect, it } from "vitest";

import { getRedirectHost, isAllowedRedirectUri, redirectUriMatches } from "../redirect-uri";

describe("isAllowedRedirectUri", () => {
  it("allows https with any host", () => {
    expect(isAllowedRedirectUri("https://claude.ai/api/mcp/callback")).toBe(true);
  });

  it("allows loopback http on localhost", () => {
    expect(isAllowedRedirectUri("http://localhost:51234/callback")).toBe(true);
  });

  it("allows loopback http on 127.0.0.1", () => {
    expect(isAllowedRedirectUri("http://127.0.0.1:51234/callback")).toBe(true);
  });

  it("rejects http on a non-loopback host", () => {
    expect(isAllowedRedirectUri("http://example.com/callback")).toBe(false);
  });

  it("rejects custom schemes", () => {
    expect(isAllowedRedirectUri("claude-code://callback")).toBe(false);
  });

  it("rejects javascript: scheme", () => {
    expect(isAllowedRedirectUri("javascript:alert(1)")).toBe(false);
  });

  it("rejects URIs with a fragment", () => {
    expect(isAllowedRedirectUri("https://claude.ai/callback#token=abc")).toBe(false);
  });

  it("rejects unparseable URIs", () => {
    expect(isAllowedRedirectUri("not a url")).toBe(false);
  });
});

describe("redirectUriMatches", () => {
  it("matches an exact registered URI", () => {
    expect(redirectUriMatches(["https://claude.ai/callback"], "https://claude.ai/callback")).toBe(true);
  });

  it("matches loopback URIs regardless of port", () => {
    const registered = ["http://localhost:1/callback"];
    expect(redirectUriMatches(registered, "http://localhost:54321/callback")).toBe(true);
  });

  it("treats localhost and 127.0.0.1 as distinct hosts", () => {
    const registered = ["http://localhost:1/callback"];
    expect(redirectUriMatches(registered, "http://127.0.0.1:54321/callback")).toBe(false);
  });

  it("rejects a path mismatch even on loopback", () => {
    const registered = ["http://localhost:1/callback"];
    expect(redirectUriMatches(registered, "http://localhost:54321/other")).toBe(false);
  });

  it("rejects a URI not present in the registered list", () => {
    expect(redirectUriMatches(["https://claude.ai/callback"], "https://evil.example/callback")).toBe(false);
  });
});

describe("getRedirectHost", () => {
  it("returns the host including port", () => {
    expect(getRedirectHost("http://localhost:54321/callback")).toBe("localhost:54321");
  });

  it("falls back to the raw value for unparseable URIs", () => {
    expect(getRedirectHost("not a url")).toBe("not a url");
  });
});
