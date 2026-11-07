"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

/** §6.5 — 40x40 buttons, tabular value. */
export function Stepper({ value, onChange, min = 0, max = Infinity, className }: StepperProps): React.JSX.Element {
  const decrease = () => onChange(Math.max(min, value - 1));
  const increase = () => onChange(Math.min(max, value + 1));

  return (
    <div className={cn("inline-flex items-center gap-2 rounded-[12px] bg-surface p-1", className)}>
      <button
        type="button"
        onClick={decrease}
        disabled={value <= min}
        aria-label="Restar"
        className="flex size-10 items-center justify-center rounded-[10px] disabled:opacity-40"
      >
        <Minus className="size-4 text-ink" strokeWidth={1.75} />
      </button>
      <span className="min-w-6 text-center text-[16px] font-semibold tabular-nums text-ink">{value}</span>
      <button
        type="button"
        onClick={increase}
        disabled={value >= max}
        aria-label="Sumar"
        className="flex size-10 items-center justify-center rounded-[10px] disabled:opacity-40"
      >
        <Plus className="size-4 text-ink" strokeWidth={1.75} />
      </button>
    </div>
  );
}
