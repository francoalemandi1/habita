import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

const {
  requireMemberMock,
  findFirstMock,
  findManyMock,
  createMock,
  updateMock,
  deleteMock,
  requestFindUniqueMock,
  requestCreateMock,
  transactionMock,
} = vi.hoisted(() => ({
  requireMemberMock: vi.fn(),
  findFirstMock: vi.fn(),
  findManyMock: vi.fn(),
  createMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
  requestFindUniqueMock: vi.fn(),
  requestCreateMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ requireMember: requireMemberMock }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    shoppingListItem: {
      findFirst: findFirstMock,
      findMany: findManyMock,
      create: createMock,
      update: updateMock,
      delete: deleteMock,
    },
    shoppingListItemRequest: {
      findUnique: requestFindUniqueMock,
      create: requestCreateMock,
    },
    $transaction: transactionMock,
  },
}));

import { POST } from "@/app/api/shopping-list/route";
import { PATCH, DELETE } from "@/app/api/shopping-list/[itemId]/route";

function buildMember(overrides: Partial<{ id: string; householdId: string }> = {}) {
  return { id: "member-1", householdId: "household-1", memberType: "ADULT", name: "Tomi", ...overrides };
}

function buildItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "item-1",
    name: "Leche",
    quantity: 1,
    checkedAt: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    addedBy: { id: "member-1", name: "Tomi" },
    checkedBy: null,
    ...overrides,
  };
}

function buildPostRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/shopping-list", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function buildPatchRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/shopping-list/item-1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function buildDeleteRequest() {
  return new NextRequest("http://localhost:3000/api/shopping-list/item-1", { method: "DELETE" });
}

describe("POST /api/shopping-list", () => {
  beforeEach(async () => {
    const { prisma } = await import("@/lib/prisma");
    transactionMock.mockImplementation((callback: (tx: unknown) => unknown) => callback(prisma));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects an invalid body with 400", async () => {
    requireMemberMock.mockResolvedValue(buildMember());

    const response = await POST(buildPostRequest({ name: "" }));

    expect(response.status).toBe(400);
  });

  it("replays an existing clientId without inserting again", async () => {
    requireMemberMock.mockResolvedValue(buildMember());
    requestFindUniqueMock.mockResolvedValueOnce({ item: buildItem() });

    const response = await POST(buildPostRequest({ name: "Leche", clientId: "client-abc-123" }));

    expect(response.status).toBe(200);
    expect(createMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    const json = await response.json();
    expect(json.item.id).toBe("item-1");
  });

  it("bumps the quantity of an unchecked item with the same normalized name", async () => {
    requireMemberMock.mockResolvedValue(buildMember());
    findManyMock.mockResolvedValueOnce([buildItem({ name: "leche" })]);
    updateMock.mockResolvedValueOnce(buildItem({ name: "leche", quantity: 2 }));

    const response = await POST(buildPostRequest({ name: "Leche" }));

    expect(response.status).toBe(200);
    expect(createMock).not.toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "item-1" }, data: { quantity: 2 } }),
    );
    const json = await response.json();
    expect(json.item.quantity).toBe(2);
  });

  it("records the clientId when a duplicate-name add bumps an existing item", async () => {
    requireMemberMock.mockResolvedValue(buildMember());
    requestFindUniqueMock.mockResolvedValueOnce(null);
    findManyMock.mockResolvedValueOnce([buildItem({ name: "leche" })]);
    updateMock.mockResolvedValueOnce(buildItem({ name: "leche", quantity: 2 }));

    await POST(buildPostRequest({ name: "Leche", clientId: "client-abc-123" }));

    expect(requestCreateMock).toHaveBeenCalledWith({
      data: { householdId: "household-1", clientId: "client-abc-123", itemId: "item-1" },
    });
  });

  it("returns the winner's item when a concurrent request with the same clientId committed first", async () => {
    requireMemberMock.mockResolvedValue(buildMember());
    requestFindUniqueMock.mockResolvedValueOnce(null).mockResolvedValueOnce({ item: buildItem({ quantity: 2 }) });
    transactionMock.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "test" }),
    );

    const response = await POST(buildPostRequest({ name: "Leche", clientId: "client-abc-123" }));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.item.quantity).toBe(2);
  });

  it("caps the quantity bump at 99", async () => {
    requireMemberMock.mockResolvedValue(buildMember());
    findManyMock.mockResolvedValueOnce([buildItem({ quantity: 95 })]);
    updateMock.mockResolvedValueOnce(buildItem({ quantity: 99 }));

    const response = await POST(buildPostRequest({ name: "Leche", quantity: 10 }));

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: { quantity: 99 } }),
    );
  });

  it("rejects adding a 201st unchecked item with 400", async () => {
    requireMemberMock.mockResolvedValue(buildMember());
    findManyMock.mockResolvedValueOnce(
      Array.from({ length: 200 }, (_, i) => buildItem({ id: `item-${i}`, name: `Producto ${i}` })),
    );

    const response = await POST(buildPostRequest({ name: "Producto nuevo" }));

    expect(response.status).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
    const json = await response.json();
    expect(json.error).toBe("La lista ya tiene 200 productos");
  });

  it("creates a new item when there is no duplicate and the household is under the cap", async () => {
    requireMemberMock.mockResolvedValue(buildMember());
    findManyMock.mockResolvedValueOnce([]);
    createMock.mockResolvedValueOnce(buildItem({ name: "Pan" }));

    const response = await POST(buildPostRequest({ name: "Pan" }));

    expect(response.status).toBe(200);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ householdId: "household-1", name: "Pan", addedById: "member-1" }),
      }),
    );
  });
});

