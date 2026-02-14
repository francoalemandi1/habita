"use client";

import { useState } from "react";
import { CATEGORY_ICONS, CATEGORY_COLORS } from "@/lib/expense-constants";
import { Receipt } from "lucide-react";
import { EmptyState } from "@/components/features/error-states";
import { EditExpenseDialog } from "@/components/features/edit-expense-dialog";
import { cn } from "@/lib/utils";

import type { SerializedExpense, MemberOption } from "@/types/expense";
import type { UpdateExpensePayload } from "@/components/features/expenses-view";

interface ExpenseListProps {
  expenses: SerializedExpense[];
  currentMemberId: string;
  allMembers: MemberOption[];
  deletingIds: Set<string>;
  newlyCreatedIds: Set<string>;
  onExpenseUpdated: (expenseId: string, payload: UpdateExpensePayload) => void;
  onExpenseDeleted: (expenseId: string) => void;
}

/** Group label for a date: "Hoy", "Ayer", or formatted date. */
function getDateGroupLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const expenseDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (expenseDay.getTime() === today.getTime()) return "Hoy";
  if (expenseDay.getTime() === yesterday.getTime()) return "Ayer";

  return date.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** Group expenses by date label, preserving order. */
function groupByDate(expenses: SerializedExpense[]): Array<{ label: string; items: SerializedExpense[] }> {
  const groups: Array<{ label: string; items: SerializedExpense[] }> = [];
  let currentLabel = "";

  for (const expense of expenses) {
    const label = getDateGroupLabel(expense.date);
    if (label !== currentLabel) {
      groups.push({ label, items: [expense] });
      currentLabel = label;
    } else {
      groups[groups.length - 1]!.items.push(expense);
    }
  }

  return groups;
}

export function ExpenseList({
  expenses,
  currentMemberId,
  deletingIds,
  newlyCreatedIds,
  onExpenseUpdated,
  onExpenseDeleted,
}: ExpenseListProps) {
  const [editingExpense, setEditingExpense] = useState<SerializedExpense | null>(null);

  if (expenses.length === 0) {
    return (
      <EmptyState
        icon={<Receipt className="h-12 w-12 text-muted-foreground" />}
        title="Registrá el primer gasto"
        message="Anotá los gastos compartidos y Habita calcula quién le debe a quién."
        action={
          <p className="text-sm text-muted-foreground">
            Usá el botón <span className="font-medium text-foreground">Nuevo gasto</span> de arriba para empezar
          </p>
        }
      />
    );
  }

  const groups = groupByDate(expenses);

  return (
    <>
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.label}>
          {/* Date header */}
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {group.label}
          </p>

          <div className="space-y-1">
            {group.items.map((expense) => {
              const CategoryIcon = CATEGORY_ICONS[expense.category];
              const categoryColorClasses = CATEGORY_COLORS[expense.category];
              const isPayer = expense.paidBy.id === currentMemberId;

              const mySplit = expense.splits.find((s) => s.memberId === currentMemberId);
              const myAmount = mySplit?.amount ?? 0;
              const allSettled = expense.splits.every((s) => s.settled);

              const isDeleting = deletingIds.has(expense.id);
              const isNew = newlyCreatedIds.has(expense.id);

              return (
                <button
                  key={expense.id}
                  type="button"
                  onClick={() => setEditingExpense(expense)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-all duration-200 hover:bg-muted/50 active:bg-muted",
                    allSettled && "opacity-60",
                    isDeleting && "translate-x-4 opacity-0",
                    isNew && "animate-[expense-enter_300ms_ease-out]",
                  )}
                >
                  {/* Category icon */}
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${categoryColorClasses}`}
                  >
                    <CategoryIcon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{expense.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {isPayer ? "Vos pagaste" : `${expense.paidBy.name} pago`}
                    </p>
                    {mySplit && !isPayer && myAmount > 0 && (
                      <p className={`mt-0.5 text-xs font-medium ${allSettled ? "text-muted-foreground line-through" : "text-red-600"}`}>
                        Te toca ${myAmount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                      </p>
                    )}
                    {isPayer && !allSettled && (
                      <p className="mt-0.5 text-xs font-medium text-green-600">
                        Te deben ${(expense.amount - myAmount).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>

                  {/* Amount */}
                  <p className="shrink-0 text-sm font-semibold">
                    ${expense.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>

    {editingExpense && (
      <EditExpenseDialog
        expense={editingExpense}
        open
        onClose={() => setEditingExpense(null)}
        onExpenseUpdated={onExpenseUpdated}
        onExpenseDeleted={onExpenseDeleted}
      />
    )}
    </>
  );
}
