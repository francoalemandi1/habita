"use client";

import { useState } from "react";
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
import {
  CATEGORY_OPTIONS,
  CATEGORY_ICONS,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
} from "@/lib/expense-constants";
import { frequencyLabel } from "@/lib/recurring-expense-utils";
import { Loader2 } from "lucide-react";
import { iconSize } from "@/lib/design-tokens";
import { apiFetch } from "@/lib/api-client";

import type { ExpenseCategory, SplitType, RecurringFrequency } from "@prisma/client";
import type { MemberOption, SerializedRecurringExpense } from "@/types/expense";

const FREQUENCY_OPTIONS: Array<{ value: RecurringFrequency; label: string }> = [
  { value: "WEEKLY", label: "Semanal" },
  { value: "MONTHLY", label: "Mensual" },
  { value: "BIMONTHLY", label: "Bimestral" },
  { value: "QUARTERLY", label: "Trimestral" },
  { value: "YEARLY", label: "Anual" },
];

interface RecurringExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: MemberOption[];
  currentMemberId: string;
  onSaved: () => void;
  /** If provided, editing this template. Otherwise creating new. */
  existing?: SerializedRecurringExpense;
}

export function RecurringExpenseDialog({
  open,
  onOpenChange,
  members,
  currentMemberId,
  onSaved,
  existing,
}: RecurringExpenseDialogProps) {
  const toast = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const [title, setTitle] = useState(existing?.title ?? "");
  const [amount, setAmount] = useState(existing?.amount?.toString() ?? "");
  const [category, setCategory] = useState<ExpenseCategory>(existing?.category ?? "OTHER");
  const [frequency, setFrequency] = useState<RecurringFrequency>(
    (existing?.frequency as RecurringFrequency) ?? "MONTHLY",
  );
  const [dayOfMonth, setDayOfMonth] = useState(existing?.dayOfMonth?.toString() ?? "1");
  const [paidById, setPaidById] = useState(existing?.paidById ?? currentMemberId);
  const [autoGenerate, setAutoGenerate] = useState(existing?.autoGenerate ?? false);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [showCategorySelect, setShowCategorySelect] = useState(false);

  function resetForm() {
    setTitle("");
    setAmount("");
    setCategory("OTHER");
    setFrequency("MONTHLY");
    setDayOfMonth("1");
    setPaidById(currentMemberId);
    setAutoGenerate(false);
    setNotes("");
    setShowCategorySelect(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) resetForm();
  }

  async function handleSubmit() {
    const parsedAmount = parseFloat(amount);
    if (!title.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Error", "Completá título y monto");
      return;
    }

    setIsSaving(true);

    // Calculate next due date based on frequency
    const now = new Date();
    const nextDue = new Date(now);
    const parsedDay = parseInt(dayOfMonth, 10);

    if (frequency === "WEEKLY") {
      nextDue.setDate(nextDue.getDate() + 7);
    } else {
      // For monthly+ frequencies, set to the selected day
      nextDue.setMonth(nextDue.getMonth() + 1);
      if (!isNaN(parsedDay) && parsedDay >= 1 && parsedDay <= 28) {
        nextDue.setDate(parsedDay);
      }
    }

    try {
      if (existing) {
        await apiFetch(`/api/expenses/recurring/${existing.id}`, {
          method: "PATCH",
          body: {
            title: title.trim(),
            amount: parsedAmount,
            category,
            frequency,
            dayOfMonth: frequency !== "WEEKLY" ? (parsedDay || 1) : null,
            paidById,
            autoGenerate,
            notes: notes.trim() || null,
          },
        });
        toast.success("Gasto recurrente actualizado");
      } else {
        await apiFetch("/api/expenses/recurring", {
          method: "POST",
          body: {
            title: title.trim(),
            amount: parsedAmount,
            category,
            frequency,
            dayOfMonth: frequency !== "WEEKLY" ? (parsedDay || 1) : null,
            paidById,
            autoGenerate,
            notes: notes.trim() || null,
            splitType: "EQUAL" as SplitType,
            nextDueDate: nextDue.toISOString(),
          },
        });
        toast.success("Gasto recurrente creado");
      }

      onSaved();
      handleOpenChange(false);
    } catch {
      toast.error("Error", "No se pudo guardar el gasto recurrente");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? "Editar gasto recurrente" : "Nuevo gasto recurrente"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Input
            placeholder="Título (ej: Alquiler, Netflix)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
          />

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-medium text-muted-foreground">
              $
            </span>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
              className="pl-8 text-lg font-medium"
            />
          </div>

          {/* Category chip */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowCategorySelect(!showCategorySelect)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                category !== "OTHER"
                  ? "border-primary/30 bg-primary/5 text-foreground"
                  : "border-input hover:bg-muted"
              }`}
            >
              {(() => { const Icon = CATEGORY_ICONS[category]; return <Icon className="h-3.5 w-3.5" />; })()}
              <span>{CATEGORY_LABELS[category]}</span>
            </button>
          </div>

          {showCategorySelect && (
            <div className="grid grid-cols-2 gap-1.5 rounded-lg border p-2">
              {CATEGORY_OPTIONS.map((opt) => {
                const Icon = CATEGORY_ICONS[opt.value];
                const isSelected = opt.value === category;
                const colorClasses = CATEGORY_COLORS[opt.value];
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setCategory(opt.value); setShowCategorySelect(false); }}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                      isSelected ? "bg-primary/10 font-medium text-primary" : "hover:bg-muted"
                    }`}
                  >
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${colorClasses}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Frequency */}
          <div className="space-y-1.5">
            <Label>Frecuencia</Label>
            <div className="flex flex-wrap gap-1.5">
              {FREQUENCY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFrequency(opt.value)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    frequency === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Day of month (for non-weekly) */}
          {frequency !== "WEEKLY" && (
            <div className="space-y-1.5">
              <Label htmlFor="day-of-month">Día del mes (1-28)</Label>
              <Input
                id="day-of-month"
                type="number"
                inputMode="numeric"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
                min="1"
                max="28"
                className="w-20"
              />
            </div>
          )}

          {/* Payer */}
          {members.length > 1 && (
            <div className="space-y-1.5">
              <Label>¿Quién paga?</Label>
              <div className="flex flex-wrap gap-1.5">
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaidById(m.id)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      paidById === m.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input hover:bg-muted"
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Auto-generate toggle */}
          <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoGenerate}
              onChange={(e) => setAutoGenerate(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <div>
              <p className="text-sm font-medium">Registrar automáticamente</p>
              <p className="text-xs text-muted-foreground">
                Genera el gasto cada {frequencyLabel(frequency).toLowerCase()} sin intervención
              </p>
            </div>
          </label>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="recurring-notes">Notas (opcional)</Label>
            <textarea
              id="recurring-notes"
              placeholder="Detalle adicional..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className={`mr-2 ${iconSize.md} animate-spin`} />
                Guardando...
              </>
            ) : (
              "Guardar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