describe("PATCH /api/shopping-list/[itemId]", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects an empty body with 400", async () => {
    requireMemberMock.mockResolvedValue(buildMember());

    const response = await PATCH(buildPatchRequest({}), { params: Promise.resolve({ itemId: "item-1" }) });

    expect(response.status).toBe(400);
  });

  it("returns 404 when the item belongs to another household", async () => {
    requireMemberMock.mockResolvedValue(buildMember());
    findFirstMock.mockResolvedValueOnce(null);

    const response = await PATCH(
      buildPatchRequest({ checked: true }),
      { params: Promise.resolve({ itemId: "item-1" }) },
    );

    expect(response.status).toBe(404);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("sets checkedAt and checkedById when checked is true", async () => {
    requireMemberMock.mockResolvedValue(buildMember());
    findFirstMock.mockResolvedValueOnce({ id: "item-1" });
    updateMock.mockResolvedValueOnce(
      buildItem({ checkedAt: new Date("2026-01-02"), checkedBy: { id: "member-1", name: "Tomi" } }),
    );

    const response = await PATCH(
      buildPatchRequest({ checked: true }),
      { params: Promise.resolve({ itemId: "item-1" }) },
    );

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { checkedAt: expect.any(Date), checkedBy: { connect: { id: "member-1" } } },
      }),
    );
    const json = await response.json();
    expect(json.item.checkedAt).not.toBeNull();
    expect(json.item.checkedBy).toEqual({ id: "member-1", name: "Tomi" });
  });

  it("clears checkedAt and checkedBy when checked is false", async () => {
    requireMemberMock.mockResolvedValue(buildMember());
    findFirstMock.mockResolvedValueOnce({ id: "item-1" });
    updateMock.mockResolvedValueOnce(buildItem());

    const response = await PATCH(
      buildPatchRequest({ checked: false }),
      { params: Promise.resolve({ itemId: "item-1" }) },
    );

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { checkedAt: null, checkedBy: { disconnect: true } },
      }),
    );
  });
});

describe("DELETE /api/shopping-list/[itemId]", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when the item belongs to another household", async () => {
    requireMemberMock.mockResolvedValue(buildMember());
    findFirstMock.mockResolvedValueOnce(null);

    const response = await DELETE(buildDeleteRequest(), { params: Promise.resolve({ itemId: "item-1" }) });

    expect(response.status).toBe(404);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("deletes the item and returns 204", async () => {
    requireMemberMock.mockResolvedValue(buildMember());
    findFirstMock.mockResolvedValueOnce({ id: "item-1" });
    deleteMock.mockResolvedValueOnce(buildItem());

    const response = await DELETE(buildDeleteRequest(), { params: Promise.resolve({ itemId: "item-1" }) });

    expect(response.status).toBe(204);
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "item-1" } });
  });
});
