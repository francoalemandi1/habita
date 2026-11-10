import { describe, expect, it } from "vitest";

import { vtexToProductPrice } from "@/lib/grocery-deals-scraper";

import type { VtexProduct } from "@/lib/vtex-client";

function makeVtexProduct(overrides: Partial<VtexProduct> = {}): VtexProduct {
  return {
    productName: "Yerba Mate Taragüi 1kg",
    price: 3500,
    listPrice: 4000,
    link: "https://example.com/yerba",
    imageUrl: "https://example.com/yerba.jpg",
    ...overrides,
  };
}

describe("vtexToProductPrice", () => {
  it("keeps productName as the catalog term and carries displayName/imageUrl from the VTEX product", () => {
    const result = vtexToProductPrice("Yerba mate", "Carrefour", makeVtexProduct());

    expect(result.productName).toBe("Yerba mate");
    expect(result.displayName).toBe("Yerba Mate Taragüi 1kg");
    expect(result.imageUrl).toBe("https://example.com/yerba.jpg");
  });

  it("carries a null imageUrl when the VTEX product has none", () => {
    const result = vtexToProductPrice("Yerba mate", "Carrefour", makeVtexProduct({ imageUrl: null }));

    expect(result.imageUrl).toBeNull();
  });
});
