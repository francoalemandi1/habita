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
import { Loader2, X } from "lucide-react";
import { CATEGORY_LABELS } from "@/lib/expense-constants";
import { cn } from "@/lib/utils";

import type { ExpenseCategory } from "@prisma/client";
import type { FundState, CreateFundPayload, UpdateAllocationsPayload } from "@/types/fund";
import type { MemberOption } from "@/types/expense";

// ============================================
// Types
// ============================================

interface FundSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allMembers: MemberOption[];
  currentMemberId: string;
  existingFund?: FundState | null;
  onSaved: (payload: CreateFundPayload) => Promise<void>;
  onAllocationsSaved?: (payload: UpdateAllocationsPayload) => Promise<void>;
}

// Fund categories that make sense for a shared fund
const FUND_CATEGORY_OPTIONS: ExpenseCategory[] = [
  "RENT",
  "UTILITIES",
  "GROCERIES",
  "HOME",
  "FOOD",
  "HEALTH",
  "ENTERTAINMENT",
  "EDUCATION",
  "TRANSPORT",
  "OTHER",
];

// ============================================
// Component
// ============================================

export function FundSetupDialog({
  open,
  onOpenChange,
  allMembers,
  existingFund,
  onSaved,
  onAllocationsSaved,
}: FundSetupDialogProps) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState(existingFund?.name ?? "Fondo Común");
  const [monthlyTarget, setMonthlyTarget] = useState(
    existingFund?.monthlyTarget != null ? String(existingFund.monthlyTarget) : "",
  );
  const [selectedCategories, setSelectedCategories] = useState<ExpenseCategory[]>(
    existingFund?.fundCategories ?? ["RENT", "UTILITIES", "GROCERIES", "HOME"],
  );
  const [allocations, setAllocations] = useState<Record<string, string>>(
    () => {
      const initial: Record<string, string> = {};
      for (const m of allMembers) {
        const existing = existingFund?.memberStatuses.find((s) => s.memberId === m.id);
        initial[m.id] = existing ? String(existing.allocation) : "";
      }
      return initial;
    },
  );

  // Reset when dialog opens with new data
  useEffect(() => {
    if (open) {
      setName(existingFund?.name ?? "Fondo Común");
      setMonthlyTarget(
        existingFund?.monthlyTarget != null ? String(existingFund.monthlyTarget) : "",
      );
      setSelectedCategories(
        existingFund?.fundCategories ?? ["RENT", "UTILITIES", "GROCERIES", "HOME"],
      );
      const initial: Record<string, string> = {};
      for (const m of allMembers) {
        const existing = existingFund?.memberStatuses.find((s) => s.memberId === m.id);
        initial[m.id] = existing ? String(existing.allocation) : "";
      }
      setAllocations(initial);
    }
  }, [open, existingFund, allMembers]);

  function toggleCategory(cat: ExpenseCategory) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }

  async function handleSubmit() {
    if (selectedCategories.length === 0) {
      toast.error("Error", "Seleccioná al menos una categoría");
      return;
    }

    setIsSubmitting(true);
    try {
      const targetValue = monthlyTarget.trim() ? parseFloat(monthlyTarget) : null;
      if (monthlyTarget.trim() && (isNaN(targetValue!) || targetValue! <= 0)) {
        toast.error("Error", "El objetivo mensual debe ser un número positivo");
        return;
      }

      // Build allocations list (only members with a value > 0)
      const allocationList = allMembers
        .filter((m) => {
          const val = parseFloat(allocations[m.id] ?? "");
          return !isNaN(val) && val > 0;
        })
        .map((m) => ({
          memberId: m.id,
          amount: parseFloat(allocations[m.id] ?? "0"),
        }));

      await onSaved({
        name: name.trim() || "Fondo Común",
        monthlyTarget: targetValue,
        fundCategories: selectedCategories,
        allocations: allocationList,
      });

      // If updating allocations separately
      if (existingFund && onAllocationsSaved && allocationList.length > 0) {
        await onAllocationsSaved({ allocations: allocationList });
      }

      toast.success("¡Listo!", existingFund ? "Fondo actualizado" : "Fondo creado");
    } catch {
      toast.error("Error", "No se pudo guardar el fondo");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingFund ? "Configurar fondo" : "Crear fondo común"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Fund name */}
          <div className="space-y-1.5">
            <Label htmlFor="fund-name">Nombre del fondo</Label>
            <Input
              id="fund-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Fondo Común"
              maxLength={100}
            />
          </div>

          {/* Monthly target */}
          <div className="space-y-1.5">
            <Label htmlFor="monthly-target">Objetivo mensual (opcional)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                id="monthly-target"
                type="number"
                min="0"
                step="100"
                value={monthlyTarget}
                onChange={(e) => setMonthlyTarget(e.target.value)}
                placeholder="0"
                className="pl-7"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Monto total que el fondo debería recibir por mes
            </p>
          </div>

          {/* Fund categories */}
          <div className="space-y-2">
            <Label>Categorías del fondo</Label>
            <p className="text-xs text-muted-foreground">
              Los gastos de estas categorías tendrán la opción de cargarse al fondo
            </p>
            <div className="flex flex-wrap gap-2">
              {FUND_CATEGORY_OPTIONS.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    selectedCategories.includes(cat)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                  )}
                >
                  {selectedCategories.includes(cat) && (
                    <X className="h-3 w-3" />
                  )}
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Member allocations */}
          {allMembers.length > 0 && (
            <div className="space-y-2">
              <Label>Cuota mensual por miembro</Label>
              <p className="text-xs text-muted-foreground">
                Cuánto aporta cada miembro al fondo por mes
              </p>
              <div className="space-y-2">
                {allMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                      {member.name[0]?.toUpperCase() ?? "?"}
                    </div>
                    <span className="flex-1 truncate text-sm text-foreground">
                      {member.name}
                    </span>
                    <div className="relative w-32">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        min="0"
                        step="100"
                        value={allocations[member.id] ?? ""}
                        onChange={(e) =>
                          setAllocations((prev) => ({
                            ...prev,
                            [member.id]: e.target.value,
                          }))
                        }
                        placeholder="0"
                        className="pl-7"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existingFund ? "Guardar cambios" : "Crear fondo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
