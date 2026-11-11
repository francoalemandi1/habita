"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { PaymentMethodChips } from "./payment-method-chips";
import { formatPrice } from "./store-cart/helpers";

import type { PaymentMethod } from "@/hooks/use-payment-method";
import type { TodaysPromoPick } from "@habita/prices";

interface TodaysPromoBannerProps {
  bestPromo: TodaysPromoPick | null;
  paymentMethods: PaymentMethod[];
  onTogglePaymentMethod: (method: PaymentMethod) => void;
}

function summarizeMethods(methods: PaymentMethod[]): string {
  const labels = methods.map((m) => m.label);
  if (labels.length <= 3) return labels.join(", ");
  const [first, second, third] = labels;
  return `${first}, ${second}, ${third} y ${labels.length - 3} más`;
}

function buildMethodsLine(methods: PaymentMethod[], hasPromo: boolean): string {
  if (methods.length === 0) return "Elegí tus bancos y billeteras para ver promos";
  if (hasPromo) return `Promos de ${summarizeMethods(methods)}`;
  return `Hoy no hay promos para ${summarizeMethods(methods)}`;
}

/** Best bank promo across every store today, plus the user's payment method summary. */
export function TodaysPromoBanner({ bestPromo, paymentMethods, onTogglePaymentMethod }: TodaysPromoBannerProps): React.JSX.Element {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const methodsLine = buildMethodsLine(paymentMethods, bestPromo !== null);

  const toggle = (
    <button
      type="button"
      onClick={() => setIsPickerOpen((open) => !open)}
      aria-expanded={isPickerOpen}
      className="min-h-11 shrink-0 rounded px-1 font-semibold text-monte underline underline-offset-[3px] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monte"
    >
      Cambiar
    </button>
  );

  return (
    <div className={cn("rounded-[16px] px-4 py-2", bestPromo ? "bg-manteca-soft" : "bg-surface")}>
      {bestPromo && (
        <p className="pt-1.5 text-[14px] text-ink">
          <b className="font-semibold">
            Hoy, {bestPromo.discountPercent}% con {bestPromo.bankDisplayName} en {bestPromo.storeName}.
          </b>{" "}
          Con tu tarjeta queda en {formatPrice(bestPromo.discountedTotal)}
          {bestPromo.capAmount ? ` (tope ${formatPrice(bestPromo.capAmount)})` : ""}.
        </p>
      )}
      <div className="flex items-center gap-2 text-[13px] text-ink-2">
        {!bestPromo && <CreditCard className="size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />}
        <span className="min-w-0 flex-1">{methodsLine}</span>
        {toggle}
      </div>
      {isPickerOpen && (
        <div className="pb-2">
          <PaymentMethodChips selected={paymentMethods} onToggle={onTogglePaymentMethod} />
        </div>
      )}
    </div>
  );
}
