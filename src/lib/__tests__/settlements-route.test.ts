import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireMemberMock,
  memberCountMock,
  settlementFindManyMock,
  settlementCreateMock,
  transactionMock,
  queryRawMock,
  memberFindManyMock,
  groupByMock,
  createNotificationMock,
} = vi.hoisted(() => ({
  requireMemberMock: vi.fn(),
  memberCountMock: vi.fn(),
  settlementFindManyMock: vi.fn(),
  settlementCreateMock: vi.fn(),
  transactionMock: vi.fn(),
  queryRawMock: vi.fn(),
  memberFindManyMock: vi.fn(),
  groupByMock: vi.fn(),
  createNotificationMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ requireMember: requireMemberMock }));
vi.mock("@/lib/notification-service", () => ({ createNotification: createNotificationMock }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    member: { count: memberCountMock, findMany: memberFindManyMock },
    settlement: { findMany: settlementFindManyMock, create: settlementCreateMock },
    expense: { groupBy: groupByMock },
    $queryRaw: queryRawMock,
    $transaction: transactionMock,
  },
}));

import { POST } from "@/app/api/settlements/route";

function buildMember(overrides: Partial<{ id: string; householdId: string; memberType: string }> = {}) {
  return {
    id: "member-1",
    householdId: "household-1",
    memberType: "ADULT",
    name: "Tomi",
    ...overrides,
  };
}

function buildRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/settlements", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/settlements", () => {
  beforeEach(() => {
    memberFindManyMock.mockResolvedValue([]);
    groupByMock.mockResolvedValue([]);
    queryRawMock.mockResolvedValue([]);
    transactionMock.mockImplementation((ops: unknown[]) => Promise.all(ops));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects an invalid amount with 400", async () => {
    requireMemberMock.mockResolvedValue(buildMember());

    const response = await POST(
      buildRequest({
        transfers: [{ fromMemberId: "a", toMemberId: "b", amount: -5, currency: "ARS" }],
        idempotencyKey: "key-123456",
      }),
    );

    expect(response.status).toBe(400);
  });

  it("replays an existing idempotencyKey without inserting again", async () => {
    requireMemberMock.mockResolvedValue(buildMember());
    memberCountMock.mockResolvedValue(2);
    settlementFindManyMock.mockResolvedValue([
      {
        id: "s1",
        fromMemberId: "a",
        toMemberId: "b",
        amount: { toNumber: () => 50 },
        currency: "ARS",
        settledAt: new Date("2026-01-01"),
        createdById: "member-1",
        note: null,
        fromMember: { name: "A" },
        toMember: { name: "B" },
        createdBy: { name: "Tomi" },
      },
    ]);

    const response = await POST(
      buildRequest({
        transfers: [{ fromMemberId: "a", toMemberId: "b", amount: 50, currency: "ARS" }],
        idempotencyKey: "repeat-key",
      }),
    );

    expect(response.status).toBe(200);
    expect(settlementCreateMock).not.toHaveBeenCalled();
    expect(createNotificationMock).not.toHaveBeenCalled();
    const json = await response.json();
    expect(json.settlements).toHaveLength(1);
    expect(json.settlements[0].amount).toBe(50);
  });

  it("returns 403 when a non-ADULT records a transfer they are not a party to", async () => {
    requireMemberMock.mockResolvedValue(buildMember({ id: "member-1", memberType: "TEEN" }));

    const response = await POST(
      buildRequest({
        transfers: [{ fromMemberId: "a", toMemberId: "b", amount: 50, currency: "ARS" }],
        idempotencyKey: "teen-key-1",
      }),
    );

    expect(response.status).toBe(403);
    expect(memberCountMock).not.toHaveBeenCalled();
  });

  it("returns 400 when a member does not belong to the household", async () => {
    requireMemberMock.mockResolvedValue(buildMember());
    memberCountMock.mockResolvedValue(1);

    const response = await POST(
      buildRequest({
        transfers: [{ fromMemberId: "a", toMemberId: "outsider", amount: 50, currency: "ARS" }],
        idempotencyKey: "cross-key-1",
      }),
    );

    expect(response.status).toBe(400);
  });
});
