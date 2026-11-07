"use client";

import { cn } from "@/lib/utils";

export interface RadioOption {
  value: string;
  label: string;
  meta?: string;
}

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value: string | null;
  onChange: (value: string) => void;
  className?: string;
}

/** §6.6 — 22px circle, filled ring when selected. For >5 options use a searchable list instead. */
export function RadioGroup({ name, options, value, onChange, className }: RadioGroupProps): React.JSX.Element {
  return (
    <div role="radiogroup" className={cn("flex flex-col gap-1", className)}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <label
            key={option.value}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[12px] px-2 py-2"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span
              className={cn(
                "flex size-[22px] shrink-0 rounded-full border-[1.5px] border-line",
                selected && "border-[6px] border-monte"
              )}
              aria-hidden="true"
            />
            <span className="flex flex-col">
              <span className="text-[15px] text-ink">{option.label}</span>
              {option.meta && <span className="text-[13px] text-ink-2">{option.meta}</span>}
            </span>
          </label>
        );
      })}
    </div>
  );
}
