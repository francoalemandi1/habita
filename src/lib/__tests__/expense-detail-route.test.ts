import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireMemberMock, findFirstMock, settlementFindFirstMock } = vi.hoisted(() => ({
  requireMemberMock: vi.fn(),
  findFirstMock: vi.fn(),
  settlementFindFirstMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ requireMember: requireMemberMock }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    expense: { findFirst: findFirstMock },
    settlement: { findFirst: settlementFindFirstMock },
  },
}));

import { GET } from "@/app/api/expenses/[expenseId]/detail/route";

function buildRequest(expenseId: string) {
  return new NextRequest(`http://localhost:3000/api/expenses/${expenseId}/detail`);
}

function buildContext(expenseId: string) {
  return { params: Promise.resolve({ expenseId }) };
}

describe("GET /api/expenses/[expenseId]/detail", () => {
  beforeEach(() => {
    requireMemberMock.mockResolvedValue({ id: "vos", householdId: "household-1", memberType: "ADULT" });
    settlementFindFirstMock.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 for an expense that belongs to another household", async () => {
    findFirstMock.mockResolvedValue(null);

    const response = await GET(buildRequest("expense-1"), buildContext("expense-1"));
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json).toEqual({ error: "Gasto no encontrado" });
    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "expense-1", householdId: "household-1" } }),
    );
  });

  it("returns 200 with the expense detail payload for the current household", async () => {
    findFirstMock.mockResolvedValue({
      id: "expense-1",
      title: "Coto",
      amount: { toNumber: () => 48320 },
      currency: "ARS",
      category: "GROCERIES",
      subcategory: "SUPERMARKET",
      splitType: "EQUAL",
      date: new Date("2026-11-03T00:00:00.000Z"),
      notes: null,
      createdAt: new Date("2026-11-03T00:00:00.000Z"),
      paidById: "jefa",
      paidBy: { id: "jefa", name: "La jefa" },
      splits: [
        {
          id: "split-1",
          memberId: "vos",
          amount: { toNumber: () => 24160 },
          settled: false,
          settledAt: null,
          member: { id: "vos", name: "Vos" },
        },
      ],
      invoice: null,
    });

    const response = await GET(buildRequest("expense-1"), buildContext("expense-1"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.canEdit).toBe(true);
    expect(json.hasLaterSettlement).toBe(false);
    expect(json.expense.id).toBe("expense-1");
    expect(json.expense.amount).toBe(48320);
  });
});
