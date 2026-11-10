"use client";

import { useState } from "react";
import { ChevronDown, CreditCard } from "lucide-react";
import { FilterChip } from "@/components/ds/chip";
import { PAYMENT_METHOD_OPTIONS } from "@/hooks/use-payment-method";
import { cn } from "@/lib/utils";

import type { PaymentMethod } from "@/hooks/use-payment-method";

interface PaymentMethodChipsProps {
  selected: PaymentMethod[];
  onToggle: (method: PaymentMethod) => void;
}

function summarize(selected: readonly PaymentMethod[]): string {
  if (selected.length === 0) return "Elegí tus bancos y billeteras para ver promos";
  return selected.map((method) => method.label).join(", ");
}

/**
 * Bank/wallet picker for bank promos (§5.3 Comparar). Collapsed to one summary row so the
 * 17 options do not push the comparison below the fold; expands in place.
 */
export function PaymentMethodChips({ selected, onToggle }: PaymentMethodChipsProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2 rounded-[14px] bg-surface px-3.5 py-2.5">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="flex min-h-9 items-center gap-2.5 rounded-[8px] text-left outline-none focus-visible:ring-2 focus-visible:ring-monte"
      >
        <CreditCard className="size-4 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-ink">Tus medios de pago</span>
          <span className="block truncate text-[13px] text-ink-2">{summarize(selected)}</span>
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-ink-2 transition-transform duration-180", isOpen && "rotate-180")}
          strokeWidth={1.75}
          aria-hidden="true"
        />
      </button>
      {isOpen && (
        <div className="animate-content-in flex flex-wrap gap-1.5 pb-1">
          {PAYMENT_METHOD_OPTIONS.map((option) => (
            <FilterChip
              key={option.bankSlug}
              active={selected.some((method) => method.bankSlug === option.bankSlug)}
              onClick={() => onToggle(option)}
            >
              {option.label}
            </FilterChip>
          ))}
        </div>
      )}
    </div>
  );
}
