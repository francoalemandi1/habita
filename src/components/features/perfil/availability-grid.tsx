"use client";

import { Fragment, useState } from "react";
import { cn } from "@/lib/utils";
import { useSnackbar } from "@/components/ds/snackbar";
import { useUpdateMemberSettings } from "@/hooks/use-member-settings";
import {
  AVAILABILITY_SLOTS,
  AVAILABILITY_SLOT_LABELS,
  AVAILABILITY_WEEKDAYS,
  isSlotAvailable,
  normalizeAvailabilityGrid,
  toggleAvailabilitySlot,
} from "@habita/domain";

import type { AvailabilityGrid as AvailabilityGridValue, AvailabilityGridSlot } from "@habita/domain";

export interface AvailabilityGridProps {
  initialGrid: AvailabilityGridValue | null;
}

/** §5.3 Tareas → Disponibilidad — 7×3 grid, Monte = available, toggle is pattern A (optimistic). */
export function AvailabilityGrid({ initialGrid }: AvailabilityGridProps): React.JSX.Element {
  const [grid, setGrid] = useState<AvailabilityGridValue | null>(initialGrid);
  const update = useUpdateMemberSettings();
  const snackbar = useSnackbar();

  function handleToggle(weekday: number, slot: AvailabilityGridSlot): void {
    const previousGrid = grid;
    const nextGrid = normalizeAvailabilityGrid(toggleAvailabilitySlot(grid, weekday, slot));
    setGrid(nextGrid);
    update.mutate(
      { availability: nextGrid },
      {
        onError: () => {
          setGrid(previousGrid);
          snackbar.show({ text: "No se pudo guardar · Reintentar", tone: "error" });
        },
      },
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[auto_repeat(7,1fr)] items-center gap-1">
        <span />
        {AVAILABILITY_WEEKDAYS.map(({ weekday, label }) => (
          <span key={weekday} className="text-center text-[12px] font-semibold text-ink-2">
            {label}
          </span>
        ))}
        {AVAILABILITY_SLOTS.map((slot) => (
          <Fragment key={slot}>
            <span className="text-[13px] text-ink-2">{AVAILABILITY_SLOT_LABELS[slot]}</span>
            {AVAILABILITY_WEEKDAYS.map(({ weekday }) => {
              const available = isSlotAvailable(grid, weekday, slot);
              return (
                <button
                  key={`${weekday}-${slot}`}
                  type="button"
                  aria-pressed={available}
                  aria-label={`${AVAILABILITY_SLOT_LABELS[slot]} ${weekday}`}
                  onClick={() => handleToggle(weekday, slot)}
                  className={cn("h-10 rounded-[8px] transition-colors duration-180", available ? "bg-monte" : "bg-sand")}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
      <p className="text-[13px] text-ink-2">El plan no te asigna tareas en los días que marques sin franjas.</p>
    </div>
  );
}
