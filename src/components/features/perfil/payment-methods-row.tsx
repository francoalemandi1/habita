"use client";

import { useState } from "react";
import { ChevronRight, CreditCard } from "lucide-react";
import { BankChip } from "@/components/ds/bank-chip";
import { Sheet } from "@/components/ds/sheet";
import { PaymentMethodChips } from "@/components/features/super/comparar/payment-method-chips";
import { usePaymentMethod } from "@/hooks/use-payment-method";

const VISIBLE_CHIPS = 3;

/** Perfil › Medios de pago (handoff §5.3): the user's banks at a glance; tapping opens the picker. */
export function PaymentMethodsRow(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const { paymentMethods, togglePaymentMethod, isHydrated } = usePaymentMethod();
  const visible = paymentMethods.slice(0, VISIBLE_CHIPS);
  const hiddenCount = paymentMethods.length - visible.length;
  const isEmpty = isHydrated && paymentMethods.length === 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex min-h-[60px] w-full items-center gap-3 border-b border-line-soft px-1 py-2 text-left outline-none transition-colors duration-100 hover:bg-paper/60 focus-visible:ring-2 focus-visible:ring-monte"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-paper">
          <CreditCard className="size-[18px] text-ink" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[15px] font-medium text-ink">Medios de pago</span>
          {isEmpty && <span className="text-[13px] text-ink-2">Elegí tus bancos para ver promos en Súper</span>}
          {visible.length > 0 && (
            <span className="flex flex-wrap items-center gap-1.5">
              {visible.map((method) => (
                <BankChip key={method.bankSlug} bankSlug={method.bankSlug} label={method.label} />
              ))}
              {hiddenCount > 0 && <span className="text-[12.5px] text-ink-2">y {hiddenCount} más</span>}
            </span>
          )}
        </span>
        <ChevronRight className="size-4 shrink-0 text-ink-3" strokeWidth={1.75} aria-hidden="true" />
      </button>

      <Sheet open={isOpen} onOpenChange={setIsOpen} title="Medios de pago">
        <div className="flex flex-col gap-4">
          <p className="text-[14px] text-ink-2">Los usamos para mostrarte las promos de tus bancos y billeteras en Súper.</p>
          <PaymentMethodChips selected={paymentMethods} onToggle={togglePaymentMethod} />
        </div>
      </Sheet>
    </>
  );
}
