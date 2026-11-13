import { describe, expect, it } from "vitest";

import { resolveRequestedQuantity } from "@habita/prices";

describe("resolveRequestedQuantity", () => {
  it("uses requestedQuantity when it's a positive number (new carts: packs-aware quantity)", () => {
    expect(resolveRequestedQuantity({ requestedQuantity: 12, quantity: 2 })).toBe(12);
  });

  it("falls back to quantity when requestedQuantity is absent (legacy carts stored list units there)", () => {
    expect(resolveRequestedQuantity({ quantity: 12 })).toBe(12);
  });

  it("falls back to 1 when neither field is a usable positive number", () => {
    expect(resolveRequestedQuantity({ requestedQuantity: "not-a-number", quantity: -3 })).toBe(1);
    expect(resolveRequestedQuantity({})).toBe(1);
  });
});
