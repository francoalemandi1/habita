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
  const disabledMatchers: Array<{ before: Date } | { after: Date }> = [];
  if (minDate) disabledMatchers.push({ before: minDate });
  if (maxDate) disabledMatchers.push({ after: maxDate });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal sm:w-auto",
            !dateRange?.from && "text-muted-foreground",
            className,
          )}
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          {dateRange?.from ? (
            dateRange.to ? (
              <>
                {format(dateRange.from, "d MMM", { locale: es })} –{" "}
                {format(dateRange.to, "d MMM yyyy", { locale: es })}
              </>
            ) : (
              format(dateRange.from, "d MMM yyyy", { locale: es })
            )
          ) : (
            "Seleccionar fechas"
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={dateRange}
          onSelect={onDateRangeChange}
          numberOfMonths={2}
          disabled={disabledMatchers.length > 0 ? disabledMatchers : undefined}
          defaultMonth={dateRange?.from ?? minDate}
        />
      </PopoverContent>
    </Popover>
  );
}
