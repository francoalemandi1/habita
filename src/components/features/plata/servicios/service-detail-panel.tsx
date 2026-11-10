"use client";

import { useState } from "react";
import { Clock, Loader2, Pause, Pencil, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ds/button";
import { CATEGORY_ICONS } from "@/lib/expense-constants";
import { frequencyLabel } from "@/lib/service-utils";
import { toRecurringFrequency } from "@/lib/plata-service-enums";
import { useDeleteService, useGenerateServiceExpense, useToggleServiceActive } from "@/hooks/use-services";
import { dueDateInfo, DUE_DATE_TONE_CLASS } from "./servicios-logic";
import { cn } from "@/lib/utils";

import type { SerializedService } from "@/types/expense";

interface ServiceDetailPanelProps {
  service: SerializedService;
  onEdit: () => void;
  onDeleted: () => void;
}

function formatAmount(amount: number | null): string {
  if (amount == null) return "Sin monto";
  return `$${amount.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

/** Web "lista + panel de detalle de 440" (§5.3 "Plata" — Servicios). */
export function ServiceDetailPanel({ service, onEdit, onDeleted }: ServiceDetailPanelProps): React.JSX.Element {
  const generate = useGenerateServiceExpense();
  const toggleActive = useToggleServiceActive();
  const deleteService = useDeleteService();
  const [isDeleting, setIsDeleting] = useState(false);

  const Icon = CATEGORY_ICONS[service.category];
  const due = dueDateInfo(service.nextDueDate, new Date());

  async function handleDelete(): Promise<void> {
    setIsDeleting(true);
    try {
      await deleteService.mutateAsync(service.id);
      onDeleted();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex w-full shrink-0 flex-col gap-5 rounded-[20px] bg-surface p-5 lg:w-[440px]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-paper">
            <Icon className="size-[18px] text-ink" strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-[17px] font-semibold text-ink">{service.title}</p>
            {service.provider && <p className="text-[13px] text-ink-2">{service.provider}</p>}
          </div>
        </div>
        <button type="button" onClick={onEdit} aria-label="Editar servicio" className="text-ink-2">
          <Pencil className="size-[18px]" strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[28px] font-bold text-ink">{formatAmount(service.lastAmount)}</span>
        <span className="text-[13px] text-ink-2">{frequencyLabel(toRecurringFrequency(service.frequency, "MONTHLY"))}</span>
      </div>

      <p className={cn("text-[14px] font-medium", DUE_DATE_TONE_CLASS[due.tone])}>
        {due.text}
      </p>

      <p className="text-[13px] text-ink-2">Paga {service.paidBy.name}</p>

      {service.notes && <p className="text-[14px] text-ink">{service.notes}</p>}

      <div className="flex flex-col gap-2">
        <Button
          variant="secondary"
          onClick={() => generate.mutate(service.id)}
          loading={generate.isPending}
          loadingLabel="Registrando"
        >
          <Clock className="size-4" strokeWidth={1.75} />
          Registrar gasto
        </Button>
        <Button
          variant="secondary"
          onClick={() => toggleActive.mutate(service)}
          loading={toggleActive.isPending}
        >
          {service.isActive ? (
            <>
              <Pause className="size-4" strokeWidth={1.75} /> Pausar
            </>
          ) : (
            <>
              <Play className="size-4" strokeWidth={1.75} /> Reanudar
            </>
          )}
        </Button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex h-10 items-center justify-center gap-2 text-[14px] font-medium text-ladrillo-text"
        >
          {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" strokeWidth={1.75} />}
          Eliminar servicio
        </button>
      </div>
    </div>
  );
}
