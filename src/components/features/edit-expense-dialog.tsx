"use client";

import { useState } from "react";
import { Sheet } from "@/components/ds/sheet";
import { Button } from "@/components/ds/button";
import { TextField } from "@/components/ds/text-field";
import { FilterChip } from "@/components/ds/chip";
import { CATEGORY_OPTIONS, CATEGORY_LABELS } from "@/lib/expense-constants";

import type { ExpenseCategory } from "@prisma/client";
import type { SerializedExpense, UpdateExpensePayload } from "@/types/expense";

interface EditExpenseDialogProps {
  expense: SerializedExpense;
  open: boolean;
  onClose: () => void;
  onExpenseUpdated: (expenseId: string, payload: UpdateExpensePayload) => void;
}

/** §7 pattern B — Edit expense Sheet; deletion lives in DeleteExpenseButton on the detail screen. */
export function EditExpenseDialog({ expense, open, onClose, onExpenseUpdated }: EditExpenseDialogProps): React.JSX.Element {
  const [title, setTitle] = useState(expense.title);
  const [amount, setAmount] = useState(String(expense.amount));
  const [category, setCategory] = useState<ExpenseCategory>(expense.category);
  const [notes, setNotes] = useState(expense.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const isCustomSplit = expense.splitType !== "EQUAL";

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) onClose();
  }

  function handleSave(): void {
    const parsedAmount = parseFloat(amount);
    if (!title.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Completá descripción y monto.");
      return;
    }
    setError(null);

    const payload: UpdateExpensePayload = {};
    if (title.trim() !== expense.title) payload.title = title.trim();
    if (parsedAmount !== expense.amount) payload.amount = parsedAmount;
    if (category !== expense.category) payload.category = category;
    const trimmedNotes = notes.trim() || null;
    if (trimmedNotes !== expense.notes) payload.notes = trimmedNotes;

    if (Object.keys(payload).length > 0) {
      onExpenseUpdated(expense.id, payload);
    }
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange} title="Editar gasto">
      <div className="flex flex-col gap-5">
        <TextField label="Descripción" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />

        <TextField
          label={isCustomSplit ? "Monto (no editable con división custom)" : "Monto"}
          type="number"
          min={0}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={isCustomSplit}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-ink">Categoría</span>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_OPTIONS.map((opt) => (
              <FilterChip key={opt.value} active={category === opt.value} onClick={() => setCategory(opt.value)}>
                {CATEGORY_LABELS[opt.value]}
              </FilterChip>
            ))}
          </div>
        </div>

        <TextField label="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-ink">División</span>
          {expense.splits.map((split) => (
            <div key={split.id} className="flex items-center justify-between text-[14px]">
              <span className="truncate text-ink">{split.member.name}</span>
              <span className={split.settled ? "text-ink-3 line-through" : "font-medium text-ink"}>
                ${split.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>

        {error && <p className="text-[13px] text-ladrillo-text">{error}</p>}

        <Button onClick={handleSave}>Guardar</Button>
      </div>
    </Sheet>
  );
}
