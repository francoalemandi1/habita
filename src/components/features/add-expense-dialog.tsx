"use client";

import { useState, useRef, useEffect } from "react";
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
import { getMemberColor, getInitial } from "@/lib/member-utils";
import {
  CATEGORY_OPTIONS,
  CATEGORY_ICONS,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  inferCategory,
} from "@/lib/expense-constants";
import { Plus, ChevronDown, ChevronUp, Check } from "lucide-react";
import { iconSize } from "@/lib/design-tokens";

import type { ExpenseCategory, SplitType } from "@prisma/client";
import type { MemberOption } from "@/types/expense";
import type { CreateExpensePayload } from "@/components/features/expenses-view";

interface AddExpenseDialogProps {
  members: MemberOption[];
  currentMemberId: string;
  onExpenseCreated: (payload: CreateExpensePayload) => void;
}

export function AddExpenseDialog({ members, currentMemberId, onExpenseCreated }: AddExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("OTHER");
  const [categoryAutoSet, setCategoryAutoSet] = useState(false);
  const [paidById, setPaidById] = useState(currentMemberId);
  const [splitType, setSplitType] = useState<SplitType>("EQUAL");
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [excludedMembers, setExcludedMembers] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPayerSelect, setShowPayerSelect] = useState(false);
  const [showCategorySelect, setShowCategorySelect] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const selectedPayer = members.find((m) => m.id === paidById);
  const payerColor = getMemberColor(paidById, members);
  const payerInitial = getInitial(selectedPayer?.name ?? "?");

  const CategoryIcon = CATEGORY_ICONS[category];
  const categoryColor = CATEGORY_COLORS[category];

  const includedMembers = members.filter((m) => !excludedMembers.has(m.id));

  function resetForm() {
    setTitle("");
    setAmount("");
    setCategory("OTHER");
    setCategoryAutoSet(false);
    setPaidById(currentMemberId);
    setSplitType("EQUAL");
    setCustomSplits({});
    setExcludedMembers(new Set());
    setNotes("");
    setShowAdvanced(false);
    setShowPayerSelect(false);
    setShowCategorySelect(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) resetForm();
  }

  function handleTitleChange(newTitle: string) {
    setTitle(newTitle);

    // Auto-detect category from title (only if user hasn't manually picked one)
    const inferred = inferCategory(newTitle);
    if (inferred) {
      setCategory(inferred);
      setCategoryAutoSet(true);
    } else if (categoryAutoSet) {
      // Reset to OTHER only if the previous value was auto-set
      setCategory("OTHER");
    }
  }

  function handleCategorySelect(cat: ExpenseCategory) {
    setCategory(cat);
    setCategoryAutoSet(false);
    setShowCategorySelect(false);
  }

  function toggleExcludedMember(memberId: string) {
    // Don't allow excluding the payer
    if (memberId === paidById) return;
    // Don't allow excluding everyone except payer
    const newExcluded = new Set(excludedMembers);
    if (newExcluded.has(memberId)) {
      newExcluded.delete(memberId);
    } else {
      // Ensure at least 2 members remain (payer + 1 other)
      const remainingAfterExclude = members.filter(
        (m) => m.id !== memberId && !newExcluded.has(m.id),
      );
      if (remainingAfterExclude.length < 2) return;
      newExcluded.add(memberId);
    }
    setExcludedMembers(newExcluded);
  }

  // Auto-focus amount field when dialog opens
  useEffect(() => {
    if (open && amountRef.current) {
      const timer = setTimeout(() => amountRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [open]);

  function handleSubmit() {
    const parsedAmount = parseFloat(amount);
    if (!title.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Error", "Completa descripcion y monto");
      return;
    }

    const splits =
      splitType === "CUSTOM"
        ? includedMembers.map((m) => ({
            memberId: m.id,
            amount: parseFloat(customSplits[m.id] ?? "0") || 0,
          }))
        : splitType === "EQUAL" && excludedMembers.size > 0
          ? includedMembers.map((m) => ({ memberId: m.id }))
          : undefined;

    // When members are excluded from EQUAL split, use CUSTOM with equal amounts
    const effectiveSplitType =
      splitType === "EQUAL" && excludedMembers.size > 0 ? "CUSTOM" as SplitType : splitType;

    const equalSplits =
      effectiveSplitType === "CUSTOM" && splitType === "EQUAL" && excludedMembers.size > 0
        ? includedMembers.map((m) => ({
            memberId: m.id,
            amount: Math.round((parsedAmount / includedMembers.length) * 100) / 100,
          }))
        : undefined;

    // Close dialog immediately and delegate to optimistic handler
    onExpenseCreated({
      title: title.trim(),
      amount: parsedAmount,
      category,
      paidById,
      splitType: effectiveSplitType,
      splits: equalSplits ?? splits,
      notes: notes.trim() || undefined,
    });

    toast.success("Gasto registrado");
    handleOpenChange(false);
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
            <Input
              placeholder="Descripcion (ej: Supermercado)"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              maxLength={100}
            />

            {/* Amount */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-medium text-muted-foreground">
                $
              </span>
              <Input
                ref={amountRef}
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

            {/* Chips row: Category + Payer + Split type */}
            <div className="flex flex-wrap gap-2">
              {/* Category chip */}
              <button
                type="button"
                onClick={() => { setShowCategorySelect(!showCategorySelect); setShowPayerSelect(false); }}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  category !== "OTHER"
                    ? "border-primary/30 bg-primary/5 text-foreground"
                    : "border-input hover:bg-muted"
                }`}
              >
                <CategoryIcon className="h-3.5 w-3.5" />
                <span>{CATEGORY_LABELS[category]}</span>
              </button>

              {/* Payer chip */}
              <button
                type="button"
                onClick={() => { setShowPayerSelect(!showPayerSelect); setShowCategorySelect(false); }}
                className="inline-flex items-center gap-1.5 rounded-full border border-input px-3 py-1.5 text-sm transition-colors hover:bg-muted"
              >
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: payerColor }}
                >
                  {payerInitial}
                </span>
                <span>
                  {paidById === currentMemberId ? "Vos pagaste" : `${selectedPayer?.name} pago`}
                </span>
              </button>

              {/* Split type chip */}
              <button
                type="button"
                onClick={() => setSplitType(splitType === "EQUAL" ? "CUSTOM" : "EQUAL")}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  splitType === "EQUAL"
                    ? "border-input hover:bg-muted"
                    : "border-primary bg-primary/10 text-primary"
                }`}
              >
                <span className="text-xs">÷</span>
                {splitType === "EQUAL" ? "En partes iguales" : "Montos custom"}
              </button>
            </div>

            {/* Category grid (shown on chip tap) */}
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
                      onClick={() => handleCategorySelect(opt.value)}
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

            {/* Payer select (inline, shown on chip tap) */}
            {showPayerSelect && (
              <div className="space-y-1 rounded-lg border p-2">
                {members.map((m) => {
                  const isSelected = m.id === paidById;
                  const color = getMemberColor(m.id, members);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => { setPaidById(m.id); setShowPayerSelect(false); }}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                        isSelected ? "bg-primary/10 font-medium text-primary" : "hover:bg-muted"
                      }`}
                    >
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: color }}
                      >
                        {getInitial(m.name)}
                      </span>
                      {m.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Member selection for EQUAL split (exclude members) */}
            {splitType === "EQUAL" && members.length > 2 && (
              <div className="space-y-1.5 rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Dividir entre</p>
                <div className="flex flex-wrap gap-2">
                  {members.map((m) => {
                    const isIncluded = !excludedMembers.has(m.id);
                    const isPayer = m.id === paidById;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleExcludedMember(m.id)}
                        disabled={isPayer}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                          isIncluded
                            ? "border-primary/30 bg-primary/10 text-foreground"
                            : "border-input text-muted-foreground hover:bg-muted"
                        } ${isPayer ? "cursor-default" : ""}`}
                      >
                        {isIncluded && <Check className="h-3 w-3" />}
                        {m.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom splits (shown when CUSTOM selected) */}
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

            {/* Advanced options toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              {showAdvanced ? (
                <ChevronUp className={iconSize.xs} />
              ) : (
                <ChevronDown className={iconSize.xs} />
              )}
              Notas
            </button>

            {/* Notes (advanced) */}
            {showAdvanced && (
              <div className="space-y-1.5">
                <Label htmlFor="expense-notes">Notas</Label>
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
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
