"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CATEGORY_ICONS, CATEGORY_COLORS } from "@/lib/expense-constants";
import { frequencyLabel } from "@/lib/service-utils";
import { ServiceDialog } from "@/components/features/service-dialog";
import { Plus, Pause, Play, Pencil, Trash2 } from "lucide-react";
import { iconSize } from "@/lib/design-tokens";

import type { ExpenseCategory, RecurringFrequency } from "@prisma/client";
import type { SerializedService, MemberOption } from "@/types/expense";

interface ServicesManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeServices: SerializedService[];
  inactiveServices: SerializedService[];
  currentMemberId: string;
  allMembers: MemberOption[];
  onToggleActive: (service: SerializedService) => void;
  onDelete: (serviceId: string) => void;
  onRefresh: () => void;
}

export function ServicesManagement({
  open,
  onOpenChange,
  activeServices,
  inactiveServices,
  currentMemberId,
  allMembers,
  onToggleActive,
  onDelete,
  onRefresh,
}: ServicesManagementProps) {
  const [editingService, setEditingService] = useState<SerializedService | undefined>();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Servicios</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className={iconSize.sm} />
              Nuevo servicio
            </Button>

            {/* Active services */}
            {activeServices.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Activos ({activeServices.length})
                </p>
                <div className="space-y-2">
                  {activeServices.map((service) => (
                    <ServiceRow
                      key={service.id}
                      service={service}
                      onEdit={() => setEditingService(service)}
                      onToggleActive={() => onToggleActive(service)}
                      onDelete={() => onDelete(service.id)}
                      toggleLabel="Pausar"
                      toggleIcon={<Pause className={iconSize.xs} />}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Inactive services */}
            {inactiveServices.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Pausados ({inactiveServices.length})
                </p>
                <div className="space-y-2">
                  {inactiveServices.map((service) => (
                    <ServiceRow
                      key={service.id}
                      service={service}
                      dimmed
                      onEdit={() => setEditingService(service)}
                      onToggleActive={() => onToggleActive(service)}
                      onDelete={() => onDelete(service.id)}
                      toggleLabel="Activar"
                      toggleIcon={<Play className={iconSize.xs} />}
                    />
                  ))}
                </div>
              </div>
            )}

            {activeServices.length === 0 && inactiveServices.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No hay servicios configurados
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ServiceDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        members={allMembers}
        currentMemberId={currentMemberId}
        onSaved={() => {
          onRefresh();
          setShowCreateDialog(false);
        }}
      />

      {editingService && (
        <ServiceDialog
          open={!!editingService}
          onOpenChange={(isOpen) => { if (!isOpen) setEditingService(undefined); }}
          members={allMembers}
          currentMemberId={currentMemberId}
          onSaved={() => {
            onRefresh();
            setEditingService(undefined);
          }}
          existing={editingService}
        />
      )}
    </>
  );
}

function ServiceRow({
  service,
  dimmed,
  onEdit,
  onToggleActive,
  onDelete,
  toggleLabel,
  toggleIcon,
}: {
  service: SerializedService;
  dimmed?: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  toggleLabel: string;
  toggleIcon: React.ReactNode;
}) {
  const Icon = CATEGORY_ICONS[service.category as ExpenseCategory];
  const colorClass = CATEGORY_COLORS[service.category as ExpenseCategory];

  const dueDate = new Date(service.nextDueDate);
  const now = new Date();
  const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isPastDue = dueDate <= now;

  const dueLabel = isPastDue
    ? "Vencido"
    : daysUntilDue === 0
      ? "Hoy"
      : daysUntilDue === 1
        ? "Mañana"
        : `${daysUntilDue}d`;

  const amountLabel = service.lastAmount != null
    ? `$${service.lastAmount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
    : "Sin monto";

  return (
    <div className={`flex items-center gap-3 rounded-lg border p-2.5 ${dimmed ? "opacity-60" : ""}`}>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{service.title}</p>
        <p className="text-xs text-muted-foreground">
          {amountLabel}
          {" · "}
          {frequencyLabel(service.frequency as RecurringFrequency)}
          {!dimmed && (
            <span className={`ml-1 ${isPastDue ? "font-medium text-amber-600 dark:text-amber-400" : ""}`}>
              {" · "}{dueLabel}
            </span>
          )}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit}>
          <Pencil className={iconSize.xs} />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onToggleActive}>
          {toggleIcon}
          <span className="sr-only">{toggleLabel}</span>
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2 className={iconSize.xs} />
        </Button>
      </div>
    </div>
  );
}
