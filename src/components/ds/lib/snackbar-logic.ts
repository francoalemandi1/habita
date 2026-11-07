export type SnackbarTone = "default" | "error";

export interface SnackbarRequest {
  id: string;
  text: string;
  tone?: SnackbarTone;
}

/** §6.13 — error snackbars stay longer so there is time to read + retry. */
export function getSnackbarDuration(tone: SnackbarTone = "default"): number {
  return tone === "error" ? 8000 : 5000;
}

/**
 * §6.13 "uno a la vez: el nuevo reemplaza al anterior" — the queue is always
 * a single slot, so enqueuing drops whatever was showing.
 */
export function replaceSnackbar(
  _current: SnackbarRequest | null,
  next: SnackbarRequest
): SnackbarRequest {
  return next;
}
