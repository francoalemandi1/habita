import type { DebtTransaction } from "@habita/contracts";
import type { MemberType } from "@prisma/client";

export interface SettleTransferRow {
  transaction: DebtTransaction;
  currency: string;
  /** Whether the current member may record this transfer (party or ADULT). */
  recordable: boolean;
}

/** A transfer can be recorded by either party or by an ADULT. Mirrors the API's server-side rule. */
export function canRecordTransfer(
  currentMemberId: string,
  currentMemberType: MemberType,
  transaction: DebtTransaction,
): boolean {
  if (currentMemberType === "ADULT") return true;
  return transaction.fromMemberId === currentMemberId || transaction.toMemberId === currentMemberId;
}

/** Flattens every currency's minimal transactions into sheet rows, tagging which ones are recordable. */
export function buildSettleRows(
  byCurrency: Record<string, { transactions: DebtTransaction[] }>,
  currentMemberId: string,
  currentMemberType: MemberType,
): SettleTransferRow[] {
  return Object.entries(byCurrency).flatMap(([currency, { transactions }]) =>
    transactions.map((transaction) => ({
      transaction,
      currency,
      recordable: canRecordTransfer(currentMemberId, currentMemberType, transaction),
    })),
  );
}

/** "Registrar pago" / "Registrar N pagos". */
export function settleButtonLabel(recordableCount: number): string {
  return recordableCount === 1 ? "Registrar pago" : `Registrar ${recordableCount} pagos`;
}

/** "Sofi" / "Sofi y Tomi" / "Sofi, Tomi y Lu" — voseo-friendly Spanish list join. */
export function joinNamesEs(names: string[]): string {
  const unique = [...new Set(names)];
  if (unique.length === 0) return "";
  if (unique.length === 1) return unique[0]!;
  return `${unique.slice(0, -1).join(", ")} y ${unique[unique.length - 1]}`;
}

/** "Se les avisa a Sofi y Tomi" — the other members involved in the recordable transfers. */
export function settleConsequenceLine(rows: SettleTransferRow[], currentMemberId: string): string {
  const otherNames = rows
    .filter((row) => row.recordable)
    .flatMap((row) => [
      row.transaction.fromMemberId === currentMemberId ? null : row.transaction.fromMemberName,
      row.transaction.toMemberId === currentMemberId ? null : row.transaction.toMemberName,
    ])
    .filter((name): name is string => name !== null);

  if (otherNames.length === 0) return "";
  const verb = otherNames.length === 1 ? "Se le avisa a" : "Se les avisa a";
  return `${verb} ${joinNamesEs(otherNames)}`;
}

/** "Lo registra Sofi o Tomi" shown over the disabled row for a transfer the current member can't record. */
export function lockedByLabel(transaction: DebtTransaction): string {
  return `Lo registra ${transaction.fromMemberName} o ${transaction.toMemberName}`;
}
