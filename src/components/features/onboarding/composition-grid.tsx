"use client";

import { cn } from "@/lib/utils";

import type { HouseholdComposition } from "@/lib/onboarding-starter-tasks";

interface CompositionOption {
  value: HouseholdComposition;
  label: string;
}

const OPTIONS: CompositionOption[] = [
  { value: "solo", label: "Solo/a" },
  { value: "pareja", label: "En pareja" },
  { value: "compartida", label: "Compartida" },
  { value: "familia", label: "Familia" },
];

interface CompositionGridProps {
  value: HouseholdComposition | null;
  onChange: (value: HouseholdComposition) => void;
}

/** "¿Con quién vivís?" — 2x2 grid, selected = Salvia (monteSoft) with Monte border. Handoff §5.3. */
export function CompositionGrid({ value, onChange }: CompositionGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="¿Con quién vivís?">
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex h-16 items-center justify-center rounded-[12px] border px-3 text-[15px] font-medium transition-colors duration-180",
              selected ? "border-monte bg-monte-soft text-monte" : "border-line bg-surface text-ink"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
