import { cookies, headers } from "next/headers";
import { auth } from "./auth";
import { prisma } from "./prisma";
import { hasPermission } from "./permissions";
import { resolveMobileAccessTokenUserId } from "./mobile-auth";

import type { Member, Household } from "@prisma/client";

export const CURRENT_HOUSEHOLD_COOKIE = "habita_household_id";
export const CURRENT_HOUSEHOLD_HEADER = "x-habita-household-id";

export interface CurrentMember extends Member {
  household: Household;
}

async function getUserIdFromMobileBearer(): Promise<string | null> {
  const requestHeaders = await headers();
  const authorization = requestHeaders.get("authorization");
  if (!authorization) return null;
  if (!authorization.startsWith("Bearer ")) return null;

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) return null;

  return resolveMobileAccessTokenUserId(token);
}

async function getRequestedHouseholdId(): Promise<string | null> {
  const requestHeaders = await headers();
  const fromHeader = requestHeaders.get(CURRENT_HOUSEHOLD_HEADER)?.trim() || null;
  if (fromHeader) return fromHeader;

  const cookieStore = await cookies();
  return cookieStore.get(CURRENT_HOUSEHOLD_COOKIE)?.value ?? null;
}

/**
 * Get the current authenticated user's member record for the selected household.
 * Uses cookie habita_household_id when set; otherwise the first household (findFirst).
 * Returns null if user is not authenticated or not a member of any household.
 */
export async function getCurrentMember(): Promise<CurrentMember | null> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return null;
  }

  const householdId = await getRequestedHouseholdId();

  const where: { userId: string; isActive: boolean; householdId?: string } = {
    userId,
    isActive: true,
  };
  if (householdId) {
    where.householdId = householdId;
  }

  const member = await prisma.member.findFirst({
    where,
    include: {
      household: true,
    },
  });

  return member;
}

/**
 * All households the current user is a member of (for switcher).
 */
export async function getCurrentUserMembers(): Promise<CurrentMember[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const members = await prisma.member.findMany({
    where: { userId: session.user.id, isActive: true },
    include: { household: true },
    orderBy: { createdAt: "asc" },
  });
  return members;
}

/**
 * Get the current authenticated user's ID.
 * Use this only when you need the user ID without member context.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const mobileUserId = await getUserIdFromMobileBearer();
  if (mobileUserId) return mobileUserId;

  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * Require authentication - throws if not authenticated.
 * Use in API routes that require auth.
 */
export async function requireAuth(): Promise<string> {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  return userId;
}

/**
 * Require member context - throws if not a member of any household.
 * Use in API routes that require household membership.
 * Separates auth check (→ 401) from membership check (→ 403).
 */
export async function requireMember(): Promise<CurrentMember> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const householdId = await getRequestedHouseholdId();
  const where: { userId: string; isActive: boolean; householdId?: string } = {
    userId,
    isActive: true,
  };
  if (householdId) {
    where.householdId = householdId;
  }

  const member = await prisma.member.findFirst({
    where,
    include: { household: true },
  });

  if (!member) {
    throw new Error("Not a member of any household");
  }

  return member;
}

/**
 * Require member with a specific permission.
 * Throws "Forbidden" if the member's type doesn't have the required permission.
 */
export async function requirePermission(permission: string): Promise<CurrentMember> {
  const member = await requireMember();

  if (!hasPermission(member.memberType, permission)) {
    throw new Error("Forbidden");
  }

  return member;
}
