"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";
import { ExpenseList } from "@/components/features/expense-list";
import { ExpenseSummary } from "@/components/features/expense-summary";
import { AddExpenseDialog } from "@/components/features/add-expense-dialog";
import { RecurringExpensesCard } from "@/components/features/recurring-expenses-card";
import { ShoppingPlanView } from "@/components/features/grocery-advisor";
import { Button } from "@/components/ui/button";
import { spacing } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { Receipt, ShoppingCart } from "lucide-react";

import type { SerializedExpense, MemberOption } from "@/types/expense";
import type { ExpenseCategory, SplitType } from "@prisma/client";

/** Data needed to create an optimistic expense before the API responds. */
export interface CreateExpensePayload {
  title: string;
  amount: number;
  category: ExpenseCategory;
  paidById: string;
  splitType: SplitType;
  splits?: Array<{ memberId: string; amount?: number; percentage?: number }>;
  notes?: string;
}

/** Data needed for an optimistic update (only changed fields). */
export interface UpdateExpensePayload {
  title?: string;
  amount?: number;
  category?: ExpenseCategory;
  notes?: string | null;
}

type ExpensesTab = "activity" | "deals";

interface ExpensesViewProps {
  initialExpenses: SerializedExpense[];
  currentMemberId: string;
  allMembers: MemberOption[];
  hasLocation: boolean;
  householdCity: string | null;
  isSolo?: boolean;
}

