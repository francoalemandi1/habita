import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireMemberMock,
  expenseFindFirstMock,
  expenseDeleteMock,
  expenseCreateMock,
  memberFindFirstMock,
  householdFindUniqueMock,
  buildSplitsDataMock,
  deliverNotificationToMembersMock,
} = vi.hoisted(() => ({
  requireMemberMock: vi.fn(),
  expenseFindFirstMock: vi.fn(),
  expenseDeleteMock: vi.fn(),
  expenseCreateMock: vi.fn(),
  memberFindFirstMock: vi.fn(),
  householdFindUniqueMock: vi.fn(),
  buildSplitsDataMock: vi.fn(),
  deliverNotificationToMembersMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ requireMember: requireMemberMock }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    expense: { findFirst: expenseFindFirstMock, delete: expenseDeleteMock, create: expenseCreateMock },
    member: { findFirst: memberFindFirstMock },
    household: { findUnique: householdFindUniqueMock },
  },
}));

vi.mock("@/lib/expense-splits", () => ({ buildSplitsData: buildSplitsDataMock }));
vi.mock("@/lib/push-delivery", () => ({ deliverNotificationToMembers: deliverNotificationToMembersMock }));

// Avoids loading the real module, which imports "@habita/domain/expense-subcategory"
// — a specifier vitest's "@habita/domain" alias prefix-matches and fails to resolve.
vi.mock("@/lib/expense-subcategory", () => ({ inferExpenseSubcategory: vi.fn(() => "GENERAL") }));

import { Prisma } from "@prisma/client";
import { DELETE } from "@/app/api/expenses/[expenseId]/route";
import { POST } from "@/app/api/expenses/route";

function buildRequest() {
  return new NextRequest("http://localhost:3000/api/expenses/expense-1", { method: "DELETE" });
}

describe("DELETE /api/expenses/[expenseId]", () => {
  beforeEach(() => {
    expenseFindFirstMock.mockResolvedValue({ id: "expense-1", paidById: "tomi" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when a non-payer TEEN tries to delete the expense", async () => {
    requireMemberMock.mockResolvedValue({ id: "sofi", householdId: "household-1", memberType: "TEEN" });

    const response = await DELETE(buildRequest(), { params: Promise.resolve({ expenseId: "expense-1" }) });

    expect(response.status).toBe(403);
    expect(expenseDeleteMock).not.toHaveBeenCalled();
  });

  it("allows the payer to delete their own expense", async () => {
    requireMemberMock.mockResolvedValue({ id: "tomi", householdId: "household-1", memberType: "TEEN" });
    expenseDeleteMock.mockResolvedValue({ id: "expense-1" });

    const response = await DELETE(buildRequest(), { params: Promise.resolve({ expenseId: "expense-1" }) });

    expect(response.status).toBe(200);
    expect(expenseDeleteMock).toHaveBeenCalledWith({ where: { id: "expense-1" } });
  });

  it("allows an ADULT who is not the payer to delete the expense", async () => {
    requireMemberMock.mockResolvedValue({ id: "vos", householdId: "household-1", memberType: "ADULT" });
    expenseDeleteMock.mockResolvedValue({ id: "expense-1" });

    const response = await DELETE(buildRequest(), { params: Promise.resolve({ expenseId: "expense-1" }) });

    expect(response.status).toBe(200);
  });
});

function buildExpenseFixture(overrides: Partial<{ id: string; paidById: string }> = {}) {
  return {
    id: "expense-1",
    paidById: "tomi",
    amount: { toNumber: () => 100 },
    paidBy: { id: "tomi", name: "Tomi" },
    splits: [
      { id: "split-1", memberId: "tomi", amount: { toNumber: () => 50 }, member: { id: "tomi", name: "Tomi" } },
      { id: "split-2", memberId: "sofi", amount: { toNumber: () => 50 }, member: { id: "sofi", name: "Sofi" } },
    ],
    ...overrides,
  };
}

function buildPostRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/expenses", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function buildExpenseBody(overrides: Record<string, unknown> = {}) {
  return {
    title: "Super",
    amount: 100,
    paidById: "tomi",
    splitType: "EQUAL",
    ...overrides,
  };
}

describe("POST /api/expenses", () => {
  beforeEach(() => {
    requireMemberMock.mockResolvedValue({ id: "tomi", householdId: "household-1", memberType: "ADULT" });
    memberFindFirstMock.mockResolvedValue({ id: "tomi" });
    buildSplitsDataMock.mockResolvedValue({
      ok: true,
      data: [
        { memberId: "tomi", amount: { toFixed: () => "50.00" } },
        { memberId: "sofi", amount: { toFixed: () => "50.00" } },
      ],
    });
    householdFindUniqueMock.mockResolvedValue({ timezone: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new expense and notifies split members when there is no idempotencyKey replay", async () => {
    expenseFindFirstMock.mockResolvedValue(null);
    expenseCreateMock.mockResolvedValue(buildExpenseFixture());

    const response = await POST(buildPostRequest(buildExpenseBody({ idempotencyKey: "fresh-expense-key" })));
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.id).toBe("expense-1");
    expect(expenseCreateMock).toHaveBeenCalledTimes(1);
    expect(deliverNotificationToMembersMock).toHaveBeenCalledTimes(1);
  });

  it("returns 200 and the existing expense without creating or notifying again on replay", async () => {
    expenseFindFirstMock.mockResolvedValue(buildExpenseFixture());

    const response = await POST(buildPostRequest(buildExpenseBody({ idempotencyKey: "repeat-expense-key" })));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.id).toBe("expense-1");
    expect(expenseCreateMock).not.toHaveBeenCalled();
    expect(deliverNotificationToMembersMock).not.toHaveBeenCalled();
  });

  it("returns 200 with the race winner and does not notify twice on a P2002 race", async () => {
    expenseFindFirstMock.mockResolvedValueOnce(null).mockResolvedValueOnce(buildExpenseFixture());
    expenseCreateMock.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "test" }),
    );

    const response = await POST(buildPostRequest(buildExpenseBody({ idempotencyKey: "race-expense-key" })));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.id).toBe("expense-1");
    expect(deliverNotificationToMembersMock).not.toHaveBeenCalled();
  });
});
