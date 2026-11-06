/**
 * Pure helpers shared by the web and mobile Anotar sheets (handoff §5.3 Global):
 * the "consequence" line under the expense preview and the equal-split share.
 */

export type ExpenseConsequence =
  | { kind: "you-owe"; amount: number; toName: string }
  | { kind: "they-owe-you"; amount: number; debtorNames: string[] }
  | { kind: "none" };

export interface ExpenseConsequenceInput {
  amount: number;
  payerMemberId: string;
  participantMemberIds: string[];
  currentMemberId: string;
  nameByMemberId: ReadonlyMap<string, string>;
}

/** Equal share per participant, rounded to cents. Zero participants → 0. */
export function computeEqualShare(amount: number, participantCount: number): number {
  if (participantCount <= 0) return 0;
  return Math.round((amount / participantCount) * 100) / 100;
}

/** What saving this equal-split expense means for the current member. */
export function describeExpenseConsequence(input: ExpenseConsequenceInput): ExpenseConsequence {
  const { amount, payerMemberId, participantMemberIds, currentMemberId, nameByMemberId } = input;
  const share = computeEqualShare(amount, participantMemberIds.length);
  if (share <= 0) return { kind: "none" };

  if (payerMemberId === currentMemberId) {
    const debtorNames = participantMemberIds
      .filter((memberId) => memberId !== currentMemberId)
      .map((memberId) => nameByMemberId.get(memberId))
      .filter((name): name is string => Boolean(name));
    if (debtorNames.length === 0) return { kind: "none" };
    return { kind: "they-owe-you", amount: share, debtorNames };
  }

  const toName = nameByMemberId.get(payerMemberId);
  if (!toName || !participantMemberIds.includes(currentMemberId)) return { kind: "none" };
  return { kind: "you-owe", amount: share, toName };
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1] ?? ""}`;
}

/** Spanish copy for the consequence; `formatAmount` stays platform-specific. */
export function formatExpenseConsequence(
  consequence: ExpenseConsequence,
  formatAmount: (amount: number) => string,
): string | null {
  switch (consequence.kind) {
    case "you-owe":
      return `Le vas a deber ${formatAmount(consequence.amount)} a ${consequence.toName}`;
    case "they-owe-you": {
      const verb = consequence.debtorNames.length === 1 ? "te va" : "te van";
      return `${joinNames(consequence.debtorNames)} ${verb} a deber ${formatAmount(consequence.amount)}`;
    }
    case "none":
      return null;
  }
}
