import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireMemberMock, expenseFindFirstMock, expenseDeleteMock } = vi.hoisted(() => ({
  requireMemberMock: vi.fn(),
  expenseFindFirstMock: vi.fn(),
  expenseDeleteMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ requireMember: requireMemberMock }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    expense: { findFirst: expenseFindFirstMock, delete: expenseDeleteMock },
  },
}));

// Avoids loading the real module, which imports "@habita/domain/expense-subcategory"
// — a specifier vitest's "@habita/domain" alias prefix-matches and fails to resolve.
vi.mock("@/lib/expense-subcategory", () => ({ inferExpenseSubcategory: vi.fn(() => "GENERAL") }));

import { DELETE } from "@/app/api/expenses/[expenseId]/route";

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
