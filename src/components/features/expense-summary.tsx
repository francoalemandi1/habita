"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";
import { iconSize } from "@/lib/design-tokens";
import { Loader2, CheckCircle2 } from "lucide-react";

import type { MemberBalance, DebtTransaction } from "@/types/expense";

interface BalancesData {
  balances: MemberBalance[];
  transactions: DebtTransaction[];
}

interface ExpenseSummaryProps {
  currentMemberId: string;
  /** Increment to trigger a balance re-fetch (e.g. after expense changes). */
  refreshKey?: number;
}

export function ExpenseSummary({ currentMemberId, refreshKey }: ExpenseSummaryProps) {
  const [data, setData] = useState<BalancesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettleDialog, setShowSettleDialog] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const fetchBalances = useCallback(async () => {
    try {
      const result = await apiFetch<BalancesData>("/api/expenses/balances");
      setData(result);
    } catch {
      toast.error("Error", "No se pudieron cargar los balances");
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances, refreshKey]);

  async function handleSettleAll() {
    if (!data || data.transactions.length === 0) return;

    setIsSettling(true);
    const previousData = data;

    // Optimistic: clear all transactions and zero all balances
    setData({ balances: data.balances.map((b) => ({ ...b, balance: 0 })), transactions: [] });
    setShowSettleDialog(false);

    try {
      let totalSettled = 0;
      for (const tx of previousData.transactions) {
        const result = await apiFetch<{ settledCount: number; totalAmount: number }>(
          "/api/expenses/settle-between",
          {
            method: "POST",
            body: { fromMemberId: tx.fromMemberId, toMemberId: tx.toMemberId },
          },
        );
        totalSettled += result.settledCount;
      }
      toast.success(
        "Deudas liquidadas",
        `${totalSettled} pago${totalSettled !== 1 ? "s" : ""} liquidado${totalSettled !== 1 ? "s" : ""}`,
      );
      await fetchBalances();
      router.refresh();
    } catch {
      setData(previousData);
      toast.error("Error", "No se pudieron liquidar todas las deudas");
    } finally {
      setIsSettling(false);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className={`${iconSize.lg} animate-spin text-muted-foreground`} />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  // No pending debts — nothing to show
  if (data.transactions.length === 0) return null;

  // Compute personal net balance
  const myBalance = data.balances.find((b) => b.memberId === currentMemberId);
  const netBalance = myBalance?.balance ?? 0;
  const hasDebts = data.transactions.length > 0;
  const totalDebtAmount = data.transactions.reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <>
      <Card
        className={`border ${
          netBalance > 0.01
            ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
            : netBalance < -0.01
              ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
              : "border-border"
        }`}
      >
        <CardContent className="flex items-center justify-between py-4">
          {Math.abs(netBalance) <= 0.01 ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 className={`${iconSize.lg} text-muted-foreground`} />
              <p className="font-medium text-muted-foreground">Estan al dia</p>
            </div>
          ) : (
            <p
              className={`text-xl font-bold ${
                netBalance > 0
                  ? "text-green-700 dark:text-green-300"
                  : "text-red-700 dark:text-red-300"
              }`}
            >
              {netBalance > 0
                ? `Te deben $${netBalance.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
                : `Debes $${Math.abs(netBalance).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`}
            </p>
          )}

          {hasDebts && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 text-xs"
              onClick={() => setShowSettleDialog(true)}
            >
              Liquidar todo
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Settle all confirmation dialog */}
      <Dialog open={showSettleDialog} onOpenChange={setShowSettleDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Liquidar todas las deudas</DialogTitle>
            <DialogDescription>
              Se van a liquidar {data.transactions.length} deuda{data.transactions.length !== 1 ? "s" : ""} por un total de $
              {totalDebtAmount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowSettleDialog(false)} disabled={isSettling}>
              Cancelar
            </Button>
            <Button onClick={handleSettleAll} disabled={isSettling}>
              {isSettling ? (
                <>
                  <Loader2 className={`mr-2 ${iconSize.md} animate-spin`} />
                  Liquidando...
                </>
              ) : (
                "Confirmar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
