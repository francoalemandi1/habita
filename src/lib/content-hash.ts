/**
 * Compute a deterministic hash for recipe dedup.
 * Uses title + sorted ingredients to identify "same" recipe regardless of
 * minor description/step changes.
 *
 * Server-side: uses Node crypto (SHA-256).
 * Client-side: uses Web Crypto API.
 */

function normalizeRecipeKey(title: string, ingredients: string[]): string {
  return [
    title.toLowerCase().trim(),
    ...ingredients.map((i) => i.toLowerCase().trim()).sort(),
  ].join("|");
}

/** Server-only — synchronous SHA-256 via Node crypto. */
export function computeRecipeHash(
  title: string,
  ingredients: string[],
): string {
  // Dynamic import avoids bundling crypto in client chunks
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createHash } = require("crypto") as typeof import("crypto");
  const normalized = normalizeRecipeKey(title, ingredients);
  return createHash("sha256").update(normalized).digest("hex");
}

/** Client-safe — async SHA-256 via Web Crypto API. */
export async function computeRecipeHashAsync(
  title: string,
  ingredients: string[],
): Promise<string> {
  const normalized = normalizeRecipeKey(title, ingredients);
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
