import { describe, expect, it } from "vitest";
import { createLimiter } from "@/lib/concurrency";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("createLimiter", () => {
  it("never runs more than maxConcurrent tasks at once", async () => {
    const limiter = createLimiter(2);
    let active = 0;
    let maxActive = 0;
    const gates = Array.from({ length: 5 }, () => deferred<void>());

    const runs = gates.map((gate, i) =>
      limiter.run(async () => {
        active++;
        maxActive = Math.max(maxActive, active);
        await gate.promise;
        active--;
        return i;
      }),
    );

    await Promise.resolve();
    await Promise.resolve();
    expect(maxActive).toBe(2);

    gates[0]!.resolve();
    gates[1]!.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(maxActive).toBe(2);

    gates[2]!.resolve();
    gates[3]!.resolve();
    gates[4]!.resolve();
    const results = await Promise.all(runs);
    expect(results).toEqual([0, 1, 2, 3, 4]);
  });

  it("admits queued tasks in FIFO order", async () => {
    const limiter = createLimiter(1);
    const order: number[] = [];
    const gate = deferred<void>();

    const first = limiter.run(async () => {
      order.push(1);
      await gate.promise;
    });
    const second = limiter.run(async () => {
      order.push(2);
    });
    const third = limiter.run(async () => {
      order.push(3);
    });

    await Promise.resolve();
    expect(order).toEqual([1]);

    gate.resolve();
    await Promise.all([first, second, third]);
    expect(order).toEqual([1, 2, 3]);
  });

  it("releases the slot on rejection without affecting other callers", async () => {
    const limiter = createLimiter(1);
    const failing = limiter.run(() => Promise.reject(new Error("boom")));
    const succeeding = limiter.run(async () => "ok");

    await expect(failing).rejects.toThrow("boom");
    await expect(succeeding).resolves.toBe("ok");
  });

  it("serializes execution when limit is 1", async () => {
    const limiter = createLimiter(1);
    const log: string[] = [];

    await Promise.all([
      limiter.run(async () => {
        log.push("start-a");
        await Promise.resolve();
        log.push("end-a");
      }),
      limiter.run(async () => {
        log.push("start-b");
        await Promise.resolve();
        log.push("end-b");
      }),
    ]);

    expect(log).toEqual(["start-a", "end-a", "start-b", "end-b"]);
  });
});
