"use client";

import { ListRow } from "@/components/ds/list-row";
import { CATEGORY_ICONS } from "@/lib/expense-constants";
import { frequencyLabel } from "@/lib/service-utils";
import { toRecurringFrequency } from "@/lib/plata-service-enums";
import { dueDateInfo, DUE_DATE_TONE_CLASS } from "./servicios-logic";
import { cn } from "@/lib/utils";

import type { SerializedService } from "@/types/expense";

interface ServiceListProps {
  services: SerializedService[];
  selectedId: string | null;
  onSelect: (service: SerializedService) => void;
}

/** Services grouped list (§5.3 "Servicios" — "lista de servicios con vencimiento"). */
export function ServiceList({ services, selectedId, onSelect }: ServiceListProps): React.JSX.Element {
  return (
    <div className="flex flex-col">
      {services.map((service) => {
        const due = dueDateInfo(service.nextDueDate, new Date());
        return (
          <ListRow
            key={service.id}
            leadingIcon={CATEGORY_ICONS[service.category]}
            title={service.title}
            meta={frequencyLabel(toRecurringFrequency(service.frequency, "MONTHLY"))}
            trailing={<span className={cn("shrink-0 text-[13px] font-medium", DUE_DATE_TONE_CLASS[due.tone])}>{due.text}</span>}
            onClick={() => onSelect(service)}
            className={cn(selectedId === service.id && "bg-surface", !service.isActive && "opacity-50")}
          />
        );
      })}
    </div>
  );
}
