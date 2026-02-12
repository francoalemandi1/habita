import type { Decimal } from "@prisma/client/runtime/library";

export interface MemberBalance {
  memberId: string;
  memberName: string;
  balance: number; // positive = owed to them, negative = they owe
}

export interface DebtTransaction {
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  amount: number;
}

interface ExpenseForBalance {
  amount: Decimal;
  paidById: string;
  paidBy: { id: string; name: string };
  splits: Array<{
    memberId: string;
    amount: Decimal;
    settled: boolean;
    member: { id: string; name: string };
  }>;
}

/**
 * Calculate net balances for each member.
 * Positive balance = others owe this member.
 * Negative balance = this member owes others.
 * Only considers unsettled splits.
 */
export function calculateBalances(expenses: ExpenseForBalance[]): MemberBalance[] {
  const balanceMap = new Map<string, { name: string; balance: number }>();

  for (const expense of expenses) {
    const paidAmount = expense.amount.toNumber();
    const payerId = expense.paidById;
    const payerName = expense.paidBy.name;

    // Ensure payer exists in map
    if (!balanceMap.has(payerId)) {
      balanceMap.set(payerId, { name: payerName, balance: 0 });
    }

    for (const split of expense.splits) {
      if (split.settled) continue;

      const splitAmount = split.amount.toNumber();
      const splitMemberId = split.memberId;

      // Ensure split member exists in map
      if (!balanceMap.has(splitMemberId)) {
        balanceMap.set(splitMemberId, { name: split.member.name, balance: 0 });
      }

      if (splitMemberId !== payerId) {
        // Payer is owed this amount
        balanceMap.get(payerId)!.balance += splitAmount;
        // Split member owes this amount
        balanceMap.get(splitMemberId)!.balance -= splitAmount;
      }
    }
  }

  return Array.from(balanceMap.entries()).map(([memberId, data]) => ({
    memberId,
    memberName: data.name,
    balance: Math.round(data.balance * 100) / 100,
  }));
}

/**
 * Simplify debts to minimize number of transactions.
 * Greedy algorithm: match largest creditor with largest debtor.
 */
export function simplifyDebts(balances: MemberBalance[]): DebtTransaction[] {
  const creditors: Array<{ memberId: string; memberName: string; amount: number }> = [];
  const debtors: Array<{ memberId: string; memberName: string; amount: number }> = [];

  for (const balance of balances) {
    if (balance.balance > 0.01) {
      creditors.push({ memberId: balance.memberId, memberName: balance.memberName, amount: balance.balance });
    } else if (balance.balance < -0.01) {
      debtors.push({ memberId: balance.memberId, memberName: balance.memberName, amount: -balance.balance });
    }
  }

  // Sort descending by amount
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transactions: DebtTransaction[] = [];
  let creditorIdx = 0;
  let debtorIdx = 0;

  while (creditorIdx < creditors.length && debtorIdx < debtors.length) {
    const creditor = creditors[creditorIdx]!;
    const debtor = debtors[debtorIdx]!;
    const transferAmount = Math.min(creditor.amount, debtor.amount);

    if (transferAmount > 0.01) {
      transactions.push({
        fromMemberId: debtor.memberId,
        fromMemberName: debtor.memberName,
        toMemberId: creditor.memberId,
        toMemberName: creditor.memberName,
        amount: Math.round(transferAmount * 100) / 100,
      });
    }

    creditor.amount -= transferAmount;
    debtor.amount -= transferAmount;

    if (creditor.amount < 0.01) creditorIdx++;
    if (debtor.amount < 0.01) debtorIdx++;
  }

  return transactions;
}
