import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const {
  findFirstMock,
  findManyMock,
  createMock,
  updateMock,
  requestFindUniqueMock,
  requestCreateMock,
  transactionMock,
} = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
  findManyMock: vi.fn(),
  createMock: vi.fn(),
  updateMock: vi.fn(),
  requestFindUniqueMock: vi.fn(),
  requestCreateMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    shoppingListItem: {
      findFirst: findFirstMock,
      findMany: findManyMock,
      create: createMock,
      update: updateMock,
    },
    shoppingListItemRequest: {
      findUnique: requestFindUniqueMock,
      create: requestCreateMock,
    },
    $transaction: transactionMock,
  },
}));

import { addShoppingListItem, setShoppingListItemChecked } from "@/lib/shopping-list-service";

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

describe("addShoppingListItem", () => {
  beforeEach(async () => {
    const { prisma } = await import("@/lib/prisma");
    transactionMock.mockImplementation((callback: (tx: unknown) => unknown) => callback(prisma));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("replays an existing clientId without running a transaction", async () => {
    requestFindUniqueMock.mockResolvedValueOnce({ item: buildItem() });

    const item = await addShoppingListItem({
      householdId: "household-1",
      addedById: "member-1",
      name: "Leche",
      quantity: 1,
      clientId: "client-abc-123",
    });

    expect(item.id).toBe("item-1");
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("bumps the quantity of an unchecked item with the same normalized name", async () => {
    findManyMock.mockResolvedValueOnce([buildItem({ name: "leche" })]);
    updateMock.mockResolvedValueOnce(buildItem({ name: "leche", quantity: 2 }));

    const item = await addShoppingListItem({
      householdId: "household-1",
      addedById: "member-1",
      name: "Leche",
      quantity: 1,
      clientId: undefined,
    });

    expect(createMock).not.toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "item-1" }, data: { quantity: 2 } }),
    );
    expect(item.quantity).toBe(2);
  });

  it("inserts a new item when there is no duplicate", async () => {
    findManyMock.mockResolvedValueOnce([]);
    createMock.mockResolvedValueOnce(buildItem({ name: "Pan" }));

    const item = await addShoppingListItem({
      householdId: "household-1",
      addedById: "member-1",
      name: "Pan",
      quantity: 1,
      clientId: undefined,
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ householdId: "household-1", name: "Pan", addedById: "member-1" }),
      }),
    );
    expect(item.name).toBe("Pan");
  });

  it("returns the winner's item when a concurrent request with the same clientId committed first", async () => {
    requestFindUniqueMock.mockResolvedValueOnce(null).mockResolvedValueOnce({ item: buildItem({ quantity: 2 }) });
    transactionMock.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "test" }),
    );

    const item = await addShoppingListItem({
      householdId: "household-1",
      addedById: "member-1",
      name: "Leche",
      quantity: 1,
      clientId: "client-abc-123",
    });

    expect(item.quantity).toBe(2);
  });

  it("rejects adding a 201st unchecked item", async () => {
    findManyMock.mockResolvedValueOnce(
      Array.from({ length: 200 }, (_, i) => buildItem({ id: `item-${i}`, name: `Producto ${i}` })),
    );

    await expect(
      addShoppingListItem({
        householdId: "household-1",
        addedById: "member-1",
        name: "Producto nuevo",
        quantity: 1,
        clientId: undefined,
      }),
    ).rejects.toThrow("La lista ya tiene 200 productos");
    expect(createMock).not.toHaveBeenCalled();
  });
});

describe("setShoppingListItemChecked", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("filters the lookup by householdId and returns null when not found", async () => {
    findFirstMock.mockResolvedValueOnce(null);

    const result = await setShoppingListItemChecked({
      householdId: "household-1",
      itemId: "item-1",
      memberId: "member-1",
      checked: true,
    });

    expect(result).toBeNull();
    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "item-1", householdId: "household-1" } }),
    );
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("is a no-op when the item is already in the requested state", async () => {
    findFirstMock.mockResolvedValueOnce(buildItem({ checkedAt: new Date("2026-01-02") }));

    const result = await setShoppingListItemChecked({
      householdId: "household-1",
      itemId: "item-1",
      memberId: "member-1",
      checked: true,
    });

    expect(result?.checkedAt).toEqual(new Date("2026-01-02"));
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("sets checkedAt and connects checkedBy when checking an unchecked item", async () => {
    findFirstMock.mockResolvedValueOnce(buildItem());
    updateMock.mockResolvedValueOnce(
      buildItem({ checkedAt: new Date("2026-01-02"), checkedBy: { id: "member-1", name: "Tomi" } }),
    );

    const result = await setShoppingListItemChecked({
      householdId: "household-1",
      itemId: "item-1",
      memberId: "member-1",
      checked: true,
    });

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { checkedAt: expect.any(Date), checkedBy: { connect: { id: "member-1" } } },
      }),
    );
    expect(result?.checkedAt).not.toBeNull();
  });

  it("clears checkedAt and disconnects checkedBy when unchecking", async () => {
    findFirstMock.mockResolvedValueOnce(buildItem({ checkedAt: new Date("2026-01-02"), checkedBy: { id: "member-1", name: "Tomi" } }));
    updateMock.mockResolvedValueOnce(buildItem());

    await setShoppingListItemChecked({
      householdId: "household-1",
      itemId: "item-1",
      memberId: "member-1",
      checked: false,
    });

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { checkedAt: null, checkedBy: { disconnect: true } },
      }),
    );
  });
});
