"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import type { DateRange } from "react-day-picker";

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  /** Earliest selectable date (typically today) */
  minDate?: Date;
  /** Latest selectable date (typically today + MAX_PLAN_DURATION_DAYS) */
  maxDate?: Date;
  disabled?: boolean;
  className?: string;
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  minDate,
  maxDate,
  disabled = false,
  className,
}: DateRangePickerProps) {
  const fromDisabled: Array<{ before: Date } | { after: Date }> = [];
  if (minDate) fromDisabled.push({ before: minDate });
  if (maxDate) fromDisabled.push({ after: maxDate });

  const toDisabled: Array<{ before: Date } | { after: Date }> = [];
  if (dateRange?.from) toDisabled.push({ before: dateRange.from });
  if (maxDate) toDisabled.push({ after: maxDate });

  function handleFromSelect(day: Date | undefined) {
    if (!day) return;
    const currentTo = dateRange?.to;
    // If new start is after current end, move end to match start
    if (currentTo && day > currentTo) {
      onDateRangeChange({ from: day, to: day });
    } else {
      onDateRangeChange({ from: day, to: currentTo });
    }
  }

  function handleToSelect(day: Date | undefined) {
    if (!day) return;
    onDateRangeChange({ from: dateRange?.from, to: day });
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* Start date picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "justify-start text-left font-normal",
              !dateRange?.from && "text-muted-foreground",
            )}
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            {dateRange?.from
              ? format(dateRange.from, "d MMM yyyy", { locale: es })
              : "Inicio"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateRange?.from}
            onSelect={handleFromSelect}
            disabled={fromDisabled.length > 0 ? fromDisabled : undefined}
            defaultMonth={dateRange?.from ?? minDate}
          />
        </PopoverContent>
      </Popover>

      <span className="text-muted-foreground">–</span>

      {/* End date picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "justify-start text-left font-normal",
              !dateRange?.to && "text-muted-foreground",
            )}
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            {dateRange?.to
              ? format(dateRange.to, "d MMM yyyy", { locale: es })
              : "Fin"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateRange?.to}
            onSelect={handleToSelect}
            disabled={toDisabled.length > 0 ? toDisabled : undefined}
            defaultMonth={dateRange?.to ?? dateRange?.from ?? minDate}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
