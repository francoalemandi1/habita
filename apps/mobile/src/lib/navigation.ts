import { MOBILE_LEGACY_ROUTE_ALIASES, normalizeAppPath } from "@habita/contracts";

import type { Href } from "expo-router";

/**
 * Validates that an untrusted string (a push notification payload, an
 * unmatched deep link) is a safe in-app path: absolute and not protocol-relative.
 */
export function isInAppPath(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//");
}

/**
 * Turns an untrusted path into a canonical in-app `Href`, or `null` when it is
 * not a safe in-app path. Legacy routes are rewritten to their new place.
 */
export function toInAppHref(value: unknown): Href | null {
  if (!isInAppPath(value)) return null;
  // Typed routes can only check literals; this runtime string was validated above.
  return normalizeAppPath(value, MOBILE_LEGACY_ROUTE_ALIASES) as Href;
}
