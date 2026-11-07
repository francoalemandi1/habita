"use client";

import { useState } from "react";
import { CATEGORY_ICONS } from "@/lib/expense-constants";
import { openAnotar } from "@/components/features/anotar/anotar-events";
import { dismissDetectedService } from "./detected-dismiss-store";
import { detectedServiceKey } from "./servicios-logic";

import type { DetectedService } from "@/lib/gmail/scanner";

interface DetectedInvoiceCardProps {
  service: DetectedService;
  onDismiss: (key: string) => void;
}

function formatAmount(amount: number, currency: string): string {
  const prefix = currency === "USD" ? "US$" : "$";
  return `${prefix}${amount.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

/** Manteca soft card for a Gmail-detected invoice (§5.3 "Servicios", §7 pattern B). */
export function DetectedInvoiceCard({ service, onDismiss }: DetectedInvoiceCardProps): React.JSX.Element {
  const [isDismissing, setIsDismissing] = useState(false);
  const Icon = CATEGORY_ICONS[service.category];

  function handleAdd(): void {
    openAnotar({
      kind: "expense",
      expense: {
        title: service.title,
        amount: service.lastAmount ?? undefined,
        category: service.category,
      },
    });
  }

  function handleDismiss(): void {
    setIsDismissing(true);
    dismissDetectedService(detectedServiceKey(service));
    onDismiss(detectedServiceKey(service));
  }

  return (
    <div className="flex items-center gap-3 rounded-[16px] bg-manteca-soft p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-surface">
        <Icon className="size-[18px] text-manteca-text" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium text-ink">{service.title}</p>
        <p className="truncate text-[13px] text-manteca-text">
          {service.lastAmount != null ? formatAmount(service.lastAmount, service.currency) : service.provider}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={handleDismiss}
          disabled={isDismissing}
          className="text-[13px] font-medium text-ink-2"
        >
          No es mía
        </button>
        <button type="button" onClick={handleAdd} className="text-[14px] font-semibold text-monte">
          Agregar
        </button>
      </div>
    </div>
  );
}
