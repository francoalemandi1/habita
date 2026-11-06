import { useState } from "react";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { splitEvenlyExact } from "@habita/domain";
import { DEFAULT_TASK_WEIGHT, dueDateToIsoStartOfDay } from "@/lib/anotar-draft-logic";
import type { AnotarSaveInput } from "./use-anotar-save";
import type { ClassicExpenseState } from "@/components/features/anotar/anotar-classic-expense-fields";
import type { ClassicTaskState } from "@/components/features/anotar/anotar-classic-task-fields";
import type { ClassicItemState } from "@/components/features/anotar/anotar-classic-item-fields";
import type { AnotarKind } from "@/components/features/anotar/anotar-unknown";

interface UseAnotarClassicSaveArgs {
  onSave: (input: AnotarSaveInput) => Promise<void>;
  onSaved: () => void;
}

/** Validates and submits the classic (manual) Anotar form for whichever kind is selected. */
export function useAnotarClassicSave({ onSave, onSaved }: UseAnotarClassicSaveArgs) {
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (kind: AnotarKind, expense: ClassicExpenseState, task: ClassicTaskState, item: ClassicItemState) => {
    setError(null);
    try {
      if (kind === "expense") {
        const amount = Number(expense.amount.replace(",", "."));
        if (!expense.title.trim() || Number.isNaN(amount) || amount <= 0) {
          setError("Completá descripción y monto válido.");
          return;
        }
        if (!expense.payerId) {
          setError("Esperá a que carguen los miembros del hogar.");
          return;
        }
        const dateIso = dueDateToIsoStartOfDay(expense.date);
        await onSave({
          kind: "expense",
          payload: {
            title: expense.title.trim(),
            amount,
            category: expense.category,
            paidById: expense.payerId,
            splitType: "CUSTOM",
            splits: splitEvenlyExact(amount, expense.participantIds),
            date: dateIso ?? undefined,
          },
        });
      } else if (kind === "task") {
        if (task.name.trim().length < 2) {
          setError("El nombre de la tarea es muy corto.");
          return;
        }
        const dueDateIso = dueDateToIsoStartOfDay(task.date);
        if (!dueDateIso) {
          setError("Usá fecha con formato YYYY-MM-DD.");
          return;
        }
        await onSave({
          kind: "task",
          name: task.name.trim(),
          frequency: "WEEKLY",
          weight: DEFAULT_TASK_WEIGHT,
          dueDateIso,
          assigneeMemberId: task.assigneeId,
        });
      } else {
        if (!item.name.trim()) {
          setError("Escribí el nombre del ítem.");
          return;
        }
        await onSave({ kind: "item", items: [{ name: item.name.trim(), quantity: item.quantity }] });
      }
      onSaved();
    } catch (saveError) {
      setError(getMobileErrorMessage(saveError));
    }
  };

  return { error, handleSave };
}
