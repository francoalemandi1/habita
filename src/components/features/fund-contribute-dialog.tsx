"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { Loader2 } from "lucide-react";
import { formatAmount } from "@/components/features/expense-shared";

import type { CreateContributionPayload, MemberContributionStatus } from "@/types/fund";

// ============================================
// Types
// ============================================

interface FundContributeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMemberStatus?: MemberContributionStatus;
  onContribute: (payload: CreateContributionPayload) => Promise<void>;
}

// ============================================
// Component
// ============================================

export function FundContributeDialog({
  open,
  onOpenChange,
  currentMemberStatus,
  onContribute,
}: FundContributeDialogProps) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  // Pre-fill with pending amount when dialog opens
  useEffect(() => {
    if (open && currentMemberStatus?.pending && currentMemberStatus.pending > 0) {
      setAmount(String(currentMemberStatus.pending));
    } else {
      setAmount("");
    }
    setNotes("");
  }, [open, currentMemberStatus?.pending]);

  async function handleSubmit() {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Error", "Ingresá un monto válido");
      return;
    }

    setIsSubmitting(true);
    try {
      await onContribute({
        amount: parsedAmount,
        notes: notes.trim() || undefined,
      });
      toast.success("¡Listo!", `Aporte de ${formatAmount(parsedAmount)} registrado`);
    } catch {
      toast.error("Error", "No se pudo registrar el aporte");
    } finally {
      setIsSubmitting(false);
    }
  }

  const pendingAmount = currentMemberStatus?.pending ?? 0;
  const hasAllocation = (currentMemberStatus?.allocation ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar aporte al fondo</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Pending summary */}
          {hasAllocation && (
            <div className="rounded-xl bg-muted/40 px-4 py-3 text-sm">
              {pendingAmount > 0 ? (
                <p className="text-foreground">
                  Tu cuota este mes es{" "}
                  <span className="font-medium">
                    {formatAmount(currentMemberStatus!.allocation)}
                  </span>
                  {currentMemberStatus!.contributed > 0 && (
                    <>
                      {" "}· ya aportaste{" "}
                      <span className="font-medium">
                        {formatAmount(currentMemberStatus!.contributed)}
                      </span>
                    </>
                  )}
                  {". "}
                  Falta{" "}
                  <span className="font-medium text-amber-600">
                    {formatAmount(pendingAmount)}
                  </span>
                  .
                </p>
              ) : (
                <p className="text-green-700 dark:text-green-300">
                  Ya aportaste tu cuota completa este mes 🎉
                </p>
              )}
            </div>
          )}

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="contribution-amount">Monto</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                id="contribution-amount"
                type="number"
                min="1"
                step="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="pl-7 text-base"
                autoFocus
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="contribution-notes">Nota (opcional)</Label>
            <Input
              id="contribution-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Transferí por Mercado Pago"
              maxLength={200}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !amount}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar aporte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
