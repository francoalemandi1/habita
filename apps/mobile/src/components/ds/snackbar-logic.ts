export type SnackbarTone = "default" | "navigation" | "error";

export interface SnackbarRequest {
  id: string;
  text: string;
  tone?: SnackbarTone;
  actionLabel?: string;
  onAction?: () => void;
}

const DEFAULT_DURATION_MS = 5000;
const ERROR_DURATION_MS = 8000;

/** §6.13 durations: 5s default, 8s for errors. */
export function getSnackbarDuration(tone: SnackbarTone = "default"): number {
  return tone === "error" ? ERROR_DURATION_MS : DEFAULT_DURATION_MS;
}

/** §6.13 "one at a time": the newest request always replaces whatever is showing. */
export function resolveSnackbarQueue(_current: SnackbarRequest | null, incoming: SnackbarRequest): SnackbarRequest {
  return incoming;
}
