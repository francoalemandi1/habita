import { formatCurrencyArs, transactionRowLabel } from "../saldos/saldos-logic";
import { lockedByLabel } from "./settle-logic";

import type { SettleTransferRow } from "./settle-logic";

interface SettleTransferRowViewProps {
  row: SettleTransferRow;
  currentMemberId: string;
  primaryCurrency: string;
}

export function SettleTransferRowView({
  row,
  currentMemberId,
  primaryCurrency,
}: SettleTransferRowViewProps): React.JSX.Element {
  const { transaction, currency, recordable } = row;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-line-soft py-3 last:border-b-0">
      <span className="text-[15px] font-medium text-ink">{transactionRowLabel(transaction, currentMemberId)}</span>
      <div className="text-right">
        <p className="text-[15px] font-medium text-ink">
          {formatCurrencyArs(transaction.amount)}
          {currency !== primaryCurrency ? ` ${currency}` : ""}
        </p>
        {!recordable && <p className="text-[12px] text-ink-3">{lockedByLabel(transaction)}</p>}
      </div>
    </div>
  );
}
