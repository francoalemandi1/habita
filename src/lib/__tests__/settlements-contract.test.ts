import { describe, expect, it } from "vitest";

import { createSettlementsSchema } from "@habita/contracts";

const transfer = { fromMemberId: "vos", toMemberId: "tomi", amount: 25, currency: "ARS" };

describe("createSettlementsSchema idempotencyKey", () => {
  it("rejects a key containing ':' so prefix replay cannot match another request", () => {
    const parsed = createSettlementsSchema.safeParse({ transfers: [transfer], idempotencyKey: "abc12345:x" });
    expect(parsed.success).toBe(false);
  });

  it("accepts a plain key", () => {
    const parsed = createSettlementsSchema.safeParse({ transfers: [transfer], idempotencyKey: "abc12345-x" });
    expect(parsed.success).toBe(true);
  });
});
