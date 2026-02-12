"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { apiFetch } from "@/lib/api-client";
import { Plus, Loader2 } from "lucide-react";
import { iconSize } from "@/lib/design-tokens";

import type { ExpenseCategory, SplitType } from "@prisma/client";

interface MemberOption {
  id: string;
  name: string;
}

interface AddExpenseDialogProps {
  members: MemberOption[];
  currentMemberId: string;
}

const CATEGORY_OPTIONS: Array<{ value: ExpenseCategory; label: string }> = [
  { value: "GROCERIES", label: "Supermercado" },
  { value: "UTILITIES", label: "Servicios" },
  { value: "RENT", label: "Alquiler" },
  { value: "FOOD", label: "Comida" },
  { value: "TRANSPORT", label: "Transporte" },
  { value: "HEALTH", label: "Salud" },
  { value: "ENTERTAINMENT", label: "Entretenimiento" },
  { value: "EDUCATION", label: "Educación" },
  { value: "HOME", label: "Hogar" },
  { value: "OTHER", label: "Otros" },
];

export function AddExpenseDialog({ members, currentMemberId }: AddExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("OTHER");
  const [paidById, setPaidById] = useState(currentMemberId);
  const [splitType, setSplitType] = useState<SplitType>("EQUAL");
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const router = useRouter();
  const toast = useToast();

  function resetForm() {
    setTitle("");
    setAmount("");
    setCategory("OTHER");
    setPaidById(currentMemberId);
    setSplitType("EQUAL");
    setCustomSplits({});
    setNotes("");
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) resetForm();
  }

  async function handleSubmit() {
    const parsedAmount = parseFloat(amount);
    if (!title.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Error", "Completá título y monto");
      return;
    }

    setIsSubmitting(true);
    try {
      const splits =
        splitType === "CUSTOM"
          ? members.map((m) => ({
              memberId: m.id,
              amount: parseFloat(customSplits[m.id] ?? "0") || 0,
            }))
          : undefined;

      await apiFetch("/api/expenses", {
        method: "POST",
        body: {
          title: title.trim(),
          amount: parsedAmount,
          category,
          paidById,
          splitType,
          splits,
          notes: notes.trim() || undefined,
        },
      });

      toast.success("Gasto registrado");
      handleOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Error", "No se pudo registrar el gasto");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className={iconSize.sm} />
        Nuevo gasto
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar gasto</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="expense-title">Descripción</Label>
              <Input
                id="expense-title"
                placeholder="Ej: Supermercado semanal"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="expense-amount">Monto ($)</Label>
              <Input
                id="expense-amount"
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="expense-category">Categoría</Label>
              <select
                id="expense-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Paid by */}
            <div className="space-y-1.5">
              <Label htmlFor="expense-paidby">¿Quién pagó?</Label>
              <select
                id="expense-paidby"
                value={paidById}
                onChange={(e) => setPaidById(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Split type */}
            <div className="space-y-1.5">
              <Label>División</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSplitType("EQUAL")}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                    splitType === "EQUAL"
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "border-input hover:bg-muted"
                  }`}
                >
                  Partes iguales
                </button>
                <button
                  type="button"
                  onClick={() => setSplitType("CUSTOM")}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                    splitType === "CUSTOM"
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "border-input hover:bg-muted"
                  }`}
                >
                  Montos custom
                </button>
              </div>
            </div>

            {/* Custom splits */}
            {splitType === "CUSTOM" && (
              <div className="space-y-2 rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Monto por miembro</p>
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm">{m.name}</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={customSplits[m.id] ?? ""}
                      onChange={(e) =>
                        setCustomSplits((prev) => ({ ...prev, [m.id]: e.target.value }))
                      }
                      className="w-28"
                      min="0"
                      step="0.01"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="expense-notes">Notas (opcional)</Label>
              <textarea
                id="expense-notes"
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
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
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
    </>
  );
}
