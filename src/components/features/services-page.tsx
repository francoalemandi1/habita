"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Clock,
  Loader2,
  Pause,
  Pencil,
  Play,
  Plus,
  Receipt,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useServices } from "@/hooks/use-services";
import { ServiceDialog } from "@/components/features/service-dialog";
import { Button } from "@/components/ui/button";
import { frequencyLabel } from "@/lib/service-utils";
import { CATEGORY_ICONS, CATEGORY_COLORS } from "@/lib/expense-constants";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { iconSize, spacing, typography } from "@/lib/design-tokens";

import type { SerializedService, MemberOption } from "@/types/expense";
import type { ExpenseCategory, RecurringFrequency } from "@prisma/client";

interface ServicesPageProps {
  allMembers: MemberOption[];
  currentMemberId: string;
}

function daysUntilDue(nextDueDate: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(nextDueDate);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function dueLabel(days: number): { text: string; color: string } {
  if (days < 0) return { text: `Vencido hace ${Math.abs(days)} día${Math.abs(days) !== 1 ? "s" : ""}`, color: "text-red-600 dark:text-red-400" };
  if (days === 0) return { text: "Vence hoy", color: "text-amber-600 dark:text-amber-400" };
  if (days <= 7) return { text: `Vence en ${days} día${days !== 1 ? "s" : ""}`, color: "text-amber-600 dark:text-amber-400" };
  return { text: `Vence en ${days} días`, color: "text-muted-foreground" };
}

function formatAmount(amount: number): string {
  return `$${amount.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

export function ServicesPage({ allMembers, currentMemberId }: ServicesPageProps) {
  const {
    activeServices,
    inactiveServices,
    isLoading,
    generatingIds,
    generate,
    deleteService,
    toggleActive,
    refresh,
  } = useServices(() => {});

  const [editingService, setEditingService] = useState<SerializedService | undefined>();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const overdueCount = activeServices.filter((s) => daysUntilDue(s.nextDueDate) < 0).length;

  if (isLoading) {
    return (
      <>
        <PageHeader backButton icon={Receipt} title="Servicios" subtitle="Gestión de servicios y gastos recurrentes del hogar." />
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  const hasServices = activeServices.length > 0 || inactiveServices.length > 0;

  return (
    <>
      <PageHeader
        backButton
        icon={Receipt}
        title="Servicios"
        subtitle="Gestión de servicios y gastos recurrentes del hogar."
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setShowCreateDialog(true)}>
            <Plus className={iconSize.sm} />
            Nuevo
          </Button>
        }
      />

      {overdueCount > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          <p className="text-sm font-medium text-red-700 dark:text-red-300">
            {overdueCount} servicio{overdueCount !== 1 ? "s" : ""} vencido{overdueCount !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {!hasServices ? (
        <EmptyState icon={Receipt} title="Sin servicios" description="Agregá servicios recurrentes como luz, gas, internet para llevar un control de vencimientos.">
          <Button size="sm" className="mt-2 gap-1.5" onClick={() => setShowCreateDialog(true)}>
            <Plus className={iconSize.sm} />
            Agregar servicio
          </Button>
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {activeServices.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Activos ({activeServices.length})
              </p>
              <div className="space-y-3">
                {activeServices.map((service) => {
                  const days = daysUntilDue(service.nextDueDate);
                  const due = dueLabel(days);
                  const isGenerating = generatingIds.has(service.id);
                  const Icon = CATEGORY_ICONS[service.category as ExpenseCategory];
                  const categoryColor = CATEGORY_COLORS[service.category as ExpenseCategory];

                  return (
                    <div
                      key={service.id}
                      className={cn(
                        "rounded-xl border bg-card p-4 transition-colors",
                        days < 0 && "border-red-200 dark:border-red-900"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                            style={{ backgroundColor: `${categoryColor}20` }}
                          >
                            {Icon && <Icon className="h-4 w-4" style={{ color: categoryColor }} />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{service.title}</p>
                            {service.provider && (
                              <p className="text-xs text-muted-foreground truncate">{service.provider}</p>
                            )}
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                              <span className="text-muted-foreground">
                                {frequencyLabel(service.frequency as RecurringFrequency)}
                              </span>
                              {service.lastAmount != null && (
                                <span className="font-medium">{formatAmount(service.lastAmount)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setEditingService(service)}
                          >
                            <Pencil className={iconSize.xs} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => void toggleActive(service)}
                          >
                            <Pause className={iconSize.xs} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => void deleteService(service.id)}
                          >
                            <Trash2 className={iconSize.xs} />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className={cn("text-xs font-medium", due.color)}>{due.text}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={() => void generate(service.id)}
                          disabled={isGenerating}
                        >
                          {isGenerating ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          Registrar gasto
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {inactiveServices.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Pausados ({inactiveServices.length})
              </p>
              <div className="space-y-3">
                {inactiveServices.map((service) => {
                  const Icon = CATEGORY_ICONS[service.category as ExpenseCategory];
                  return (
                    <div key={service.id} className="rounded-xl border bg-card p-4 opacity-60">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{service.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {frequencyLabel(service.frequency as RecurringFrequency)}
                              {service.lastAmount != null ? ` · ${formatAmount(service.lastAmount)}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => void toggleActive(service)}
                          >
                            <Play className={iconSize.xs} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => void deleteService(service.id)}
                          >
                            <Trash2 className={iconSize.xs} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <ServiceDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        currentMemberId={currentMemberId}
        members={allMembers}
        onSaved={refresh}
      />

      {editingService && (
        <ServiceDialog
          open={!!editingService}
          onOpenChange={(open) => { if (!open) setEditingService(undefined); }}
          currentMemberId={currentMemberId}
          members={allMembers}
          existing={editingService}
          onSaved={refresh}
        />
      )}
    </>
  );
}
