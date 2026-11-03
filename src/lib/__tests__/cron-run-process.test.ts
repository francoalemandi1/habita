import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runJob } from "../cron/run-process";

describe("runJob", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("returns every job's result when all jobs succeed", async () => {
    const failedJobs: string[] = [];

    const results = await Promise.all([
      runJob("a", async () => 1, failedJobs),
      runJob("b", async () => 2, failedJobs),
    ]);

    expect(results).toEqual([1, 2]);
    expect(failedJobs).toEqual([]);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("keeps the other jobs' results when one rejects, and names it in failedJobs", async () => {
    const failedJobs: string[] = [];

    const results = await Promise.all([
      runJob("a", async () => 1, failedJobs),
      runJob("b", () => Promise.reject(new Error("boom")), failedJobs),
      runJob("c", async () => 3, failedJobs),
    ]);

    expect(results).toEqual([1, undefined, 3]);
    expect(failedJobs).toEqual(["b"]);
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("b"), expect.any(Error));
  });
});
