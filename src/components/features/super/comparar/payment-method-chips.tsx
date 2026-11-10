"use client";

import { FilterChip } from "@/components/ds/chip";
import { PAYMENT_METHOD_OPTIONS } from "@/hooks/use-payment-method";

import type { PaymentMethod } from "@/hooks/use-payment-method";

interface PaymentMethodChipsProps {
  selected: PaymentMethod[];
  onToggle: (method: PaymentMethod) => void;
}

/** Bank/wallet picker for bank promos (§5.3). The caller owns any disclosure around it. */
export function PaymentMethodChips({ selected, onToggle }: PaymentMethodChipsProps): React.JSX.Element {
  return (
    <div role="group" aria-label="Bancos y billeteras" className="animate-content-in flex flex-wrap gap-1.5">
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
  );
}