export function ExpensesView({
  initialExpenses,
  currentMemberId,
  allMembers,
  hasLocation,
  householdCity,
  isSolo = false,
}: ExpensesViewProps) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [newlyCreatedIds, setNewlyCreatedIds] = useState<Set<string>>(new Set());
  const [balanceRefreshKey, setBalanceRefreshKey] = useState(0);

  // Sync with server data after router.refresh()
  useEffect(() => {
    setExpenses(initialExpenses);
    setBalanceRefreshKey((k) => k + 1);
  }, [initialExpenses]);
  const deletingInProgressRef = useRef<Set<string>>(new Set());
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: ExpensesTab =
    tabParam === "deals"
      ? tabParam
      : "activity";

  const setActiveTab = useCallback(
    (tab: ExpensesTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "activity") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const query = params.toString();
      router.replace(query ? `?${query}` : window.location.pathname, { scroll: false });
    },
    [router, searchParams],
  );
  const toast = useToast();

  const currentPayer = allMembers.find((m) => m.id === currentMemberId);

  const handleExpenseCreated = useCallback(
    (payload: CreateExpensePayload) => {
      const tempId = `temp-${Date.now()}`;
      const payer = allMembers.find((m) => m.id === payload.paidById);

      // Build optimistic splits
      const optimisticSplits = payload.splits
        ? payload.splits.map((s, idx) => {
            const member = allMembers.find((m) => m.id === s.memberId);
            return {
              id: `temp-split-${idx}`,
              memberId: s.memberId,
              amount: s.amount ?? payload.amount / (payload.splits?.length ?? 1),
              settled: false,
              settledAt: null,
              member: { id: s.memberId, name: member?.name ?? "?" },
            };
          })
        : allMembers.map((m, idx) => ({
            id: `temp-split-${idx}`,
            memberId: m.id,
            amount: Math.round((payload.amount / allMembers.length) * 100) / 100,
            settled: false,
            settledAt: null,
            member: { id: m.id, name: m.name },
          }));

      const optimisticExpense: SerializedExpense = {
        id: tempId,
        title: payload.title,
        amount: payload.amount,
        currency: "ARS",
        category: payload.category,
        splitType: payload.splitType,
        date: new Date().toISOString(),
        notes: payload.notes ?? null,
        paidBy: { id: payload.paidById, name: payer?.name ?? currentPayer?.name ?? "?" },
        splits: optimisticSplits,
      };

      const previous = expenses;
      setExpenses((prev) => [optimisticExpense, ...prev]);
      setNewlyCreatedIds((prev) => new Set(prev).add(tempId));

      // Clear the "newly created" animation class after it plays
      setTimeout(() => {
        setNewlyCreatedIds((prev) => {
          const next = new Set(prev);
          next.delete(tempId);
          return next;
        });
      }, 500);

      apiFetch("/api/expenses", {
        method: "POST",
        body: {
          title: payload.title,
          amount: payload.amount,
          category: payload.category,
          paidById: payload.paidById,
          splitType: payload.splitType,
          splits: payload.splits,
          notes: payload.notes,
        },
      })
        .then(() => {
          router.refresh();
        })
        .catch(() => {
          setExpenses(previous);
          toast.error("Error", "No se pudo registrar el gasto");
        });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expenses, allMembers, currentMemberId],
  );

  const handleExpenseUpdated = useCallback(
    (expenseId: string, payload: UpdateExpensePayload) => {
      const previous = expenses;

      setExpenses((prev) =>
        prev.map((e) => {
          if (e.id !== expenseId) return e;
          return {
            ...e,
            ...(payload.title !== undefined && { title: payload.title }),
            ...(payload.amount !== undefined && { amount: payload.amount }),
            ...(payload.category !== undefined && { category: payload.category }),
            ...(payload.notes !== undefined && { notes: payload.notes }),
          };
        }),
      );

      apiFetch(`/api/expenses/${expenseId}`, {
        method: "PATCH",
        body: payload,
      })
        .then(() => {
          router.refresh();
        })
        .catch(() => {
          setExpenses(previous);
          toast.error("Error", "No se pudo actualizar el gasto");
        });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expenses],
  );

  const handleExpenseDeleted = useCallback(
    (expenseId: string) => {
      if (deletingInProgressRef.current.has(expenseId)) return;
      deletingInProgressRef.current.add(expenseId);

      const previous = expenses;

      // Start fade-out animation
      setDeletingIds((prev) => new Set(prev).add(expenseId));

      // After animation, remove from list and fire API
      setTimeout(() => {
        setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(expenseId);
          return next;
        });

        apiFetch(`/api/expenses/${expenseId}`, { method: "DELETE" })
          .then(() => {
            deletingInProgressRef.current.delete(expenseId);
            router.refresh();
          })
          .catch((error) => {
            deletingInProgressRef.current.delete(expenseId);
            setExpenses(previous);
            toast.error(
              "Error",
              error instanceof Error ? error.message : "No se pudo eliminar el gasto",
            );
          });
      }, 200);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expenses],
  );

  return (
    <>
      <div className={spacing.pageHeader}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Gastos</h1>
          {activeTab === "activity" && (
            <AddExpenseDialog
              members={allMembers}
              currentMemberId={currentMemberId}
              onExpenseCreated={handleExpenseCreated}
              isSolo={isSolo}
            />
          )}
        </div>
      </div>

      {/* Tab switcher */}
      <div className="mb-4 flex items-center rounded-lg border bg-muted p-0.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab("activity")}
          className={cn(
            "flex-1 gap-1.5 rounded-md px-2",
            activeTab === "activity" && "bg-background shadow-sm",
          )}
        >
          <Receipt className="h-4 w-4 shrink-0" />
          <span className="truncate text-xs sm:text-sm">Actividad</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab("deals")}
          className={cn(
            "flex-1 gap-1.5 rounded-md px-2",
            activeTab === "deals" && "bg-background shadow-sm",
          )}
        >
          <ShoppingCart className="h-4 w-4 shrink-0" />
          <span className="truncate text-xs sm:text-sm">Compras</span>
        </Button>
      </div>

      {/* Tab content */}
      {activeTab === "activity" && (
        <div className="space-y-4">
          <RecurringExpensesCard
            currentMemberId={currentMemberId}
            allMembers={allMembers}
            onExpenseGenerated={() => {
              setBalanceRefreshKey((k) => k + 1);
              router.refresh();
            }}
          />
          {!isSolo && <ExpenseSummary currentMemberId={currentMemberId} refreshKey={balanceRefreshKey} />}
          <ExpenseList
            expenses={expenses}
            currentMemberId={currentMemberId}
            allMembers={allMembers}
            deletingIds={deletingIds}
            newlyCreatedIds={newlyCreatedIds}
            onExpenseUpdated={handleExpenseUpdated}
            onExpenseDeleted={handleExpenseDeleted}
          />
        </div>
      )}
      {activeTab === "deals" && (
        <div className={spacing.sectionGap}>
          <ShoppingPlanView
            hasLocation={hasLocation}
            householdCity={householdCity}
          />
        </div>
      )}
    </>
  );
}
