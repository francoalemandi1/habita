"use client";

import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { CATEGORY_ICONS } from "@/lib/expense-constants";
import { getDeferredDeletesVersion, isPendingDelete, subscribeDeferredDeletes } from "@/lib/deferred-delete";
import { groupExpensesByDay, payerMetaText } from "./gastos-logic";
import { DESKTOP_PANEL_QUERY } from "./gastos-layout";

import type { ExpenseListRow } from "./expense-list-schema";

interface ExpenseDayListProps {
  expenses: ExpenseListRow[];
  currentMemberId: string;
  selectedExpenseId: string | null;
  onSelectExpense: (expenseId: string) => void;
}

function formatArs(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-AR")}`;
}

/** Day-grouped expense rows ("Hoy" / "Ayer" / "Lunes 2 nov") with deferred-delete hiding. */
export function ExpenseDayList({
  expenses,
  currentMemberId,
  selectedExpenseId,
  onSelectExpense,
}: ExpenseDayListProps): React.JSX.Element {
  const router = useRouter();
  // Re-render when a row is scheduled or restored (Deshacer); the version itself is unused.
  useSyncExternalStore(subscribeDeferredDeletes, getDeferredDeletesVersion, () => 0);

  const visible = expenses.filter((expense) => !isPendingDelete(expense.id));
  const groups = groupExpensesByDay(visible, new Date());

  function handleRowClick(expenseId: string): void {
    const isDesktopPanel = typeof window !== "undefined" && window.matchMedia(DESKTOP_PANEL_QUERY).matches;
    if (isDesktopPanel) {
      onSelectExpense(expenseId);
    } else {
      router.push(`/plata/gastos/${expenseId}`);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col">
          <span className="pt-1 text-[11px] font-semibold uppercase tracking-[.08em] text-ink-2">
            {group.label}
          </span>
          {group.items.map((expense) => {
            const isSelected = expense.id === selectedExpenseId;
            const CategoryIcon = CATEGORY_ICONS[expense.category];
            return (
              <button
                key={expense.id}
                type="button"
                onClick={() => handleRowClick(expense.id)}
                aria-current={isSelected ? "true" : undefined}
                className={cn(
                  "-mx-2 flex min-h-[60px] w-[calc(100%+1rem)] items-center gap-3 rounded-[12px] border-b border-line-soft px-2 py-2 text-left outline-none transition-colors duration-100 last:border-b-0 hover:bg-paper/70 focus-visible:ring-2 focus-visible:ring-monte",
                  isSelected && "bg-sand",
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-paper">
                  <CategoryIcon className="size-[18px] text-ink" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px] font-medium text-ink">{expense.title}</span>
                  <span className="truncate text-[13px] text-ink-2">
                    {payerMetaText({
                      paidByName: expense.paidBy.name,
                      isCurrentUserPayer: expense.paidBy.id === currentMemberId,
                      splitCount: expense.splits.length,
                    })}
                  </span>
                </span>
                <span className="shrink-0 text-[15px] font-medium text-ink">{formatArs(expense.amount)}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
