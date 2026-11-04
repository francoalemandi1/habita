"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ListRow } from "@/components/ds/list-row";
import { CATEGORY_ICONS } from "@/lib/expense-constants";
import { isPendingDelete, subscribeDeferredDeletes } from "@/lib/deferred-delete";
import { groupExpensesByDay, payerMetaText } from "./gastos-logic";

import type { ExpenseListRow } from "./expense-list-schema";

interface ExpenseDayListProps {
  expenses: ExpenseListRow[];
  currentMemberId: string;
}

function formatArs(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-AR")}`;
}

/** Day-grouped expense rows ("Hoy" / "Ayer" / "Lunes 2 nov") with deferred-delete hiding. */
export function ExpenseDayList({ expenses, currentMemberId }: ExpenseDayListProps): React.JSX.Element {
  const router = useRouter();
  const [, forceRerender] = useState(0);

  useEffect(() => subscribeDeferredDeletes(() => forceRerender((n) => n + 1)), []);

  const visible = expenses.filter((expense) => !isPendingDelete(expense.id));
  const groups = groupExpensesByDay(visible, new Date());

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col">
          <span className="pb-1 text-[11px] font-semibold uppercase tracking-[.08em] text-ink-3">
            {group.label}
          </span>
          {group.items.map((expense) => (
            <ListRow
              key={expense.id}
              leadingIcon={CATEGORY_ICONS[expense.category]}
              title={expense.title}
              meta={payerMetaText({
                paidByName: expense.paidBy.name,
                isCurrentUserPayer: expense.paidBy.id === currentMemberId,
                splitCount: expense.splits.length,
              })}
              trailingAmount={formatArs(expense.amount)}
              onClick={() => router.push(`/plata/gastos/${expense.id}`)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
