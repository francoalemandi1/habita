"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { CATEGORY_OPTIONS, CATEGORY_ICONS, CATEGORY_COLORS } from "@/lib/expense-constants";
import { Trash2 } from "lucide-react";
import { iconSize } from "@/lib/design-tokens";

import type { ExpenseCategory } from "@prisma/client";
import type { SerializedExpense } from "@/types/expense";
import type { UpdateExpensePayload } from "@/components/features/expenses-view";

interface EditExpenseDialogProps {
  expense: SerializedExpense;
  open: boolean;
  onClose: () => void;
  onExpenseUpdated: (expenseId: string, payload: UpdateExpensePayload) => void;
  onExpenseDeleted: (expenseId: string) => void;
}

export function EditExpenseDialog({
  expense,
  open,
  onClose,
  onExpenseUpdated,
  onExpenseDeleted,
}: EditExpenseDialogProps) {
  const [title, setTitle] = useState(expense.title);
  const [amount, setAmount] = useState(String(expense.amount));
  const [category, setCategory] = useState<ExpenseCategory>(expense.category);
  const [notes, setNotes] = useState(expense.notes ?? "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCategorySelect, setShowCategorySelect] = useState(false);
  const toast = useToast();

  const isCustomSplit = expense.splitType !== "EQUAL";
  const CategoryIcon = CATEGORY_ICONS[category];
  const categoryColorClasses = CATEGORY_COLORS[category];

  function handleSave() {
    const parsedAmount = parseFloat(amount);
    if (!title.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Error", "Completa descripcion y monto");
      return;
    }

    const payload: UpdateExpensePayload = {};

    if (title.trim() !== expense.title) payload.title = title.trim();
    if (parsedAmount !== expense.amount) payload.amount = parsedAmount;
    if (category !== expense.category) payload.category = category;
    const trimmedNotes = notes.trim() || null;
    if (trimmedNotes !== expense.notes) payload.notes = trimmedNotes;

    // Nothing changed
    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }

    onExpenseUpdated(expense.id, payload);
    toast.success("Gasto actualizado");
    onClose();
  }

  function handleDelete() {
    onExpenseDeleted(expense.id);
    toast.success("Gasto eliminado");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar gasto</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">Descripcion</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-amount">
              Monto
              {isCustomSplit && (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  (no editable con division custom)
                </span>
              )}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-medium text-muted-foreground">
                $
              </span>
              <Input
                id="edit-amount"
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
                className="pl-8 text-lg font-medium"
                disabled={isCustomSplit}
              />
            </div>
          </div>

          {/* Category chip + grid */}
          <div className="space-y-2">
            <Label>Categoria</Label>
            <div>
              <button
                type="button"
                onClick={() => setShowCategorySelect(!showCategorySelect)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  category !== "OTHER"
                    ? "border-primary/30 bg-primary/5 text-foreground"
                    : "border-input hover:bg-muted"
                }`}
              >
                <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${categoryColorClasses}`}>
                  <CategoryIcon className="h-3 w-3" />
                </span>
                {CATEGORY_OPTIONS.find((o) => o.value === category)?.label}
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
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-notes">Notas</Label>
            <textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Detalle adicional..."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Splits info (read-only) */}
          <div className="rounded-lg border p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Division</p>
            <div className="space-y-1">
              {expense.splits.map((split) => (
                <div key={split.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{split.member.name}</span>
                  <span className={`font-medium ${split.settled ? "text-muted-foreground line-through" : ""}`}>
                    ${split.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <div className="flex w-full gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSave} className="flex-1">
              Guardar
            </Button>
          </div>

          {/* Delete section */}
          {!showDeleteConfirm ? (
            <Button
              variant="ghost"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full text-red-500 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className={`mr-2 ${iconSize.sm}`} />
              Eliminar gasto
            </Button>
          ) : (
            <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
              <DialogDescription className="text-sm text-red-600">
                Esta accion no se puede deshacer. Se eliminara el gasto y todas sus divisiones.
              </DialogDescription>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1"
                >
                  No
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  className="flex-1"
                >
                  Si, eliminar
                </Button>
              </div>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
