import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireMemberMock,
  applyRateLimitMock,
  isAIEnabledMock,
  generateStructuredMock,
  memberFindManyMock,
} = vi.hoisted(() => ({
  requireMemberMock: vi.fn(),
  applyRateLimitMock: vi.fn(),
  isAIEnabledMock: vi.fn(),
  generateStructuredMock: vi.fn(),
  memberFindManyMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ requireMember: requireMemberMock }));
vi.mock("@/lib/rate-limit", () => ({ applyRateLimit: applyRateLimitMock }));
vi.mock("@/lib/llm/provider", () => ({ isAIEnabled: isAIEnabledMock }));
vi.mock("@/lib/ai/generate", () => ({ generateStructured: generateStructuredMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: { member: { findMany: memberFindManyMock } },
}));

import { POST } from "@/app/api/ai/parse-entry/route";

function buildRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/ai/parse-entry", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/ai/parse-entry", () => {
  beforeEach(() => {
    requireMemberMock.mockResolvedValue({
      id: "member-1",
      householdId: "household-1",
      household: { timezone: "America/Argentina/Buenos_Aires" },
    });
    applyRateLimitMock.mockResolvedValue(null);
    isAIEnabledMock.mockReturnValue(true);
    memberFindManyMock.mockResolvedValue([
      { id: "member-1", name: "Sofi Gómez" },
      { id: "member-2", name: "Tomi Fernández" },
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 503 when AI is disabled", async () => {
    isAIEnabledMock.mockReturnValue(false);
    const response = await POST(buildRequest({ text: "Sofi pagó 5000 de luz" }));
    expect(response.status).toBe(503);
    expect(generateStructuredMock).not.toHaveBeenCalled();
  });

  it("uses the parse rate limiter", async () => {
    generateStructuredMock.mockResolvedValue({ kind: "unknown", expense: null, task: null, items: null });
    await POST(buildRequest({ text: "algo random" }));
    expect(applyRateLimitMock).toHaveBeenCalledWith(expect.anything(), "parse", "member-1");
  });

  it("maps an expense entry and resolves paidByName/splitWithNames to member ids", async () => {
    generateStructuredMock.mockResolvedValue({
      kind: "expense",
      expense: {
        title: "Luz",
        amount: 5000,
        currency: "ARS",
        category: "UTILITIES",
        paidByName: "Sofi",
        splitWithNames: ["Tomi"],
        date: null,
        notes: null,
      },
      task: null,
      items: null,
    });

    const response = await POST(buildRequest({ text: "Sofi pagó 5000 de luz, lo compartimos con Tomi" }));
    const json = await response.json();

    expect(json.kind).toBe("expense");
    expect(json.expense.paidByMemberId).toBe("member-1");
    expect(json.expense.splitWithMemberIds).toEqual(["member-2"]);
  });

  it("maps a task entry and resolves assigneeName to a member id", async () => {
    generateStructuredMock.mockResolvedValue({
      kind: "task",
      expense: null,
      task: {
        name: "Sacar la basura",
        frequency: "ONCE",
        dueDate: null,
        assigneeName: "Tomi",
        estimatedMinutes: null,
      },
      items: null,
    });

    const response = await POST(buildRequest({ text: "que lo haga Tomi" }));
    const json = await response.json();

    expect(json.kind).toBe("task");
    expect(json.task.assigneeMemberId).toBe("member-2");
  });

  it("falls back to OTHER/ONCE when the model returns an invalid enum value", async () => {
    generateStructuredMock.mockResolvedValue({
      kind: "expense",
      expense: {
        title: "Algo",
        amount: 100,
        currency: "ARS",
        category: "NOT_A_REAL_CATEGORY",
        paidByName: null,
        splitWithNames: [],
        date: null,
        notes: null,
      },
      task: null,
      items: null,
    });

    const response = await POST(buildRequest({ text: "gasté 100 en algo" }));
    const json = await response.json();

    expect(json.expense.category).toBe("OTHER");
  });

  it("returns kind unknown when the text doesn't match any entry type", async () => {
    generateStructuredMock.mockResolvedValue({ kind: "unknown", expense: null, task: null, items: null });

    const response = await POST(buildRequest({ text: "che como estas" }));
    const json = await response.json();

    expect(json).toEqual({ kind: "unknown" });
  });
});
