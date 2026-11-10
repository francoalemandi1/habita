import type { DebtTransaction, MemberBalance } from "@habita/contracts";

export type NetSign = "positive" | "negative" | "zero";

export interface NetStatus {
  sign: NetSign;
  /** Absolute amount, formatted without a sign — the caller prefixes +/−. */
  formattedAmount: string;
  /** Full label ready to render, e.g. "+$9.300" or "$0 · Están al día". */
  label: string;
}

/** §9.3 — amounts always tabular, es-AR grouping, no decimals. */
export function formatCurrencyArs(amount: number): string {
  const rounded = Math.round(Math.abs(amount));
  return `$${rounded.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

/** Your net balance in a currency: positive = Monte (owed to you), negative = Ladrillo. */
export function netStatus(amount: number): NetStatus {
  const formattedAmount = formatCurrencyArs(amount);
  if (amount === 0) {
    return { sign: "zero", formattedAmount, label: "$0 · Están al día" };
  }
  if (amount > 0) {
    return { sign: "positive", formattedAmount, label: `+${formattedAmount}` };
  }
  return { sign: "negative", formattedAmount, label: `−${formattedAmount}` };
}

/** Current member's balance within a single currency's balance list. */
export function findMemberNet(balances: MemberBalance[], memberId: string): number {
  return balances.find((balance) => balance.memberId === memberId)?.balance ?? 0;
}

/** True when nobody owes anybody in this currency. */
export function isSettledUp(balances: MemberBalance[]): boolean {
  return balances.every((balance) => balance.balance === 0);
}

/** "Le debés a Sofi" / "Sofi te debe" / "Tomi le debe a Sofi" pending-debt row label (§5.3 Liquidar). */
export function transactionRowLabel(transaction: DebtTransaction, currentMemberId: string): string {
  if (transaction.fromMemberId === currentMemberId) return `Le debés a ${transaction.toMemberName}`;
  if (transaction.toMemberId === currentMemberId) return `${transaction.fromMemberName} te debe`;
  return `${transaction.fromMemberName} le debe a ${transaction.toMemberName}`;
}

/** "Tomi te pagó" / "Le pagaste a Sofi" / "Tomi le pagó a Sofi" settlement history row label. */
export function settlementRowLabel(
  settlement: { fromMemberId: string; fromMemberName: string; toMemberId: string; toMemberName: string },
  currentMemberId: string,
): string {
  if (settlement.fromMemberId === currentMemberId) return `Le pagaste a ${settlement.toMemberName}`;
  if (settlement.toMemberId === currentMemberId) return `${settlement.fromMemberName} te pagó`;
  return `${settlement.fromMemberName} le pagó a ${settlement.toMemberName}`;
}
