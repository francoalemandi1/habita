"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";
import { ArrowRight, Loader2 } from "lucide-react";
import { spacing, iconSize } from "@/lib/design-tokens";
import { SettleDialog } from "./settle-dialog";

interface MemberBalance {
  memberId: string;
  memberName: string;
  balance: number;
}

interface DebtTransaction {
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  amount: number;
}

interface BalancesData {
  balances: MemberBalance[];
  transactions: DebtTransaction[];
}

export function ExpenseBalances() {
  const [data, setData] = useState<BalancesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [settleTransaction, setSettleTransaction] = useState<DebtTransaction | null>(null);
  const toast = useToast();

  const fetchBalances = async () => {
    try {
      const result = await apiFetch<BalancesData>("/api/expenses/balances");
      setData(result);
    } catch {
      toast.error("Error", "No se pudieron cargar los balances");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className={`${iconSize.lg} animate-spin text-muted-foreground`} />
        </CardContent>
      </Card>
    );
  }

  if (!data || (data.balances.length === 0 && data.transactions.length === 0)) {
    return null;
  }

  const hasDebts = data.transactions.length > 0;

  return (
    <>
      <Card>
        <CardContent className="py-4">
          <h3 className="mb-3 font-semibold">Balances</h3>

          {/* Member balances */}
          <div className={spacing.contentStackTight}>
            {data.balances
              .filter((b) => Math.abs(b.balance) > 0.01)
              .map((balance) => (
                <div key={balance.memberId} className="flex items-center justify-between text-sm">
                  <span>{balance.memberName}</span>
                  <span
                    className={`font-medium ${
                      balance.balance > 0
                        ? "text-green-600"
                        : balance.balance < 0
                          ? "text-red-600"
                          : "text-muted-foreground"
                    }`}
                  >
                    {balance.balance > 0 ? "+" : ""}
                    ${balance.balance.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
          </div>

          {/* Transactions to settle */}
          {hasDebts && (
            <div className="mt-4 border-t pt-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Para liquidar</p>
              <div className={spacing.contentStackTight}>
                {data.transactions.map((tx, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <span className="truncate">{tx.fromMemberName}</span>
                    <ArrowRight className={`${iconSize.xs} shrink-0 text-muted-foreground`} />
                    <span className="truncate">{tx.toMemberName}</span>
                    <span className="ml-auto shrink-0 font-medium">
                      ${tx.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-1 h-7 px-2 text-xs"
                      onClick={() => setSettleTransaction(tx)}
                    >
                      Liquidar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {settleTransaction && (
        <SettleDialog
          transaction={settleTransaction}
          open
          onClose={() => setSettleTransaction(null)}
          onSettled={fetchBalances}
        />
      )}
    </>
  );
}
