import type { DebtTransaction, MemberBalance } from "@habita/contracts";

export type NetSign = "positive" | "negative" | "zero";

export interface NetStatus {
  sign: NetSign;
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
  const formatted = formatCurrencyArs(amount);
  if (amount === 0) return { sign: "zero", label: "$0 · Están al día" };
  if (amount > 0) return { sign: "positive", label: `+${formatted}` };
  return { sign: "negative", label: `−${formatted}` };
}

/** Current member's balance within a single currency's balance list. */
export function findMemberNet(balances: MemberBalance[], memberId: string): number {
  return balances.find((balance) => balance.memberId === memberId)?.balance ?? 0;
}

/** True when nobody owes anybody in this currency. */
export function isSettledUp(balances: MemberBalance[]): boolean {
  return balances.every((balance) => balance.balance === 0);
}

/** "Vos → Sofi" / "Sofi → Vos" row label for a transaction row. */
export function transactionRowLabel(transaction: DebtTransaction, currentMemberId: string): string {
  const from = transaction.fromMemberId === currentMemberId ? "Vos" : transaction.fromMemberName;
  const to = transaction.toMemberId === currentMemberId ? "Vos" : transaction.toMemberName;
  return `${from} → ${to}`;
}

const MIGRATED_NOTE = "Migrado desde liquidaciones anteriores";

/** Marks settlement rows imported from the pre-rebrand balance, shown subdued. */
export function isMigratedSettlement(note: string | null): boolean {
  return note === MIGRATED_NOTE;
}

/** "Tomi le pagó a Vos" / "Vos le pagaste a Sofi" settlement history row label. */
export function settlementRowLabel(
  settlement: { fromMemberId: string; fromMemberName: string; toMemberId: string; toMemberName: string },
  currentMemberId: string,
): string {
  const isFromMe = settlement.fromMemberId === currentMemberId;
  const to = settlement.toMemberId === currentMemberId ? "Vos" : settlement.toMemberName;
  const from = isFromMe ? "Vos" : settlement.fromMemberName;
  return isFromMe ? `${from} le pagaste a ${to}` : `${from} le pagó a ${to}`;
}
