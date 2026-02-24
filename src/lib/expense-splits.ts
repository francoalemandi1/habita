import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

import type { SplitType } from "@prisma/client";

interface SplitInput {
  memberId: string;
  amount?: number;
  percentage?: number;
}

interface BuildSplitsParams {
  householdId: string;
  amount: number;
  splitType: SplitType;
  splits?: SplitInput[];
}

interface BuildSplitsResult {
  ok: true;
  data: Array<{ memberId: string; amount: Prisma.Decimal }>;
}

interface BuildSplitsError {
  ok: false;
  error: string;
}

/**
 * Build expense split data based on split type.
 * Validates that all members belong to the household.
 * Returns either the computed splits or an error message.
 */
export async function buildSplitsData(
  params: BuildSplitsParams,
): Promise<BuildSplitsResult | BuildSplitsError> {
  const { householdId, amount, splitType, splits } = params;

  if (splitType === "EQUAL") {
    const activeMembers = await prisma.member.findMany({
      where: { householdId, isActive: true },
      select: { id: true },
    });

    const shareAmount = amount / activeMembers.length;
    return {
      ok: true,
      data: activeMembers.map((m) => ({
        memberId: m.id,
        amount: new Prisma.Decimal(shareAmount.toFixed(2)),
      })),
    };
  }

  if (splitType === "CUSTOM" && splits) {
    const memberIds = splits.map((s) => s.memberId);
    const validMembers = await prisma.member.count({
      where: { id: { in: memberIds }, householdId, isActive: true },
    });

    if (validMembers !== memberIds.length) {
      return { ok: false, error: "Algunos miembros no pertenecen al hogar" };
    }

    return {
      ok: true,
      data: splits.map((s) => ({
        memberId: s.memberId,
        amount: new Prisma.Decimal((s.amount ?? 0).toFixed(2)),
      })),
    };
  }

  if (splitType === "PERCENTAGE" && splits) {
    const memberIds = splits.map((s) => s.memberId);
    const validMembers = await prisma.member.count({
      where: { id: { in: memberIds }, householdId, isActive: true },
    });

    if (validMembers !== memberIds.length) {
      return { ok: false, error: "Algunos miembros no pertenecen al hogar" };
    }

    return {
      ok: true,
      data: splits.map((s) => ({
        memberId: s.memberId,
        amount: new Prisma.Decimal(((amount * (s.percentage ?? 0)) / 100).toFixed(2)),
      })),
    };
  }

  return { ok: false, error: "Tipo de división inválido o faltan datos de splits" };
}
