"use client";

import { CATEGORY_ICONS } from "@/lib/expense-constants";
import { formatAmount } from "@/components/features/expense-shared";

import type { FrequentExpense } from "@/lib/expense-insights";

// ============================================
// Quick Add Pills
// ============================================

export function QuickAddPills({
  expenses,
  onQuickAdd,
}: {
  expenses: FrequentExpense[];
  onQuickAdd: (preset: FrequentExpense) => void;
}) {
  if (expenses.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
      <span className="shrink-0 text-xs text-muted-foreground">Rápido:</span>
      {expenses.map((expense) => {
        const Icon = CATEGORY_ICONS[expense.category];
        return (
          <button
            key={expense.title}
            type="button"
            onClick={() => onQuickAdd(expense)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted active:bg-muted/80"
          >
            <Icon className="h-3 w-3" />
            {expense.title} {formatAmount(expense.amount)}
          </button>
        );
      })}
    </div>
  );
}
