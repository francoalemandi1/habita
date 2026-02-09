import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isAIEnabled } from "@/lib/llm/provider";
import { generateBriefing, generateFallbackBriefing } from "@/lib/llm/briefing";
import { buildRegionalContext } from "@/lib/llm/regional-context";

import type { BriefingResponse } from "@/lib/llm/briefing";

// Daily cache: one briefing per member per day
interface CacheEntry {
  data: BriefingResponse;
  expiresAt: number;
}

const briefingCache = new Map<string, CacheEntry>();

function getCacheKey(memberId: string, dateStr: string): string {
  return `${memberId}:${dateStr}`;
}

function getFromCache(key: string): BriefingResponse | null {
  const entry = briefingCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    briefingCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: BriefingResponse, expiresAt: number): void {
  briefingCache.set(key, { data, expiresAt });
}

/**
 * GET /api/briefing
 * Daily briefing: 3 contextual lines shown once per day.
 * Works with and without AI enabled (deterministic fallback).
 */
export async function GET() {
  try {
    const member = await requireMember();

    // Build regional context for timezone-aware date calculations
    const household = await prisma.household.findUnique({
      where: { id: member.householdId },
      select: { latitude: true, longitude: true, timezone: true, country: true, city: true },
    });

    const regionalContext = await buildRegionalContext(household ?? {});

    // Compute today's date string in local timezone for cache key
    const localDateStr = getLocalDateString(new Date(), household?.timezone);
    const cacheKey = getCacheKey(member.id, localDateStr);

    const cached = getFromCache(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Compute timezone-aware yesterday boundaries
    const { startOfYesterday, startOfToday, endOfToday } = getDateBoundaries(
      household?.timezone
    );

    // Fetch data in parallel
    const [yesterdayCompleted, todayPending] = await Promise.all([
      prisma.assignment.findMany({
        where: {
          householdId: member.householdId,
          status: { in: ["COMPLETED", "VERIFIED"] },
          completedAt: { gte: startOfYesterday, lt: startOfToday },
        },
        select: {
          task: { select: { name: true } },
        },
        take: 5,
      }),
      prisma.assignment.findMany({
        where: {
          householdId: member.householdId,
          status: { in: ["PENDING", "IN_PROGRESS"] },
          dueDate: { lte: endOfToday },
          NOT: {
            transfers: {
              some: { status: { in: ["PENDING", "ACCEPTED"] } },
            },
          },
        },
        include: {
          task: { select: { name: true } },
          member: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: "asc" },
      }),
    ]);

    const now = new Date();
    const overdueAssignments = todayPending.filter(
      (a) => a.dueDate && new Date(a.dueDate) < now
    );

    // My pending tasks
    const myPending = todayPending.filter((a) => a.memberId === member.id);
    const myOverdue = overdueAssignments.filter((a) => a.memberId === member.id);

    // Pending count by member
    const pendingByMemberMap = new Map<string, { name: string; pending: number }>();
    for (const a of todayPending) {
      const existing = pendingByMemberMap.get(a.memberId);
      if (existing) {
        existing.pending++;
      } else {
        pendingByMemberMap.set(a.memberId, { name: a.member.name, pending: 1 });
      }
    }

    const briefingContext = {
      currentMember: member.name,
      timeOfDay: regionalContext.timeOfDay,
      yesterdayCompletedCount: yesterdayCompleted.length,
      yesterdayCompletedNames: yesterdayCompleted.map((a) => a.task.name),
      todayPendingCount: myPending.length,
      todayPendingNames: myPending.slice(0, 5).map((a) => a.task.name),
      overdueCount: myOverdue.length,
      overdueNames: myOverdue.slice(0, 3).map((a) => a.task.name),
      pendingByMember: Array.from(pendingByMemberMap.values()),
      regionalPromptBlock: regionalContext.promptBlock || undefined,
    };

    const briefing = isAIEnabled()
      ? await generateBriefing(briefingContext)
      : generateFallbackBriefing(briefingContext);

    // Cache until end of local day
    setCache(cacheKey, briefing, endOfToday.getTime());

    return NextResponse.json(briefing);
  } catch (error) {
    console.error("GET /api/briefing error:", error);

    if (error instanceof Error && error.message === "Not a member of any household") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Error getting briefing" },
      { status: 500 }
    );
  }
}

/**
 * Get start-of-yesterday, start-of-today, and end-of-today in UTC,
 * adjusted for the household's timezone.
 */
function getDateBoundaries(timezone?: string | null) {
  const now = new Date();

  // Get today's date in the household's timezone
  const localDateStr = getLocalDateString(now, timezone);
  const [yearStr, monthStr, dayStr] = localDateStr.split("-");
  const year = parseInt(yearStr!, 10);
  const month = parseInt(monthStr!, 10) - 1;
  const day = parseInt(dayStr!, 10);

  // If we have a timezone, compute the offset to convert local midnight to UTC
  if (timezone) {
    try {
      // Create a date at local midnight and find the UTC equivalent
      const localMidnight = new Date(Date.UTC(year, month, day));
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      // Find offset by comparing formatted UTC time with the target midnight
      const parts = formatter.formatToParts(localMidnight);
      const formattedHour = parseInt(
        parts.find((p) => p.type === "hour")?.value ?? "0",
        10
      );

      // The offset is the difference between UTC midnight and what that looks like in local time
      const offsetHours = formattedHour > 12 ? formattedHour - 24 : formattedHour;

      const startOfToday = new Date(Date.UTC(year, month, day, -offsetHours, 0, 0, 0));
      const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
      const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);

      return { startOfYesterday, startOfToday, endOfToday };
    } catch {
      // Fall through to server-time logic
    }
  }

  // Fallback: use server time
  const startOfToday = new Date(year, month, day, 0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  const endOfToday = new Date(year, month, day, 23, 59, 59, 999);

  return { startOfYesterday, startOfToday, endOfToday };
}

function getLocalDateString(now: Date, timezone?: string | null): string {
  try {
    if (timezone) {
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      return formatter.format(now); // "YYYY-MM-DD" format
    }
  } catch {
    // Fall through
  }

  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
