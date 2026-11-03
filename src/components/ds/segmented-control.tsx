"use client";

import { cn } from "@/lib/utils";
import { RAW_COLORS } from "./lib/raw-colors";

export interface SegmentedControlProps<T extends string> {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/** §6.7 — max 3 options; enforced with a dev-time warning rather than truncation. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>): React.JSX.Element {
  if (process.env.NODE_ENV !== "production" && options.length > 3) {
    console.warn("SegmentedControl: §6.7 allows a maximum of 3 options");
  }

  return (
    <div role="tablist" className={cn("inline-flex rounded-[12px] bg-sand p-[3px]", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-[9px] px-4 py-1.5 text-[14px] font-medium text-ink-2 transition-colors duration-180",
              active && "bg-surface text-ink"
            )}
            style={active ? { boxShadow: RAW_COLORS.segmentedShadow } : undefined}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
