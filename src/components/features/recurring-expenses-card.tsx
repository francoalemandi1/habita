"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";
import { frequencyLabel } from "@/lib/recurring-expense-utils";
import { CATEGORY_ICONS, CATEGORY_COLORS } from "@/lib/expense-constants";
import { RecurringExpenseDialog } from "@/components/features/recurring-expense-dialog";
import { Loader2, Repeat, Plus, ChevronDown, ChevronUp, Settings } from "lucide-react";
import { iconSize } from "@/lib/design-tokens";

import type { SerializedRecurringExpense, MemberOption } from "@/types/expense";
import type { ExpenseCategory } from "@prisma/client";

interface RecurringExpensesCardProps {
  currentMemberId: string;
  allMembers: MemberOption[];
  onExpenseGenerated: () => void;
}

export function RecurringExpensesCard({
  currentMemberId,
  allMembers,
  onExpenseGenerated,
}: RecurringExpensesCardProps) {
  const [templates, setTemplates] = useState<SerializedRecurringExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SerializedRecurringExpense | undefined>();
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const fetchTemplates = useCallback(async () => {
    try {
      const result = await apiFetch<SerializedRecurringExpense[]>("/api/expenses/recurring");
      setTemplates(result);
    } catch {
      // Silently fail — card just won't show
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  async function handleGenerate(templateId: string) {
    setGeneratingIds((prev) => new Set(prev).add(templateId));

    try {
      await apiFetch(`/api/expenses/recurring/${templateId}/generate`, { method: "POST" });
      toast.success("Gasto registrado");
      await fetchTemplates();
      onExpenseGenerated();
      router.refresh();
    } catch {
      toast.error("Error", "No se pudo registrar el gasto");
    } finally {
      setGeneratingIds((prev) => {
        const next = new Set(prev);
        next.delete(templateId);
        return next;
      });
    }
  }

  async function handleDelete(templateId: string) {
    try {
      await apiFetch(`/api/expenses/recurring/${templateId}`, { method: "DELETE" });
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      toast.success("Gasto recurrente eliminado");
    } catch {
      toast.error("Error", "No se pudo eliminar");
    }
  }

  async function handleToggleActive(template: SerializedRecurringExpense) {
    try {
      await apiFetch(`/api/expenses/recurring/${template.id}`, {
        method: "PATCH",
        body: { isActive: !template.isActive },
      });
      await fetchTemplates();
    } catch {
      toast.error("Error", "No se pudo actualizar");
    }
  }

  if (isLoading) return null;

  const activeTemplates = templates.filter((t) => t.isActive);
  const inactiveTemplates = templates.filter((t) => !t.isActive);

  // Get upcoming templates (due within 7 days)
  const now = new Date();
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const upcomingTemplates = activeTemplates.filter((t) => {
    const dueDate = new Date(t.nextDueDate);
    return dueDate <= sevenDaysFromNow;
  });

  // Show the card if there are templates or always show the "add" button
  const displayTemplates = expanded ? activeTemplates : upcomingTemplates;

  return (
    <>
      <Card className="border-primary/10">
        <CardContent className="py-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Repeat className={`${iconSize.md} text-primary`} />
              <h3 className="font-semibold text-sm">Gastos recurrentes</h3>
              {activeTemplates.length > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {activeTemplates.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {activeTemplates.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? <ChevronUp className={iconSize.sm} /> : <ChevronDown className={iconSize.sm} />}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className={iconSize.xs} />
                Nuevo
              </Button>
            </div>
          </div>

          {displayTemplates.length === 0 && !expanded ? (
            <p className="text-xs text-muted-foreground">
              {activeTemplates.length === 0
                ? "Creá gastos recurrentes para registrarlos con un tap"
                : "No hay gastos próximos esta semana"}
            </p>
          ) : (
            <div className="space-y-2">
              {displayTemplates.map((template) => {
                const Icon = CATEGORY_ICONS[template.category as ExpenseCategory];
                const colorClass = CATEGORY_COLORS[template.category as ExpenseCategory];
                const isGenerating = generatingIds.has(template.id);
                const dueDate = new Date(template.nextDueDate);
                const isPastDue = dueDate <= now;
                const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                return (
                  <div
                    key={template.id}
                    className="flex items-center gap-3 rounded-lg border p-2.5"
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{template.title}</p>
                      <p className="text-xs text-muted-foreground">
                        ${template.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                        {" · "}
                        {frequencyLabel(template.frequency as "WEEKLY" | "MONTHLY" | "BIMONTHLY" | "QUARTERLY" | "YEARLY")}
                        {template.autoGenerate && " · Auto"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-xs ${isPastDue ? "font-medium text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                        {isPastDue
                          ? "Vencido"
                          : daysUntilDue === 0
                            ? "Hoy"
                            : daysUntilDue === 1
                              ? "Mañana"
                              : `${daysUntilDue}d`}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleGenerate(template.id)}
                        disabled={isGenerating}
                      >
                        {isGenerating ? (
                          <Loader2 className={`${iconSize.sm} animate-spin`} />
                        ) : (
                          "Registrar"
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Management section when expanded */}
          {expanded && (
            <div className="mt-3 border-t pt-3">
              {/* Inactive templates */}
              {inactiveTemplates.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Inactivos</p>
                  {inactiveTemplates.map((template) => (
                    <div key={template.id} className="flex items-center justify-between rounded-lg border border-dashed p-2.5 opacity-60">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{template.title}</p>
                        <p className="text-xs text-muted-foreground">
                          ${template.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleToggleActive(template)}
                      >
                        Activar
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Edit/delete actions */}
              {activeTemplates.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {activeTemplates.map((t) => (
                    <div key={t.id} className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 gap-1 px-2 text-xs text-muted-foreground"
                        onClick={() => setEditingTemplate(t)}
                      >
                        <Settings className={iconSize.xs} />
                        {t.title}
                      </Button>
                      <button
                        onClick={() => handleToggleActive(t)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Pausar
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <RecurringExpenseDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        members={allMembers}
        currentMemberId={currentMemberId}
        onSaved={fetchTemplates}
      />

      {editingTemplate && (
        <RecurringExpenseDialog
          open={!!editingTemplate}
          onOpenChange={(open) => { if (!open) setEditingTemplate(undefined); }}
          members={allMembers}
          currentMemberId={currentMemberId}
          onSaved={() => { fetchTemplates(); setEditingTemplate(undefined); }}
          existing={editingTemplate}
        />
      )}
    </>
  );
}
