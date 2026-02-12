"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Loader2 } from "lucide-react";
import { iconSize } from "@/lib/design-tokens";

interface DebtTransaction {
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  amount: number;
}

interface SettleDialogProps {
  transaction: DebtTransaction;
  open: boolean;
  onClose: () => void;
  onSettled: () => void;
}

/**
 * Settle a debt between two members.
 * Finds all unsettled splits where the debtor owes the creditor and marks them as settled.
 */
export function SettleDialog({ transaction, open, onClose, onSettled }: SettleDialogProps) {
  const [isSettling, setIsSettling] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function handleSettle() {
    setIsSettling(true);
    try {
      // Fetch expenses to find the relevant unsettled splits
      const result = await apiFetch<{
        expenses: Array<{
          id: string;
          paidBy: { id: string };
          splits: Array<{ id: string; memberId: string; settled: boolean }>;
        }>;
      }>("/api/expenses?limit=50");

      // Find splits where fromMember owes toMember (toMember paid, fromMember has an unsettled split)
      const splitsToSettle: Array<{ expenseId: string; splitId: string }> = [];

      for (const expense of result.expenses) {
        if (expense.paidBy.id !== transaction.toMemberId) continue;

        for (const split of expense.splits) {
          if (split.memberId === transaction.fromMemberId && !split.settled) {
            splitsToSettle.push({ expenseId: expense.id, splitId: split.id });
          }
        }
      }

      // Settle all found splits grouped by expense
      const expenseGroups = new Map<string, string[]>();
      for (const item of splitsToSettle) {
        const existing = expenseGroups.get(item.expenseId);
        if (existing) {
          existing.push(item.splitId);
        } else {
          expenseGroups.set(item.expenseId, [item.splitId]);
        }
      }

      let settledCount = 0;
      for (const [expenseId, splitIds] of expenseGroups) {
        const response = await apiFetch<{ settled: number }>(
          `/api/expenses/${expenseId}/settle`,
          { method: "POST", body: { splitIds } },
        );
        settledCount += response.settled;
      }

      toast.success(
        "Deuda liquidada",
        `${settledCount} pago${settledCount !== 1 ? "s" : ""} liquidado${settledCount !== 1 ? "s" : ""}`,
      );
      onClose();
      onSettled();
      router.refresh();
    } catch {
      toast.error("Error", "No se pudo liquidar la deuda");
    } finally {
      setIsSettling(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Liquidar deuda</DialogTitle>
          <DialogDescription>
            ¿Confirmar que {transaction.fromMemberName} le pagó $
            {transaction.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })} a{" "}
            {transaction.toMemberName}?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isSettling}>
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
  );
}
