/**
 * Pure functions for the mobile expense detail screen (handoff §5.3 "Detalle
 * de gasto"). Mirrors src/components/features/plata/expense-detail/expense-detail-logic.ts
 * (web). No side effects, no DB/network access.
 */

export interface SplitAmount {
  memberId: string;
  memberName: string;
  amount: number;
}

export interface DebtCallout {
  tone: "monte-soft" | "ladrillo-soft";
  text: string;
}

function formatArs(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-AR")}`;
}

function largestSplit(splits: readonly SplitAmount[]): SplitAmount | null {
  return splits.reduce<SplitAmount | null>(
    (top, split) => (top && top.amount >= split.amount ? top : split),
    null,
  );
}

/**
 * "Por este gasto le debés $16.107 a Sofi" (you're a non-payer) or
 * "Por este gasto Sofi te debe $16.107" (you paid). Null for a personal
 * expense (only your own share in the split).
 */
export function buildDebtCallout({
  currentMemberId,
  paidById,
  paidByName,
  splits,
}: {
  currentMemberId: string;
  paidById: string;
  paidByName: string;
  splits: readonly SplitAmount[];
}): DebtCallout | null {
  if (splits.length <= 1) return null;

  if (paidById === currentMemberId) {
    const owedToMe = largestSplit(splits.filter((split) => split.memberId !== currentMemberId));
    if (!owedToMe) return null;
    return { tone: "monte-soft", text: `Por este gasto ${owedToMe.memberName} te debe ${formatArs(owedToMe.amount)}` };
  }

  const mySplit = splits.find((split) => split.memberId === currentMemberId);
  if (!mySplit) return null;

  return { tone: "ladrillo-soft", text: `Por este gasto le debés ${formatArs(mySplit.amount)} a ${paidByName}` };
}
