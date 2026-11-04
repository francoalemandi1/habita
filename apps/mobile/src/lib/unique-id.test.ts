import { afterEach, describe, expect, it, vi } from "vitest";

import { createUniqueId } from "./unique-id";

describe("createUniqueId", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("falls back when the runtime has no Web Crypto (Hermes)", () => {
    vi.stubGlobal("crypto", undefined);
    const id = createUniqueId();
    expect(id).toMatch(/^[a-z0-9-]{20,}$/);
  });

  it("never repeats across calls in the fallback", () => {
    vi.stubGlobal("crypto", undefined);
    const ids = new Set(Array.from({ length: 1000 }, createUniqueId));
    expect(ids.size).toBe(1000);
  });

  it("produces keys the settlements contract accepts (8-100 chars, no colon)", () => {
    vi.stubGlobal("crypto", undefined);
    const id = createUniqueId();
    expect(id.length).toBeGreaterThanOrEqual(8);
    expect(id).not.toContain(":");
  });
});
