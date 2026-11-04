/**
 * Client-side deferred delete store (handoff §7, "Eliminar gasto sin liquidar").
 * Module scope so a scheduled delete survives client-side navigation away
 * from the row that scheduled it. Mirrors src/lib/deferred-delete.ts (web).
 * Kept free of React Native imports so it stays plain-Node testable; the
 * AppState → "background" flush trigger is wired separately, see
 * `plata-deferred-delete-appstate.ts`.
 */

interface PendingDelete {
  run: () => void;
  timer: ReturnType<typeof setTimeout>;
}

const pending = new Map<string, PendingDelete>();
const listeners = new Set<() => void>();

// Bumped on every change so `useSyncExternalStore` gets a stable snapshot.
let version = 0;

/** Snapshot for `useSyncExternalStore`: changes only when the pending set changes. */
export function getDeferredDeleteVersion(): number {
  return version;
}

function notify(): void {
  version += 1;
  for (const listener of listeners) listener();
}

export interface ScheduleDeleteInput {
  id: string;
  run: () => void;
  delayMs: number;
}

/** Schedules `run` after `delayMs`. A second call for the same `id` while pending is a no-op. */
export function scheduleDelete({ id, run, delayMs }: ScheduleDeleteInput): void {
  if (pending.has(id)) return;

  const timer = setTimeout(() => {
    pending.delete(id);
    notify();
    run();
  }, delayMs);

  pending.set(id, { run, timer });
  notify();
}

/** Cancels a pending delete (Deshacer). No-op if nothing is pending for `id`. */
export function cancelDelete(id: string): void {
  const entry = pending.get(id);
  if (!entry) return;

  clearTimeout(entry.timer);
  pending.delete(id);
  notify();
}

export function isPendingDelete(id: string): boolean {
  return pending.has(id);
}

/** Subscribes to pending-set changes, for hiding rows in the UI. Returns an unsubscribe function. */
export function subscribeDeferredDeletes(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Fires every pending delete immediately, bypassing its delay. */
export function flushPendingDeletes(): void {
  for (const [id, entry] of pending) {
    clearTimeout(entry.timer);
    pending.delete(id);
    entry.run();
  }
  notify();
}
