import { prisma } from "./prisma";

import type { NotificationType } from "@prisma/client";

// ── Constants ──────────────────────────────────────────────────────────────────

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const MAX_PUSH_PER_DAY = 6;
const QUIET_HOURS_START = 21; // 21:00
const QUIET_HOURS_END = 8; // 08:00
const COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours
const ONBOARDING_GRACE_MS = 24 * 60 * 60 * 1000; // 24 hours

const TRANSFER_TYPES: NotificationType[] = [
  "TRANSFER_REQUEST",
  "TRANSFER_ACCEPTED",
  "TRANSFER_REJECTED",
];

// ── Interfaces ─────────────────────────────────────────────────────────────────

export interface ExpoPushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: "default" | null;
  channelId?: string;
}

interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

// ── Type → Category mapping ────────────────────────────────────────────────────

const TYPE_TO_CATEGORY: Partial<Record<NotificationType, string>> = {
  TRANSFER_REQUEST: "transfers",
  TRANSFER_ACCEPTED: "transfers",
  TRANSFER_REJECTED: "transfers",
  SERVICE_DUE_SOON: "services",
  EXPENSE_SHARED: "expenses",
  EXPENSE_WEEKLY_SUMMARY: "summary",
  MEMBER_JOINED: "household",
  PLAN_READY: "plans",
  CULTURAL_RECOMMENDATION: "culture",
  DEAL_ALERT: "deals",
  TASK_REMINDER: "plans",
};

// ── Core send ──────────────────────────────────────────────────────────────────

async function sendExpoPush(
  tokens: string[],
  payload: ExpoPushPayload,
): Promise<ExpoPushTicket[]> {
  if (tokens.length === 0) return [];

  const messages = tokens.map((token) => ({
    to: token,
    title: payload.title,
    body: payload.body,
    data: payload.data,
    sound: payload.sound ?? "default",
    channelId: payload.channelId ?? "default",
  }));

  // Expo accepts batches of up to 100
  const tickets: ExpoPushTicket[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch),
      });
      const body = (await res.json()) as { data: ExpoPushTicket[] };
      tickets.push(...body.data);
    } catch (error) {
      console.error("Expo push send error:", error);
    }
  }

  return tickets;
}

// ── Gate checks ────────────────────────────────────────────────────────────────

function getLocalHour(timezone: string | null | undefined): number {
  try {
    const tz = timezone ?? "America/Argentina/Buenos_Aires";
    const parts = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: tz,
    }).formatToParts(new Date());
    const hourPart = parts.find((p) => p.type === "hour");
    return parseInt(hourPart?.value ?? "12", 10);
  } catch {
    return 12; // safe default (within window)
  }
}

function getStartOfLocalDay(timezone: string | null | undefined): Date {
  const tz = timezone ?? "America/Argentina/Buenos_Aires";
  const now = new Date();
  const localDateStr = now.toLocaleDateString("en-CA", { timeZone: tz }); // YYYY-MM-DD
  // Compute midnight in the target timezone by measuring the UTC offset
  const utcMidnight = new Date(`${localDateStr}T00:00:00Z`);
  const midnightInTz = new Date(utcMidnight.toLocaleString("en-US", { timeZone: tz }));
  const offsetMs = utcMidnight.getTime() - midnightInTz.getTime();
  return new Date(utcMidnight.getTime() + offsetMs);
}

async function canSendPush(
  memberId: string,
  type: NotificationType,
  householdTimezone: string | null | undefined,
): Promise<boolean> {
  // 1. Grace period: no push within 24h of member creation
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { createdAt: true },
  });
  if (!member) return false;

  const timeSinceCreation = Date.now() - member.createdAt.getTime();
  if (timeSinceCreation < ONBOARDING_GRACE_MS) return false;

  // 2. Check notification preference
  const category = TYPE_TO_CATEGORY[type];
  if (category) {
    const pref = await prisma.notificationPreference.findUnique({
      where: { memberId_category: { memberId, category } },
    });
    if (pref && !pref.enabled) return false;
  }

  // 3. Daily rate limit
  const startOfDay = getStartOfLocalDay(householdTimezone);
  const todayCount = await prisma.pushDeliveryLog.count({
    where: { memberId, sentAt: { gte: startOfDay } },
  });
  if (todayCount >= MAX_PUSH_PER_DAY) return false;

  // 4. Time window (8:00–21:00)
  const localHour = getLocalHour(householdTimezone);
  if (localHour < QUIET_HOURS_END || localHour >= QUIET_HOURS_START) return false;

  // 5. Cooldown: no same-type in < 4h (except transfers)
  if (!TRANSFER_TYPES.includes(type)) {
    const cooldownThreshold = new Date(Date.now() - COOLDOWN_MS);
    const recentSameType = await prisma.pushDeliveryLog.findFirst({
      where: { memberId, type, sentAt: { gte: cooldownThreshold } },
    });
    if (recentSameType) return false;
  }

  return true;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Send an Expo push notification to all devices of a member.
 * Respects rate limits, time windows, preferences, and cooldowns.
 * Fire-and-forget safe — never throws.
 */
export async function sendExpoPushToMember(
  memberId: string,
  type: NotificationType,
  payload: ExpoPushPayload,
  householdTimezone?: string | null,
): Promise<number> {
  try {
    const allowed = await canSendPush(memberId, type, householdTimezone);
    if (!allowed) return 0;

    const tokens = await prisma.expoPushToken.findMany({
      where: { memberId },
      select: { id: true, token: true },
    });

    if (tokens.length === 0) return 0;

    const tickets = await sendExpoPush(
      tokens.map((t) => t.token),
      payload,
    );

    // Log delivery + cleanup invalid tokens
    const toDelete: string[] = [];
    let sent = 0;

    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      const tokenRecord = tokens[i];
      if (!ticket || !tokenRecord) continue;

      if (ticket.status === "ok") {
        sent++;
        await prisma.pushDeliveryLog.create({
          data: {
            memberId,
            type,
            expoTicketId: ticket.id ?? null,
          },
        });
      } else if (ticket.details?.error === "DeviceNotRegistered") {
        toDelete.push(tokenRecord.id);
      }
    }

    if (toDelete.length > 0) {
      await prisma.expoPushToken.deleteMany({
        where: { id: { in: toDelete } },
      });
    }

    return sent;
  } catch (error) {
    console.error("sendExpoPushToMember error:", error);
    return 0;
  }
}

/**
 * Send an Expo push notification to all active members of a household.
 * Optionally exclude a member (e.g., the actor).
 */
export async function sendExpoPushToHousehold(
  householdId: string,
  type: NotificationType,
  payload: ExpoPushPayload,
  excludeMemberId?: string,
): Promise<number> {
  try {
    const household = await prisma.household.findUnique({
      where: { id: householdId },
      select: {
        timezone: true,
        members: {
          where: {
            isActive: true,
            ...(excludeMemberId ? { id: { not: excludeMemberId } } : {}),
          },
          select: { id: true },
        },
      },
    });

    if (!household || household.members.length === 0) return 0;

    const results = await Promise.allSettled(
      household.members.map((m) =>
        sendExpoPushToMember(m.id, type, payload, household.timezone),
      ),
    );

    return results.reduce(
      (total, r) => total + (r.status === "fulfilled" ? r.value : 0),
      0,
    );
  } catch (error) {
    console.error("sendExpoPushToHousehold error:", error);
    return 0;
  }
}
