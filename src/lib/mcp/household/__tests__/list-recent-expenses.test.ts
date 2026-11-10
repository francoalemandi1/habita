import { afterEach, describe, expect, it, vi } from "vitest";

const { findManyMock, resolveMcpMemberMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  resolveMcpMemberMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: { expense: { findMany: findManyMock } } }));
vi.mock("../resolve-member", () => ({
  resolveMcpMember: resolveMcpMemberMock,
  mcpMemberErrorToToolResult: (result: { kind: string }) => ({ isError: true, content: [{ type: "text", text: result.kind }] }),
}));

import { handleListRecentExpenses } from "../tools/list-recent-expenses";

const identity = { userId: "user-1", scopes: new Set(["habita"]) };
const member = { id: "member-1", householdId: "house-a" };

describe("handleListRecentExpenses", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("filters expenses by the member's householdId and defaults limit to 20", async () => {
    resolveMcpMemberMock.mockResolvedValue({ kind: "ok", member });
    findManyMock.mockResolvedValue([]);

    await handleListRecentExpenses(identity, {});

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { householdId: "house-a" }, take: 20 }),
    );
  });

  it("passes a custom limit through", async () => {
    resolveMcpMemberMock.mockResolvedValue({ kind: "ok", member });
    findManyMock.mockResolvedValue([]);

    await handleListRecentExpenses(identity, { limit: 5 });

    expect(findManyMock).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
  });

  it("returns an error result without querying when resolution fails", async () => {
    resolveMcpMemberMock.mockResolvedValue({ kind: "not_a_member" });

    const result = await handleListRecentExpenses(identity, { householdId: "house-b" });

    expect(result.isError).toBe(true);
    expect(findManyMock).not.toHaveBeenCalled();
  });
});
