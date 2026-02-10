import { prisma } from "./prisma";

import type { MemberType } from "@prisma/client";

export interface EligibleMember {
  id: string;
  name: string;
  memberType: MemberType;
  avatarUrl: string | null;
}

const ESTIMATED_AGE: Record<MemberType, number> = {
  CHILD: 10,
  TEEN: 15,
  ADULT: 25,
};

/**
 * Get all members eligible for a roulette spin on a given task.
 *
 * Filters out:
 * - Inactive members
 * - Members absent today
 * - Members who don't meet the task's minAge requirement
 */
export async function getEligibleMembers(
  householdId: string,
  taskId: string,
): Promise<EligibleMember[]> {
  const task = await prisma.task.findFirst({
    where: { id: taskId, householdId, isActive: true },
    select: { minAge: true },
  });

  if (!task) {
    return [];
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);

  const members = await prisma.member.findMany({
    where: {
      householdId,
      isActive: true,
    },
    include: {
      absences: {
        where: {
          startDate: { lte: endOfToday },
          endDate: { gte: today },
        },
      },
    },
  });

  return members
    .filter((member) => {
      if (member.absences.length > 0) return false;

      if (task.minAge !== null && task.minAge !== undefined) {
        const estimatedAge = ESTIMATED_AGE[member.memberType];
        if (estimatedAge < task.minAge) return false;
      }

      return true;
    })
    .map((m) => ({
      id: m.id,
      name: m.name,
      memberType: m.memberType,
      avatarUrl: m.avatarUrl,
    }));
}

/**
 * Get all active, non-absent members for a household.
 * Used for custom tasks where there's no minAge filter.
 */
export async function getAllActiveMembers(
  householdId: string,
): Promise<EligibleMember[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);

  const members = await prisma.member.findMany({
    where: { householdId, isActive: true },
    include: {
      absences: {
        where: {
          startDate: { lte: endOfToday },
          endDate: { gte: today },
        },
      },
    },
  });

  return members
    .filter((member) => member.absences.length === 0)
    .map((m) => ({
      id: m.id,
      name: m.name,
      memberType: m.memberType,
      avatarUrl: m.avatarUrl,
    }));
}

/**
 * Select a random winner from eligible members.
 * All members have equal probability.
 */
export function selectRandomWinner(members: EligibleMember[]): EligibleMember {
  if (members.length === 0) {
    throw new Error("No eligible members for roulette");
  }
  const randomIndex = Math.floor(Math.random() * members.length);
  return members[randomIndex]!;
}
