/**
 * Minimal FIFO concurrency limiter for bounding parallel async work.
 *
 * Used to cap outbound HTTP fan-out (e.g. term x store price searches)
 * without introducing a queue library.
 */

export interface Limiter {
  /** Run `task` once a slot is free. Rejections propagate only to this call. */
  run<T>(task: () => Promise<T>): Promise<T>;
}

export function createLimiter(maxConcurrent: number): Limiter {
  let active = 0;
  const queue: Array<() => void> = [];

  function admitNext(): void {
    if (active >= maxConcurrent) return;
    const admit = queue.shift();
    if (!admit) return;
    active++;
    admit();
  }

  async function run<T>(task: () => Promise<T>): Promise<T> {
    await new Promise<void>((resolve) => {
      queue.push(resolve);
      admitNext();
    });

    try {
      return await task();
    } finally {
      active--;
      admitNext();
    }
  }

  return { run };
}
