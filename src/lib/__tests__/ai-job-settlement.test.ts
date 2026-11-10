import { describe, expect, it } from "vitest";

import { detectSettledJob } from "@habita/domain";

describe("detectSettledJob", () => {
  it("ignores the first observation, so an old job doesn't fire on mount", () => {
    expect(detectSettledJob(null, { status: "SUCCESS", jobId: "old" })).toBeNull();
  });

  it("fires when a running job completes", () => {
    expect(detectSettledJob({ status: "RUNNING", jobId: "a" }, { status: "SUCCESS", jobId: "a" })).toBe("completed");
  });

  it("fires when a running job fails", () => {
    expect(detectSettledJob({ status: "RUNNING", jobId: "a" }, { status: "FAILED", jobId: "a" })).toBe("failed");
  });

  it("fires for a new job that finished before it was ever seen running (cache hit)", () => {
    expect(detectSettledJob({ status: "SUCCESS", jobId: "a" }, { status: "SUCCESS", jobId: "b" })).toBe("completed");
  });

  it("does not fire again for the same settled job", () => {
    expect(detectSettledJob({ status: "SUCCESS", jobId: "a" }, { status: "SUCCESS", jobId: "a" })).toBeNull();
  });

  it("does not fire while still running", () => {
    expect(detectSettledJob({ status: null, jobId: null }, { status: "RUNNING", jobId: "a" })).toBeNull();
  });
});
