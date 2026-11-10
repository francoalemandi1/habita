import { afterEach, describe, expect, it, vi } from "vitest";

const { findManyMock, resolveMcpMemberMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  resolveMcpMemberMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: { assignment: { findMany: findManyMock } } }));
vi.mock("../resolve-member", () => ({
  resolveMcpMember: resolveMcpMemberMock,
  mcpMemberErrorToToolResult: (result: { kind: string }) => ({ isError: true, content: [{ type: "text", text: result.kind }] }),
}));

import { handleListMyTasks } from "../tools/list-my-tasks";

const identity = { userId: "user-1", scopes: new Set(["habita"]) };
const member = { id: "member-1", householdId: "house-a" };

describe("handleListMyTasks", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("filters assignments by the member's householdId and memberId, excluding completed/cancelled", async () => {
    resolveMcpMemberMock.mockResolvedValue({ kind: "ok", member });
    findManyMock.mockResolvedValue([]);

    await handleListMyTasks(identity, {});

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          householdId: "house-a",
          memberId: "member-1",
          status: { notIn: ["COMPLETED", "CANCELLED"] },
        },
      }),
    );
  });

  it("returns an error result without querying when resolution fails", async () => {
    resolveMcpMemberMock.mockResolvedValue({ kind: "no_household" });

    const result = await handleListMyTasks(identity, {});

    expect(result.isError).toBe(true);
    expect(findManyMock).not.toHaveBeenCalled();
  });
});
