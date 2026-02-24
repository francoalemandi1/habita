/**
 * Generates URL-safe slugs for cultural events.
 * Format: "titulo-del-evento-2026-02-23"
 * Handles collisions by appending -2, -3, etc.
 */

import { prisma } from "@/lib/prisma";

const MAX_SLUG_LENGTH = 100;

/**
 * Generate a unique slug for an event.
 * Strips accents, lowercases, replaces non-alnum with hyphens,
 * appends date suffix if available, and checks DB uniqueness.
 */
export async function generateEventSlug(
  title: string,
  startDate?: Date | string | null
): Promise<string> {
  const base = slugify(title);
  const dateSuffix = formatDateSuffix(startDate);
  const candidate = dateSuffix
    ? truncateSlug(`${base}-${dateSuffix}`)
    : truncateSlug(base);

  // Check uniqueness and append counter if needed
  const existing = await prisma.culturalEvent.findUnique({
    where: { slug: candidate },
    select: { id: true },
  });

  if (!existing) return candidate;

  // Collision: try -2, -3, etc.
  for (let counter = 2; counter <= 99; counter++) {
    const withCounter = truncateSlug(`${candidate}-${counter}`);
    const collision = await prisma.culturalEvent.findUnique({
      where: { slug: withCounter },
      select: { id: true },
    });
    if (!collision) return withCounter;
  }

  // Extremely unlikely: fall back to base + random suffix
  const random = Math.random().toString(36).slice(2, 8);
  return truncateSlug(`${candidate}-${random}`);
}

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alnum with hyphens
    .replace(/^-+|-+$/g, "") // Trim leading/trailing hyphens
    .replace(/-{2,}/g, "-"); // Collapse multiple hyphens
}

function formatDateSuffix(date?: Date | string | null): string | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return null;

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function truncateSlug(slug: string): string {
  if (slug.length <= MAX_SLUG_LENGTH) return slug;
  // Cut at last hyphen before limit to avoid truncating mid-word
  const truncated = slug.slice(0, MAX_SLUG_LENGTH);
  const lastHyphen = truncated.lastIndexOf("-");
  return lastHyphen > 20 ? truncated.slice(0, lastHyphen) : truncated;
}
