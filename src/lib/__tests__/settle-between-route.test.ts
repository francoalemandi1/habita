import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireMemberMock,
  memberCountMock,
  settlementCreateMock,
  transactionMock,
  queryRawMock,
  memberFindManyMock,
  groupByMock,
} = vi.hoisted(() => ({
  requireMemberMock: vi.fn(),
  memberCountMock: vi.fn(),
  settlementCreateMock: vi.fn(),
  transactionMock: vi.fn(),
  queryRawMock: vi.fn(),
  memberFindManyMock: vi.fn(),
  groupByMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ requireMember: requireMemberMock }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    member: { count: memberCountMock, findMany: memberFindManyMock },
    settlement: { create: settlementCreateMock },
    expense: { groupBy: groupByMock },
    $queryRaw: queryRawMock,
    $transaction: transactionMock,
  },
}));

import { POST } from "@/app/api/expenses/settle-between/route";

function buildRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/expenses/settle-between", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/expenses/settle-between", () => {
  beforeEach(() => {
    requireMemberMock.mockResolvedValue({ id: "vos", householdId: "household-1", memberType: "ADULT" });
    memberCountMock.mockResolvedValue(2);
    memberFindManyMock.mockResolvedValue([
      { id: "tomi", name: "Tomi" },
      { id: "vos", name: "Vos" },
      { id: "sofi", name: "Sofi" },
    ]);
    groupByMock.mockResolvedValue([{ currency: "ARS", _count: { _all: 2 } }]);
    transactionMock.mockImplementation((ops: unknown[]) => Promise.all(ops));
    settlementCreateMock.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: "new", ...data }),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("records the simplified net amount between the pair, not the raw unsettled split total", async () => {
    // Tomi paid 300 split 3 ways (100 each); Vos paid 150 split with Sofi (75 each).
    // Net: Vos owes Tomi 25, not the raw 100 from Vos's single split.
    queryRawMock
      .mockResolvedValueOnce([
        { memberId: "vos", payerId: "tomi", currency: "ARS", totalAmount: "100" },
        { memberId: "sofi", payerId: "tomi", currency: "ARS", totalAmount: "100" },
        { memberId: "sofi", payerId: "vos", currency: "ARS", totalAmount: "75" },
      ])
      .mockResolvedValueOnce([]);

    const response = await POST(buildRequest({ fromMemberId: "vos", toMemberId: "tomi" }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ settledCount: 1, totalAmount: 25 });
    expect(settlementCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ fromMemberId: "vos", toMemberId: "tomi" }),
      }),
    );
  });

  it("returns settledCount 0 when there is no debt between the pair", async () => {
    queryRawMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const response = await POST(buildRequest({ fromMemberId: "vos", toMemberId: "tomi" }));
    const json = await response.json();

    expect(json).toEqual({ settledCount: 0, totalAmount: 0 });
    expect(settlementCreateMock).not.toHaveBeenCalled();
  });
});
