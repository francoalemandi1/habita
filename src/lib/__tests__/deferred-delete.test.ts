import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  cancelDelete,
  flushPendingDeletes,
  isPendingDelete,
  scheduleDelete,
} from "@/lib/deferred-delete";

describe("deferred-delete", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires run after the delay", () => {
    const run = vi.fn();
    scheduleDelete({ id: "exp-1", run, delayMs: 5000 });

    expect(isPendingDelete("exp-1")).toBe(true);
    expect(run).not.toHaveBeenCalled();

    vi.advanceTimersByTime(5000);

    expect(run).toHaveBeenCalledOnce();
    expect(isPendingDelete("exp-1")).toBe(false);
  });

  it("never fires when cancelled", () => {
    const run = vi.fn();
    scheduleDelete({ id: "exp-2", run, delayMs: 5000 });

    cancelDelete("exp-2");
    vi.advanceTimersByTime(10_000);

    expect(run).not.toHaveBeenCalled();
    expect(isPendingDelete("exp-2")).toBe(false);
  });

  it("flushes all pending deletes immediately", () => {
    const run = vi.fn();
    scheduleDelete({ id: "exp-3", run, delayMs: 5000 });

    flushPendingDeletes();

    expect(run).toHaveBeenCalledOnce();
    expect(isPendingDelete("exp-3")).toBe(false);
  });

  it("ignores a second schedule for the same id while pending", () => {
    const firstRun = vi.fn();
    const secondRun = vi.fn();

    scheduleDelete({ id: "exp-4", run: firstRun, delayMs: 5000 });
    scheduleDelete({ id: "exp-4", run: secondRun, delayMs: 5000 });

    vi.advanceTimersByTime(5000);

    expect(firstRun).toHaveBeenCalledOnce();
    expect(secondRun).not.toHaveBeenCalled();
  });
});
