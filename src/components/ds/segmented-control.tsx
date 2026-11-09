"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { RAW_COLORS } from "./lib/raw-colors";

export interface SegmentedControlProps<T extends string> {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the tab list, e.g. "Vista de Plata". */
  label?: string;
  className?: string;
}

const NEXT_KEYS = new Set(["ArrowRight", "ArrowDown"]);
const PREVIOUS_KEYS = new Set(["ArrowLeft", "ArrowUp"]);

function wrapIndex(index: number, length: number): number {
  return (index + length) % length;
}

function keyStep(key: string): number {
  if (NEXT_KEYS.has(key)) return 1;
  if (PREVIOUS_KEYS.has(key)) return -1;
  return 0;
}

/** §6.7 — max 3 options; tablist with roving focus (arrow keys move and select, like native tabs). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: SegmentedControlProps<T>): React.JSX.Element {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  if (process.env.NODE_ENV !== "production" && options.length > 3) {
    console.warn("SegmentedControl: §6.7 allows a maximum of 3 options");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    const step = keyStep(event.key);
    if (step === 0) return;
    event.preventDefault();
    const currentIndex = options.findIndex((option) => option.value === value);
    const nextIndex = wrapIndex(currentIndex + step, options.length);
    const nextOption = options[nextIndex];
    if (!nextOption) return;
    onChange(nextOption.value);
    buttonRefs.current[nextIndex]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={cn("flex w-full rounded-[12px] bg-sand p-[3px] md:inline-flex md:w-auto", className)}
    >
      {options.map((option, index) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            ref={(element) => {
              buttonRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-9 flex-1 whitespace-nowrap rounded-[9px] px-4 text-[14px] font-medium transition-[background-color,color,box-shadow] duration-180 ease-[cubic-bezier(.2,0,0,1)] md:flex-none",
              "outline-none focus-visible:ring-2 focus-visible:ring-monte",
              isActive ? "bg-surface text-ink" : "text-ink-2 hover:text-ink"
            )}
            style={isActive ? { boxShadow: RAW_COLORS.segmentedShadow } : undefined}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
