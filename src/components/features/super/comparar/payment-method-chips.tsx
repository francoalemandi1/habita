"use client";

import { FilterChip } from "@/components/ds/chip";
import { PAYMENT_METHOD_OPTIONS } from "@/hooks/use-payment-method";

import type { PaymentMethod } from "@/hooks/use-payment-method";

interface PaymentMethodChipsProps {
  selected: PaymentMethod[];
  onToggle: (method: PaymentMethod) => void;
}

/**
 * Simplified bank/wallet picker for the promo banner (handoff §5.3). Drops the
 * grocery-advisor search popover — the list is short enough for plain chips.
 */
export function PaymentMethodChips({ selected, onToggle }: PaymentMethodChipsProps): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-1.5">
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
