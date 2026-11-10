import { cn } from "@/lib/utils";
import { formatCurrencyArs, transactionRowLabel } from "./saldos-logic";

import type { ExpenseBalancesResponse } from "@habita/contracts";

interface TransactionsListProps {
  balances: ExpenseBalancesResponse;
  currentMemberId: string;
}

/** "Entre ustedes" — the minimal simplified transactions, across every currency. */
export function TransactionsList({ balances, currentMemberId }: TransactionsListProps): React.JSX.Element | null {
  const rows = Object.entries(balances.byCurrency).flatMap(([currency, { transactions }]) =>
    transactions.map((transaction) => ({ transaction, currency })),
  );

  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col">
        {rows.map(({ transaction, currency }) => (
          <div
            key={`${currency}-${transaction.fromMemberId}-${transaction.toMemberId}`}
            className="flex min-h-[52px] items-center justify-between gap-3 border-b border-line-soft py-2.5 last:border-b-0"
          >
            <span className="text-[15px] text-ink">{transactionRowLabel(transaction, currentMemberId)}</span>
            <span
              className={cn(
                "text-[15px] font-semibold text-ink",
                transaction.toMemberId === currentMemberId && "text-monte",
              )}
            >
              {formatCurrencyArs(transaction.amount)}
              {currency !== balances.primaryCurrency ? ` ${currency}` : ""}
            </span>
          </div>
        ))}
    </div>
  );
}
