import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { buildJobLockKey } from "../ai-jobs";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    aiJobLog: {
      updateMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { tryStartJob } from "../ai-jobs";

describe("buildJobLockKey", () => {
  it("scopes by household only for household-wide job types", () => {
    expect(
      buildJobLockKey({ householdId: "house-1", jobType: "PREVIEW_PLAN", memberId: "member-1" }),
    ).toBe("house-1:PREVIEW_PLAN");
  });

  it("scopes by household and member for member-scoped job types", () => {
    expect(
      buildJobLockKey({ householdId: "house-1", jobType: "SHOPPING_PLAN", memberId: "member-1" }),
    ).toBe("house-1:SHOPPING_PLAN:member-1");
  });
});

describe("tryStartJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.aiJobLog.updateMany.mockResolvedValue({ count: 0 });
  });

  it("returns started:true with the new job id when the create succeeds", async () => {
    prismaMock.aiJobLog.create.mockResolvedValue({ id: "job-1" });

    const result = await tryStartJob({
      householdId: "house-1",
      memberId: "member-1",
      jobType: "SHOPPING_PLAN",
      inputData: { foo: "bar" },
    });

    expect(result).toEqual({ started: true, jobId: "job-1" });
    expect(prismaMock.aiJobLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        lockKey: "house-1:SHOPPING_PLAN:member-1",
        status: "RUNNING",
      }),
    });
  });

  it("returns started:false with the existing job when create hits a unique violation", async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "test",
    });
    prismaMock.aiJobLog.create.mockRejectedValue(p2002);
    const startedAt = new Date("2026-01-01T00:00:00.000Z");
    prismaMock.aiJobLog.findFirst.mockResolvedValue({ id: "job-existing", startedAt });

    const result = await tryStartJob({
      householdId: "house-1",
      memberId: "member-1",
      jobType: "PREVIEW_PLAN",
    });

    expect(result).toEqual({ started: false, existingJobId: "job-existing", startedAt });
  });

  it("rethrows errors that are not a unique constraint violation", async () => {
    const otherError = new Error("connection lost");
    prismaMock.aiJobLog.create.mockRejectedValue(otherError);

    await expect(
      tryStartJob({ householdId: "house-1", memberId: "member-1", jobType: "PREVIEW_PLAN" }),
    ).rejects.toThrow("connection lost");
  });
});
