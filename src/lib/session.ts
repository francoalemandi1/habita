import { cookies } from "next/headers";
import { auth } from "./auth";
import { prisma } from "./prisma";
import { hasPermission } from "./permissions";

import type { Member, Household, MemberLevel } from "@prisma/client";

export const CURRENT_HOUSEHOLD_COOKIE = "habita_household_id";

export interface CurrentMember extends Member {
  household: Household;
  level: MemberLevel | null;
}

/**
 * Get the current authenticated user's member record for the selected household.
 * Uses cookie habita_household_id when set; otherwise the first household (findFirst).
 * Returns null if user is not authenticated or not a member of any household.
 */
export async function getCurrentMember(): Promise<CurrentMember | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const cookieStore = await cookies();
  const householdId = cookieStore.get(CURRENT_HOUSEHOLD_COOKIE)?.value;

  const where: { userId: string; isActive: boolean; householdId?: string } = {
    userId: session.user.id,
    isActive: true,
  };
  if (householdId) {
    where.householdId = householdId;
  }

  const member = await prisma.member.findFirst({
    where,
    include: {
      household: true,
      level: true,
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
    include: { household: true, level: true },
    orderBy: { createdAt: "asc" },
  });
  return members;
}

/**
 * Get the current authenticated user's ID.
 * Use this only when you need the user ID without member context.
 */
export async function getCurrentUserId(): Promise<string | null> {
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
 */
export async function requireMember(): Promise<CurrentMember> {
  const member = await getCurrentMember();

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
