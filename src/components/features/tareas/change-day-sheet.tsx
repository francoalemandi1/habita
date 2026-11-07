"use client";

import { Sheet } from "@/components/ds/sheet";
import { formatDayHeader } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";

interface ChangeDaySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskName: string;
  weekDays: readonly Date[];
  currentDueDate: Date;
  isSubmitting: boolean;
  onSelectDay: (day: Date) => void;
}

/** "Cambiar día" context menu action — moves the assignment within the visible week. */
export function ChangeDaySheet({
  open,
  onOpenChange,
  taskName,
  weekDays,
  currentDueDate,
  isSubmitting,
  onSelectDay,
}: ChangeDaySheetProps): React.JSX.Element {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={`Cambiar día de «${taskName}»`}>
      <div className="grid grid-cols-7 gap-1.5">
        {weekDays.map((day) => {
          const { dayName, dayNumber } = formatDayHeader(day);
          const isCurrent = day.toDateString() === currentDueDate.toDateString();
          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={isSubmitting}
              onClick={() => onSelectDay(day)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-[12px] py-2.5 text-[13px] font-semibold",
                isCurrent ? "bg-monte text-paper" : "bg-sand text-ink",
              )}
            >
              <span>{dayName}</span>
              <span>{dayNumber}</span>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
