import { formatCurrencyArs } from "../saldos/saldos-logic";

import type { SerializedFundExpense } from "@habita/contracts";

interface FondoExpensesListProps {
  expenses: SerializedFundExpense[];
}

/** Recent expenses paid from the shared fund. */
export function FondoExpensesList({ expenses }: FondoExpensesListProps): React.JSX.Element | null {
  if (expenses.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-ink-2">Gastos del fondo</p>
      <div className="flex flex-col">
        {expenses.map((expense) => (
          <div
            key={expense.id}
            className="flex items-center justify-between gap-3 border-b border-line-soft py-2.5 last:border-b-0"
          >
            <div className="min-w-0">
              <p className="truncate text-[15px] text-ink">{expense.title}</p>
              <p className="truncate text-[13px] text-ink-2">
                {new Date(expense.date).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
              </p>
            </div>
            <span className="shrink-0 text-[15px] font-medium tabular-nums text-ink">
              {formatCurrencyArs(expense.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
