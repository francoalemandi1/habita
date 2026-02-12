import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { isAIEnabled } from "@/lib/llm/provider";
import { generateBriefing, generateFallbackBriefing } from "@/lib/llm/briefing";
import { buildRegionalContext } from "@/lib/llm/regional-context";
import { getLocalDateString, getDayBoundariesWithYesterday } from "@/lib/date-boundaries";

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
    const { startOfYesterday, startOfToday, endOfToday } = getDayBoundariesWithYesterday(
      household?.timezone
    );

    // Fetch data in parallel
    const sevenDaysAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [yesterdayCompleted, todayPending, weeklyCompleted] = await Promise.all([
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
        take: 100,
      }),
      prisma.assignment.findMany({
        where: {
          householdId: member.householdId,
          status: { in: ["COMPLETED", "VERIFIED"] },
          completedAt: { gte: sevenDaysAgo },
        },
        select: {
          member: { select: { name: true } },
        },
        take: 200,
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

    // Weekly top contributors
    const weeklyByMember = new Map<string, number>();
    for (const a of weeklyCompleted) {
      weeklyByMember.set(a.member.name, (weeklyByMember.get(a.member.name) ?? 0) + 1);
    }
    const weeklyTopContributors = Array.from(weeklyByMember.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

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
      weeklyCompletedCount: weeklyCompleted.length,
      weeklyTopContributors,
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

