"use client";

import { useState } from "react";
import { Sheet } from "@/components/ds/sheet";
import { Button } from "@/components/ds/button";
import { useCreateService, useUpdateService } from "@/hooks/use-services";
import { toRecurringFrequency } from "@/lib/plata-service-enums";
import { ServiceFormFields } from "./service-form-fields";

import type { ServiceFormState } from "./service-form-fields";
import type { SerializedService, MemberOption } from "@/types/expense";
import type { RecurringFrequency } from "@prisma/client";

interface ServiceFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: MemberOption[];
  currentMemberId: string;
  existing?: SerializedService;
  onSaved: (service: SerializedService) => void;
}

function initialState(currentMemberId: string, existing?: SerializedService): ServiceFormState {
  return {
    title: existing?.title ?? "",
    provider: existing?.provider ?? "",
    accountNumber: existing?.accountNumber ?? "",
    amount: existing?.lastAmount != null ? String(existing.lastAmount) : "",
    category: existing?.category ?? "UTILITIES",
    frequency: toRecurringFrequency(existing?.frequency, "MONTHLY"),
    dayOfMonth: existing?.dayOfMonth != null ? String(existing.dayOfMonth) : "1",
    paidById: existing?.paidById ?? currentMemberId,
    autoGenerate: existing?.autoGenerate ?? false,
    notes: existing?.notes ?? "",
  };
}

function nextDueDate(frequency: RecurringFrequency, dayOfMonth: string): Date {
  const now = new Date();
  const next = new Date(now);
  const parsedDay = parseInt(dayOfMonth, 10);

  if (frequency === "WEEKLY") {
    next.setDate(next.getDate() + 7);
  } else {
    next.setMonth(next.getMonth() + 1);
    if (!isNaN(parsedDay) && parsedDay >= 1 && parsedDay <= 28) next.setDate(parsedDay);
  }
  return next;
}

/** §7 pattern B — Servicio create/edit Sheet. */
export function ServiceFormSheet({
  open,
  onOpenChange,
  members,
  currentMemberId,
  existing,
  onSaved,
}: ServiceFormSheetProps): React.JSX.Element {
  const [state, setState] = useState<ServiceFormState>(() => initialState(currentMemberId, existing));
  const [error, setError] = useState<string | null>(null);
  const create = useCreateService();
  const update = useUpdateService();
  const isSaving = create.isPending || update.isPending;

  function patch(next: Partial<ServiceFormState>): void {
    setState((prev) => ({ ...prev, ...next }));
  }

  function handleOpenChange(nextOpen: boolean): void {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setState(initialState(currentMemberId, existing));
      setError(null);
    }
  }

  async function handleSubmit(): Promise<void> {
    if (!state.title.trim()) {
      setError("Completá el nombre del servicio.");
      return;
    }
    const parsedAmount = state.amount ? parseFloat(state.amount) : null;
    if (parsedAmount !== null && (isNaN(parsedAmount) || parsedAmount <= 0)) {
      setError("El monto debe ser un número positivo.");
      return;
    }
    setError(null);

    const basePayload = {
      title: state.title.trim(),
      provider: state.provider.trim() || null,
      accountNumber: state.accountNumber.trim() || null,
      lastAmount: parsedAmount,
      category: state.category,
      frequency: state.frequency,
      dayOfMonth: state.frequency !== "WEEKLY" ? parseInt(state.dayOfMonth, 10) || 1 : null,
      paidById: state.paidById,
      autoGenerate: state.autoGenerate,
      notes: state.notes.trim() || null,
    };

    try {
      const saved = existing
        ? await update.mutateAsync({ id: existing.id, payload: basePayload })
        : await create.mutateAsync({
            ...basePayload,
            splitType: "EQUAL",
            nextDueDate: nextDueDate(state.frequency, state.dayOfMonth).toISOString(),
          });
      onSaved(saved);
      handleOpenChange(false);
    } catch (error) {
      console.warn("ServiceFormSheet: failed to save service", error);
      setError("No se pudo guardar. Probá de nuevo.");
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange} title={existing ? "Editar servicio" : "Nuevo servicio"}>
      <div className="flex flex-col gap-5">
        <ServiceFormFields state={state} onChange={patch} members={members} />
        {error && <p className="text-[13px] text-ladrillo-text">{error}</p>}
        <Button onClick={handleSubmit} loading={isSaving} loadingLabel="Guardando">
          Guardar
        </Button>
      </div>
    </Sheet>
  );
}
