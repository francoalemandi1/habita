import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireMemberMock, savedCartFindFirstMock, savedCartUpdateMock, compareProductsMock } = vi.hoisted(() => ({
  requireMemberMock: vi.fn(),
  savedCartFindFirstMock: vi.fn(),
  savedCartUpdateMock: vi.fn(),
  compareProductsMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ requireMember: requireMemberMock }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    savedCart: { findFirst: savedCartFindFirstMock, update: savedCartUpdateMock },
  },
}));

vi.mock("@/lib/supermarket-search", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supermarket-search")>();
  return { ...actual, compareProducts: compareProductsMock };
});

import { POST } from "@/app/api/saved-items/deals/refresh/route";

const MEMBER = { id: "member-1", householdId: "household-1", household: { city: "cordoba" } };

const SAVED_CART = {
  id: "cart-1",
  memberId: "member-1",
  storeName: "Carrefour",
  searchTerms: ["leche"],
  products: [
    {
      searchTerm: "leche",
      quantity: 1,
      productName: "Leche entera 1L",
      price: 1000,
      lineTotal: 1000,
      listPrice: null,
      imageUrl: null,
      link: "https://example.com",
      isCheapest: true,
      unitInfo: null,
      alternatives: [],
      averagePrice: null,
    },
  ],
  totalPrice: 1000,
  cheapestCount: 1,
  missingTerms: [],
  totalSearched: 1,
};

function buildRequest() {
  return new NextRequest("http://localhost:3000/api/saved-items/deals/refresh", {
    method: "POST",
    body: JSON.stringify({ savedCartId: "cart-1" }),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/saved-items/deals/refresh", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 503 without touching the cart when the store is unavailable", async () => {
    requireMemberMock.mockResolvedValue(MEMBER);
    savedCartFindFirstMock.mockResolvedValue(SAVED_CART);
    compareProductsMock.mockResolvedValue({
      storeCarts: [],
      notFound: [],
      unavailableStores: ["Carrefour"],
      searchedAt: new Date().toISOString(),
    });

    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("Carrefour no responde ahora. Probá en un rato.");
    expect(savedCartUpdateMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the store answered but is absent from fresh results", async () => {
    requireMemberMock.mockResolvedValue(MEMBER);
    savedCartFindFirstMock.mockResolvedValue(SAVED_CART);
    compareProductsMock.mockResolvedValue({
      storeCarts: [],
      notFound: ["leche"],
      unavailableStores: [],
      searchedAt: new Date().toISOString(),
    });

    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Supermercado no encontrado en resultados frescos");
    expect(savedCartUpdateMock).not.toHaveBeenCalled();
  });

  it("returns 200 with priceChanges when the store is present with a new price", async () => {
    requireMemberMock.mockResolvedValue(MEMBER);
    savedCartFindFirstMock.mockResolvedValue(SAVED_CART);
    const freshStoreCart = {
      storeName: "Carrefour",
      products: [{ ...SAVED_CART.products[0], price: 1200, lineTotal: 1200 }],
      totalPrice: 1200,
      cheapestCount: 1,
      missingTerms: [],
      totalSearched: 1,
    };
    compareProductsMock.mockResolvedValue({
      storeCarts: [freshStoreCart],
      notFound: [],
      unavailableStores: [],
      searchedAt: new Date().toISOString(),
    });
    savedCartUpdateMock.mockResolvedValue({ ...SAVED_CART, totalPrice: 1200 });

    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(savedCartUpdateMock).toHaveBeenCalledWith({
      where: { id: "cart-1" },
      data: {
        products: freshStoreCart.products,
        totalPrice: 1200,
        cheapestCount: 1,
        missingTerms: [],
        totalSearched: 1,
        refreshedAt: expect.any(Date),
      },
    });
    expect(body.priceChanges).toEqual([
      { term: "leche", productName: "Leche entera 1L", previousPrice: 1000, currentPrice: 1200 },
    ]);
  });
});
