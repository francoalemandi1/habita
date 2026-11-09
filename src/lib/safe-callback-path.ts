/**
 * True only for same-origin relative paths. Rejects protocol-relative URLs
 * (`//evil.example`, `/\evil.example`), which browsers resolve to another host.
 */
export function isSafeCallbackPath(path: string | null | undefined): path is string {
  if (!path || !path.startsWith("/")) return false;
  if (path.startsWith("//") || path.startsWith("/\\")) return false;
  try {
    return new URL(path, "https://same-origin.invalid").origin === "https://same-origin.invalid";
  } catch {
    return false;
  }
}
