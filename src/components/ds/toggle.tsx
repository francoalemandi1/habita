"use client";

import { cn } from "@/lib/utils";
import { RAW_COLORS } from "./lib/raw-colors";

export interface ToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

/** §6.4 — 44x26 track, 20px knob, applies instantly (action pattern A). */
export function Toggle({ checked, onCheckedChange, disabled = false, label, className }: ToggleProps): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-[26px] w-11 items-center rounded-full transition-colors duration-180",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monte",
        checked && "bg-monte",
        !checked && !disabled && "bg-line",
        disabled && "bg-line opacity-60",
        className
      )}
      style={!checked && !disabled ? { backgroundColor: RAW_COLORS.toggleOffTrack } : undefined}
    >
      <span
        className={cn(
          "inline-block size-5 rounded-full bg-paper transition-transform duration-180",
          checked ? "translate-x-[22px]" : "translate-x-[3px]"
        )}
      />
    </button>
  );
}
