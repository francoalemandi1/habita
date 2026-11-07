"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/ds/sheet";
import { Button } from "@/components/ds/button";
import { TextField } from "@/components/ds/text-field";
import { FilterChip } from "@/components/ds/chip";
import { CATEGORY_LABELS } from "@/lib/expense-constants";
import { isExpenseCategory } from "@/lib/plata-service-enums";
import { FondoSetupAllocations } from "@/components/features/plata/fondo/fondo-setup-allocations";

import type { ExpenseCategory } from "@prisma/client";
import type { FundState, CreateFundPayload, UpdateAllocationsPayload } from "@/types/fund";
import type { MemberOption } from "@/types/expense";

interface FundSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allMembers: MemberOption[];
  currentMemberId: string;
  existingFund?: FundState | null;
  onSaved: (payload: CreateFundPayload) => Promise<void>;
  onAllocationsSaved?: (payload: UpdateAllocationsPayload) => Promise<void>;
}

const FUND_CATEGORY_OPTIONS: ExpenseCategory[] = [
  "RENT", "UTILITIES", "GROCERIES", "HOME", "FOOD", "HEALTH", "ENTERTAINMENT", "EDUCATION", "TRANSPORT", "OTHER",
];

const DEFAULT_FUND_CATEGORIES: ExpenseCategory[] = ["RENT", "UTILITIES", "GROCERIES", "HOME"];

/** Mirrors the previous `?? defaults` fallback: only missing data defaults, an empty/unknown list stays as-is. */
function parseFundCategories(fundCategories: readonly string[] | undefined): ExpenseCategory[] {
  if (!fundCategories) return DEFAULT_FUND_CATEGORIES;
  return fundCategories.filter(isExpenseCategory);
}

function buildInitialAllocations(members: MemberOption[], existingFund?: FundState | null): Record<string, string> {
  const initial: Record<string, string> = {};
  for (const m of members) {
    const existing = existingFund?.memberStatuses.find((s) => s.memberId === m.id);
    initial[m.id] = existing ? String(existing.allocation) : "";
  }
  return initial;
}

/** §7 pattern B — Fondo setup Sheet. */
export function FundSetupDialog({
  open,
  onOpenChange,
  allMembers,
  existingFund,
  onSaved,
  onAllocationsSaved,
}: FundSetupDialogProps): React.JSX.Element {
  const [name, setName] = useState(existingFund?.name ?? "Fondo Común");
  const [monthlyTarget, setMonthlyTarget] = useState(existingFund?.monthlyTarget != null ? String(existingFund.monthlyTarget) : "");
  const [selectedCategories, setSelectedCategories] = useState<ExpenseCategory[]>(
    parseFundCategories(existingFund?.fundCategories),
  );
  const [allocations, setAllocations] = useState<Record<string, string>>(() => buildInitialAllocations(allMembers, existingFund));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(existingFund?.name ?? "Fondo Común");
    setMonthlyTarget(existingFund?.monthlyTarget != null ? String(existingFund.monthlyTarget) : "");
    setSelectedCategories(parseFundCategories(existingFund?.fundCategories));
    setAllocations(buildInitialAllocations(allMembers, existingFund));
    setError(null);
  }, [open, existingFund, allMembers]);

  function toggleCategory(cat: ExpenseCategory): void {
    setSelectedCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  }

  async function handleSubmit(): Promise<void> {
    if (selectedCategories.length === 0) {
      setError("Seleccioná al menos una categoría.");
      return;
    }
    const targetValue = monthlyTarget.trim() ? parseFloat(monthlyTarget) : null;
    if (monthlyTarget.trim() && (isNaN(targetValue!) || targetValue! <= 0)) {
      setError("El objetivo mensual debe ser un número positivo.");
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      const allocationList = allMembers
        .map((m) => ({ memberId: m.id, amount: parseFloat(allocations[m.id] ?? "") }))
        .filter((allocation) => !isNaN(allocation.amount) && allocation.amount > 0);

      await onSaved({
        name: name.trim() || "Fondo Común",
        monthlyTarget: targetValue,
        fundCategories: selectedCategories,
        allocations: allocationList,
      });

      if (existingFund && onAllocationsSaved && allocationList.length > 0) {
        await onAllocationsSaved({ allocations: allocationList });
      }
    } catch {
      setError("No se pudo guardar el fondo. Probá de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={existingFund ? "Configurar fondo" : "Crear fondo común"}>
      <div className="flex flex-col gap-5">
        <TextField label="Nombre del fondo" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />

        <TextField
          label="Objetivo mensual (opcional)"
          type="number"
          min={0}
          step="100"
          value={monthlyTarget}
          onChange={(e) => setMonthlyTarget(e.target.value)}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-ink">Categorías del fondo</span>
          <p className="text-[13px] text-ink-2">Los gastos de estas categorías pueden cargarse al fondo</p>
          <div className="flex flex-wrap gap-1.5">
            {FUND_CATEGORY_OPTIONS.map((cat) => (
              <FilterChip key={cat} active={selectedCategories.includes(cat)} onClick={() => toggleCategory(cat)}>
                {CATEGORY_LABELS[cat]}
              </FilterChip>
            ))}
          </div>
        </div>

        <FondoSetupAllocations
          members={allMembers}
          allocations={allocations}
          onChange={(memberId, value) => setAllocations((prev) => ({ ...prev, [memberId]: value }))}
        />

        {error && <p className="text-[13px] text-ladrillo-text">{error}</p>}

        <Button onClick={handleSubmit} loading={isSubmitting} loadingLabel="Guardando">
          {existingFund ? "Guardar cambios" : "Crear fondo"}
        </Button>
      </div>
    </Sheet>
  );
}
