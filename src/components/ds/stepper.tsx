"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** "sm" fits dense list rows (32px buttons); the default keeps §6.5's 40px. */
  size?: "default" | "sm";
  /** Names what is being counted, e.g. "Cantidad de Huevos". */
  label?: string;
  className?: string;
}

const BUTTON_SIZES = { default: "size-10", sm: "size-8" } as const;

/** §6.5 — Papel background, radius 12, tabular value. */
export function Stepper({ value, onChange, min = 0, max = Infinity, size = "default", label, className }: StepperProps) {
  const buttonClass = cn(
    "flex items-center justify-center rounded-[10px] text-ink outline-none transition-colors duration-100 hover:bg-sand focus-visible:ring-2 focus-visible:ring-monte disabled:pointer-events-none disabled:opacity-35",
    BUTTON_SIZES[size],
  );

  return (
    <div role="group" aria-label={label} className={cn("inline-flex items-center gap-1 rounded-[12px] bg-paper p-0.5", className)}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Restar uno" className={buttonClass}>
        <Minus className="size-4" strokeWidth={1.75} aria-hidden="true" />
      </button>
      <span aria-live="polite" className={cn("min-w-6 text-center font-semibold tabular-nums text-ink", size === "sm" ? "text-[14px]" : "text-[16px]")}>
        {value}
      </span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Sumar uno" className={buttonClass}>
        <Plus className="size-4" strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  );
}
