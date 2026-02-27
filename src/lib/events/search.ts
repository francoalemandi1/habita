/**
 * Event search — PostgreSQL full-text search using tsvector + GIN index.
 * Uses $queryRaw for tsvector operations that Prisma doesn't natively support.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

import type { EventCategory, EventStatus } from "@prisma/client";
import type { EventSearchOptions, EventSearchResult, SearchEventRow } from "./types";

// ============================================
// Full-text search
// ============================================

/**
 * Search events using PostgreSQL full-text search + filters.
 * If no query is provided, returns events sorted by startDate.
 */
export async function searchEvents(options: EventSearchOptions): Promise<EventSearchResult> {
  const { query, cityId, category, dateFrom, dateTo, limit, offset } = options;

  const conditions: Prisma.Sql[] = [Prisma.sql`e."status" = 'ACTIVE'`];

  // Default: only future events (unless explicit dateFrom is provided)
  if (!dateFrom) {
    conditions.push(
      Prisma.sql`(e."startDate" >= NOW() OR e."startDate" IS NULL)`
    );
  }

  if (query) {
    conditions.push(
      Prisma.sql`e."searchVector" @@ plainto_tsquery('spanish', ${query})`
    );
  }
  if (cityId) {
    conditions.push(Prisma.sql`e."cityId" = ${cityId}`);
  }
  if (category) {
    conditions.push(Prisma.sql`e."category" = ${category}::"EventCategory"`);
  }
  if (dateFrom) {
    conditions.push(Prisma.sql`e."startDate" >= ${dateFrom}`);
  }
  if (dateTo) {
    conditions.push(Prisma.sql`e."startDate" <= ${dateTo}`);
  }

  const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;

  // Order by relevance if searching, otherwise by date
  const orderClause = query
    ? Prisma.sql`ORDER BY ts_rank(e."searchVector", plainto_tsquery('spanish', ${query})) DESC, e."startDate" ASC`
    : Prisma.sql`ORDER BY e."startDate" ASC NULLS LAST`;

  // Count total matching events
  const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*)::bigint as count
    FROM "cultural_events" e
    ${whereClause}
  `;
  const total = Number(countResult[0]?.count ?? 0);

  // Fetch events with city join
  const events = await prisma.$queryRaw<SearchEventRow[]>`
    SELECT
      e."id", e."title", e."description", e."slug",
      e."startDate", e."endDate",
      e."venueName", e."address", e."latitude", e."longitude",
      e."cityId", e."province",
      e."category", e."tags", e."artists",
      e."priceMin", e."priceMax", e."currency",
      e."sourceUrl", e."imageUrl", e."status",
      e."createdAt",
      c."name" as "cityName",
      c."province" as "cityProvince"
    FROM "cultural_events" e
    LEFT JOIN "cultural_cities" c ON e."cityId" = c."id"
    ${whereClause}
    ${orderClause}
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  return {
    events,
    total,
    pagination: {
      limit,
      offset,
      hasMore: offset + events.length < total,
    },
  };
}

// ============================================
// Weekend events
// ============================================

/**
 * Get events happening this weekend (Fri-Sun) in a given city.
 * If today is already weekend, returns current weekend events.
 * If today is Mon-Thu, returns next weekend events.
 */
export async function getWeekendEvents(
  cityId: string | null,
  limit: number = 20
): Promise<SearchEventRow[]> {
  const { from, to } = computeWeekendRange();

  const conditions: Prisma.Sql[] = [
    Prisma.sql`e."status" = 'ACTIVE'`,
    Prisma.sql`e."startDate" >= ${from}`,
    Prisma.sql`e."startDate" <= ${to}`,
  ];

  if (cityId) {
    conditions.push(Prisma.sql`e."cityId" = ${cityId}`);
  }

  const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;

  return prisma.$queryRaw<SearchEventRow[]>`
    SELECT
      e."id", e."title", e."description", e."slug",
      e."startDate", e."endDate",
      e."venueName", e."address", e."latitude", e."longitude",
      e."cityId", e."province",
      e."category", e."tags", e."artists",
      e."priceMin", e."priceMax", e."currency",
      e."sourceUrl", e."imageUrl", e."status",
      e."createdAt",
      c."name" as "cityName",
      c."province" as "cityProvince"
    FROM "cultural_events" e
    LEFT JOIN "cultural_cities" c ON e."cityId" = c."id"
    ${whereClause}
    ORDER BY e."startDate" ASC
    LIMIT ${limit}
  `;
}

// ============================================
// Helpers
// ============================================

function computeWeekendRange(): { from: Date; to: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ... 6=Sat

  // Compute days until Friday
  let daysUntilFriday: number;
  if (dayOfWeek >= 5) {
    // Already Fri(5), Sat(6): this weekend
    daysUntilFriday = dayOfWeek === 5 ? 0 : -1;
  } else if (dayOfWeek === 0) {
    // Sunday: still this weekend (started Fri)
    daysUntilFriday = -2;
  } else {
    // Mon(1)-Thu(4): next weekend
    daysUntilFriday = 5 - dayOfWeek;
  }

  const friday = new Date(now);
  friday.setDate(friday.getDate() + daysUntilFriday);
  friday.setHours(0, 0, 0, 0);

  const sunday = new Date(friday);
  sunday.setDate(sunday.getDate() + 2);
  sunday.setHours(23, 59, 59, 999);

  return { from: friday, to: sunday };
}
