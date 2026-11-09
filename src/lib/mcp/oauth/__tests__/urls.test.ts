import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getMcpResourceUrl, getOAuthIssuer, normalizeResource } from "../urls";

describe("getOAuthIssuer", () => {
  const originalEnv = process.env.NEXTAUTH_URL;

  afterEach(() => {
    process.env.NEXTAUTH_URL = originalEnv;
  });

  it("returns the origin of NEXTAUTH_URL", () => {
    process.env.NEXTAUTH_URL = "https://habita.casa/some/path";
    expect(getOAuthIssuer()).toBe("https://habita.casa");
  });

  it("falls back to localhost when NEXTAUTH_URL is unset", () => {
    delete process.env.NEXTAUTH_URL;
    expect(getOAuthIssuer()).toBe("http://localhost:3000");
  });

  it("falls back to localhost when NEXTAUTH_URL is malformed", () => {
    process.env.NEXTAUTH_URL = "not-a-url";
    expect(getOAuthIssuer()).toBe("http://localhost:3000");
  });
});

describe("getMcpResourceUrl", () => {
  const originalEnv = process.env.NEXTAUTH_URL;

  afterEach(() => {
    process.env.NEXTAUTH_URL = originalEnv;
  });

  it("appends /api/mcp to the issuer", () => {
    process.env.NEXTAUTH_URL = "https://habita.casa";
    expect(getMcpResourceUrl()).toBe("https://habita.casa/api/mcp");
  });
});

describe("normalizeResource", () => {
  const originalEnv = process.env.NEXTAUTH_URL;

  beforeEach(() => {
    process.env.NEXTAUTH_URL = "https://habita.casa";
  });

  afterEach(() => {
    process.env.NEXTAUTH_URL = originalEnv;
  });

  it("returns the MCP resource URL when value is null", () => {
    expect(normalizeResource(null)).toBe("https://habita.casa/api/mcp");
  });

  it("returns the MCP resource URL when value is undefined", () => {
    expect(normalizeResource(undefined)).toBe("https://habita.casa/api/mcp");
  });

  it("returns the MCP resource URL when value is an empty string", () => {
    expect(normalizeResource("")).toBe("https://habita.casa/api/mcp");
  });

  it("strips one trailing slash before comparing", () => {
    expect(normalizeResource("https://habita.casa/api/mcp/")).toBe("https://habita.casa/api/mcp");
  });

  it("returns null when the value doesn't match the MCP resource URL", () => {
    expect(normalizeResource("https://evil.example/api/mcp")).toBeNull();
  });
});
