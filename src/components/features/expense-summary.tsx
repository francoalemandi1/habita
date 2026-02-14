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
import { getMemberColor, getInitial } from "@/lib/member-utils";
import { spacing, iconSize } from "@/lib/design-tokens";
import { Loader2, ArrowRight, CheckCircle2 } from "lucide-react";

import type { MemberBalance, DebtTransaction, MemberOption } from "@/types/expense";

interface BalancesData {
  balances: MemberBalance[];
  transactions: DebtTransaction[];
}

interface ExpenseSummaryProps {
  currentMemberId: string;
  allMembers: MemberOption[];
}

export function ExpenseSummary({ currentMemberId, allMembers }: ExpenseSummaryProps) {
  const [data, setData] = useState<BalancesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [settlingTx, setSettlingTx] = useState<DebtTransaction | null>(null);
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
  }, [fetchBalances]);

  async function handleSettle() {
    if (!settlingTx || !data) return;

    // Optimistic: remove the settled transaction and update balances immediately
    const previousData = data;
    const optimisticTransactions = data.transactions.filter(
      (tx) =>
        !(tx.fromMemberId === settlingTx.fromMemberId && tx.toMemberId === settlingTx.toMemberId),
    );
    const optimisticBalances = data.balances.map((b) => {
      if (b.memberId === settlingTx.fromMemberId) {
        return { ...b, balance: b.balance + settlingTx.amount };
      }
      if (b.memberId === settlingTx.toMemberId) {
        return { ...b, balance: b.balance - settlingTx.amount };
      }
      return b;
    });

    setData({ balances: optimisticBalances, transactions: optimisticTransactions });
    setSettlingTx(null);

    try {
      const result = await apiFetch<{ settledCount: number; totalAmount: number }>(
        "/api/expenses/settle-between",
        {
          method: "POST",
          body: {
            fromMemberId: settlingTx.fromMemberId,
            toMemberId: settlingTx.toMemberId,
          },
        },
      );
      toast.success(
        "Deuda liquidada",
        `${result.settledCount} pago${result.settledCount !== 1 ? "s" : ""} liquidado${result.settledCount !== 1 ? "s" : ""}`,
      );
      // Sync with real server data
      await fetchBalances();
      router.refresh();
    } catch {
      // Rollback on error
      setData(previousData);
      toast.error("Error", "No se pudo liquidar la deuda");
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

  if (!data || data.transactions.length === 0) {
    // Show "all settled" when there were balances but all are now settled
    if (data) {
      return (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className={`${iconSize.lg} text-green-500`} />
              <p className="font-medium text-green-700">Estan al dia</p>
            </div>
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  // Compute personal net balance
  const myBalance = data.balances.find((b) => b.memberId === currentMemberId);
  const netBalance = myBalance?.balance ?? 0;

  // Classify transactions from current user's perspective
  const personalDebts = data.transactions.map((tx) => {
    const iOwe = tx.fromMemberId === currentMemberId;
    const theyOweMe = tx.toMemberId === currentMemberId;
    const otherMemberId = iOwe ? tx.toMemberId : tx.fromMemberId;
    const otherMemberName = iOwe ? tx.toMemberName : tx.fromMemberName;

    return { ...tx, iOwe, theyOweMe, otherMemberId, otherMemberName };
  });

  return (
    <>
      <div className={spacing.contentStackTight}>
        {/* Personal summary banner */}
        <Card
          className={`border ${
            netBalance > 0.01
              ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
              : netBalance < -0.01
                ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
                : "border-border"
          }`}
        >
          <CardContent className="py-4">
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
          </CardContent>
        </Card>

        {/* Individual debt rows */}
        {personalDebts.length > 0 && (
          <Card>
            <CardContent className="py-3">
              <p className="mb-3 text-xs font-medium text-muted-foreground">Deudas pendientes</p>
              <div className="space-y-3">
                {personalDebts.map((debt, idx) => {
                  const bgColor = getMemberColor(debt.otherMemberId, allMembers);
                  const initial = getInitial(debt.otherMemberName);

                  return (
                    <div key={idx} className="flex items-center gap-3">
                      {/* Member initial */}
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: bgColor }}
                      >
                        {initial}
                      </div>

                      {/* Description */}
                      <div className="min-w-0 flex-1">
                        {debt.theyOweMe ? (
                          <p className="text-sm">
                            <span className="font-medium">{debt.otherMemberName}</span>{" "}
                            <span className="text-green-600">
                              te debe ${debt.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                            </span>
                          </p>
                        ) : debt.iOwe ? (
                          <p className="text-sm">
                            <span className="text-red-600">
                              Le debes ${debt.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                            </span>{" "}
                            a <span className="font-medium">{debt.otherMemberName}</span>
                          </p>
                        ) : (
                          <p className="text-sm">
                            {debt.fromMemberName}{" "}
                            <ArrowRight className={`${iconSize.xs} inline text-muted-foreground`} />{" "}
                            {debt.toMemberName}{" "}
                            <span className="font-medium">
                              ${debt.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                            </span>
                          </p>
                        )}
                      </div>

                      {/* Settle button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 shrink-0 px-3 text-xs"
                        onClick={() => setSettlingTx(debt)}
                      >
                        Liquidar
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Settle confirmation dialog */}
      {settlingTx && (
        <Dialog open onOpenChange={(nextOpen) => { if (!nextOpen) setSettlingTx(null); }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Liquidar deuda</DialogTitle>
              <DialogDescription>
                Confirmar que {settlingTx.fromMemberName} le pago $
                {settlingTx.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })} a{" "}
                {settlingTx.toMemberName}?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setSettlingTx(null)} disabled={isSettling}>
                Cancelar
              </Button>
              <Button onClick={handleSettle} disabled={isSettling}>
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
      )}
    </>
  );
}
