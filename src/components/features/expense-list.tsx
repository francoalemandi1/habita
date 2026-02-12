"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";
import { Trash2, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { spacing, iconSize } from "@/lib/design-tokens";

import type { ExpenseCategory, SplitType } from "@prisma/client";

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  GROCERIES: "Supermercado",
  UTILITIES: "Servicios",
  RENT: "Alquiler",
  FOOD: "Comida",
  TRANSPORT: "Transporte",
  HEALTH: "Salud",
  ENTERTAINMENT: "Entretenimiento",
  EDUCATION: "Educación",
  HOME: "Hogar",
  OTHER: "Otros",
};

interface ExpenseSplit {
  id: string;
  memberId: string;
  amount: number;
  settled: boolean;
  member: { id: string; name: string };
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  splitType: SplitType;
  date: string;
  notes: string | null;
  paidBy: { id: string; name: string };
  splits: ExpenseSplit[];
}

interface ExpenseListProps {
  expenses: Expense[];
}

export function ExpenseList({ expenses }: ExpenseListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  const handleDelete = async (expenseId: string) => {
    if (deletingId) return;
    setDeletingId(expenseId);
    try {
      await apiFetch(`/api/expenses/${expenseId}`, { method: "DELETE" });
      toast.success("Gasto eliminado");
      router.refresh();
    } catch {
      toast.error("Error", "No se pudo eliminar el gasto");
    } finally {
      setDeletingId(null);
    }
  };

  if (expenses.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No hay gastos registrados aún.
      </p>
    );
  }

  return (
    <div className={spacing.contentStackTight}>
      {expenses.map((expense) => {
        const isExpanded = expandedId === expense.id;
        const isDeleting = deletingId === expense.id;
        const dateStr = new Date(expense.date).toLocaleDateString("es-AR", {
          day: "numeric",
          month: "short",
        });

        return (
          <Card key={expense.id}>
            <CardContent className="py-3">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{expense.title}</p>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {CATEGORY_LABELS[expense.category]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Pagó {expense.paidBy.name} · {dateStr}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold">
                  ${expense.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </p>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : expense.id)}
                  className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted"
                >
                  {isExpanded ? (
                    <ChevronUp className={iconSize.sm} />
                  ) : (
                    <ChevronDown className={iconSize.sm} />
                  )}
                </button>
              </div>

              {isExpanded && (
                <div className="mt-3 border-t pt-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">División</p>
                  <div className="space-y-1">
                    {expense.splits.map((split) => (
                      <div key={split.id} className="flex items-center justify-between text-sm">
                        <span className={split.settled ? "text-muted-foreground line-through" : ""}>
                          {split.member.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={split.settled ? "text-muted-foreground line-through" : "font-medium"}>
                            ${split.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                          </span>
                          {split.settled && (
                            <span className="text-xs text-green-600">Liquidado</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {expense.notes && (
                    <p className="mt-2 text-xs text-muted-foreground italic">{expense.notes}</p>
                  )}
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(expense.id)}
                      disabled={isDeleting}
                      className="text-red-500 hover:text-red-700"
                    >
                      {isDeleting ? (
                        <Loader2 className={`${iconSize.sm} animate-spin`} />
                      ) : (
                        <Trash2 className={iconSize.sm} />
                      )}
                      <span className="ml-1">Eliminar</span>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
