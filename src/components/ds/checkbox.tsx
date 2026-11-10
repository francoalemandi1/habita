"use client";

import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { RAW_COLORS } from "./lib/raw-colors";

export type CheckboxState = "pending" | "pressed" | "done" | "toVerify" | "transferred";

export interface CheckboxProps {
  state: CheckboxState;
  onToggle?: () => void;
  /** Shown next to a `transferred` checkbox, e.g. "pasada a Sofi · esperando". */
  transferredLabel?: string;
  disabled?: boolean;
  className?: string;
  /** Accessible name, usually the task or item name ("Lavar platos"). */
  label?: string;
}

/** §6.2 — 22px visible box, 44px touch target, 5 states incl. verification + transfer. */
export function Checkbox({
  state,
  onToggle,
  transferredLabel,
  disabled = false,
  className,
  label,
}: CheckboxProps): React.JSX.Element {
  const isChecked = state === "done" || state === "toVerify";

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        role="checkbox"
        aria-label={label}
        aria-checked={state === "toVerify" ? "mixed" : isChecked}
        disabled={disabled || state === "transferred"}
        onClick={onToggle}
        className={cn(
          "flex size-11 items-center justify-center",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monte",
          className
        )}
      >
        <span
          className={cn(
            "flex size-[22px] items-center justify-center rounded-[6px] transition-transform duration-180",
            state === "pending" && "border-[1.5px]",
            state === "pressed" && "border-[1.5px] border-monte bg-monte-soft scale-90",
            state === "done" && "bg-monte",
            state === "toVerify" && "border-[1.5px] border-dashed border-monte",
            state === "transferred" && "border border-line bg-paper"
          )}
          style={state === "pending" ? { borderColor: RAW_COLORS.fadedBorder } : undefined}
        >
          {state === "done" && <Check className="size-[14px] text-paper" strokeWidth={2.5} />}
          {state === "toVerify" && <Minus className="size-[12px] text-monte" strokeWidth={2.5} />}
        </span>
      </button>
      {state === "transferred" && transferredLabel && (
        <span className="text-[13px] text-ink-2">{transferredLabel}</span>
      )}
    </div>
  );
}
