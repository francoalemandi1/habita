export type RuntimeEvent =
  | { type: "network-error"; message: string }
  | { type: "auth-expired"; message: string };

type RuntimeListener = (event: RuntimeEvent) => void;

const listeners = new Set<RuntimeListener>();

export function emitRuntimeEvent(event: RuntimeEvent): void {
  listeners.forEach((listener) => {
    listener(event);
  });
}

export function subscribeRuntimeEvents(listener: RuntimeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
