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

type SplitShare = { memberId: string; amount: number };

const MAX_SUM_DIFFERENCE = 0.01;

/**
 * Split a total amount equally among members in integer cents, so the
 * shares always sum back to the total. The remainder cent is assigned to
 * the first members in ascending memberId order.
 */
export function splitEqually(totalAmount: number, memberIds: string[]): SplitShare[] {
  const sortedIds = [...memberIds].sort();
  const n = sortedIds.length;
  const totalCents = Math.round(totalAmount * 100);
  const baseCents = Math.floor(totalCents / n);
  const remainder = totalCents - baseCents * n;

  return sortedIds.map((memberId, index) => ({
    memberId,
    amount: (baseCents + (index < remainder ? 1 : 0)) / 100,
  }));
}

/**
 * Split a total amount by percentage in integer cents, so the shares
 * always sum back to the total. Percentages must already be validated to
 * sum to ~100 (within MAX_SUM_DIFFERENCE), but floors are normalized by
 * the actual sum so rounding error in that tolerance never leaks into the
 * split total. The leftover cent(s) from flooring go to the first members
 * in ascending memberId order.
 */
export function splitByPercentage(
  totalAmount: number,
  splits: Array<{ memberId: string; percentage: number }>,
): SplitShare[] {
  const sorted = [...splits].sort((a, b) => (a.memberId < b.memberId ? -1 : 1));
  const totalCents = Math.round(totalAmount * 100);
  const percentageSum = sorted.reduce((sum, s) => sum + s.percentage, 0);

  if (percentageSum === 0) {
    return sorted.map((s) => ({ memberId: s.memberId, amount: 0 }));
  }

  const floors = sorted.map((s) => Math.floor((totalCents * s.percentage) / percentageSum));
  const usedCents = floors.reduce((sum, c) => sum + c, 0);
  const remainder = totalCents - usedCents;

  return sorted.map((s, index) => ({
    memberId: s.memberId,
    amount: (floors[index]! + (index < remainder ? 1 : 0)) / 100,
  }));
}

/** Validate that custom split amounts sum to the expense total. */
export function validateCustomSplitSum(
  totalAmount: number,
  splits: Array<{ amount?: number }>,
): BuildSplitsError | null {
  const sum = splits.reduce((acc, s) => acc + (s.amount ?? 0), 0);
  if (Math.abs(sum - totalAmount) > MAX_SUM_DIFFERENCE) {
    return { ok: false, error: "La suma de los montos no coincide con el total del gasto" };
  }
  return null;
}

/** Validate that percentages sum to 100. */
export function validatePercentageSum(
  splits: Array<{ percentage?: number }>,
): BuildSplitsError | null {
  const sum = splits.reduce((acc, s) => acc + (s.percentage ?? 0), 0);
  // Epsilon absorbs float addition noise (e.g. 33.33 * 3 !== 99.99 exactly)
  // so values at the MAX_SUM_DIFFERENCE boundary aren't wrongly rejected.
  if (Math.abs(sum - 100) > MAX_SUM_DIFFERENCE + 1e-9) {
    return { ok: false, error: "Los porcentajes deben sumar 100%" };
  }
  return null;
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

    if (activeMembers.length === 0) {
      return { ok: false, error: "El hogar no tiene miembros activos" };
    }

    const shares = splitEqually(amount, activeMembers.map((m) => m.id));
    return {
      ok: true,
      data: shares.map((s) => ({
        memberId: s.memberId,
        amount: new Prisma.Decimal(s.amount.toFixed(2)),
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

    const sumError = validateCustomSplitSum(amount, splits);
    if (sumError) return sumError;

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

    const sumError = validatePercentageSum(splits);
    if (sumError) return sumError;

    const shares = splitByPercentage(
      amount,
      splits.map((s) => ({ memberId: s.memberId, percentage: s.percentage ?? 0 })),
    );

    return {
      ok: true,
      data: shares.map((s) => ({
        memberId: s.memberId,
        amount: new Prisma.Decimal(s.amount.toFixed(2)),
      })),
    };
  }

  return { ok: false, error: "Tipo de división inválido o faltan datos de splits" };
}
