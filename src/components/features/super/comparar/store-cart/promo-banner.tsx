"use client";

import { useState } from "react";
import { Check, ChevronDown, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BankPromo } from "@prisma/client";
import { bestPromoPerBank, formatDaysShort, getLocalDayName, promoAppliesOnDay, sortActivePromosByScore } from "@habita/prices";
import { formatCapShort, getPromoSummaryText, parseJsonArray } from "./helpers";

interface PromoBannerProps {
  promos: BankPromo[];
  selectedPromoId: string | null;
  onSelectPromo: (promoId: string | null) => void;
}

export function PromoBanner({ promos, selectedPromoId, onSelectPromo }: PromoBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const now = new Date();
  const todayName = getLocalDayName(now);
  const bestPerBank = bestPromoPerBank(promos, todayName, now);
  const best = bestPerBank[0];
  if (!best) return null;
  const extraPromos = promos.length - bestPerBank.length;

  const allSorted = sortActivePromosByScore(promos, todayName, now);
  const visiblePromos = isExpanded ? allSorted : bestPerBank;

  const selectedBank = selectedPromoId ? promos.find((p) => p.id === selectedPromoId) ?? null : null;
  const summaryText = getPromoSummaryText(selectedBank, bestPerBank, best, formatDaysShort);

  return (
    <div className="mx-4 mb-1">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex min-h-9 w-full items-center gap-1.5 rounded-[14px] px-3 py-2 text-left transition-all duration-200 active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monte",
          selectedPromoId ? "bg-monte-soft hover:bg-monte-soft" : "bg-sand hover:bg-line-soft",
        )}
      >
        <Tag className={cn("h-3 w-3 shrink-0", selectedPromoId ? "text-monte" : "text-ink-2")} strokeWidth={1.75} aria-hidden="true" />
        <span className={cn("flex-1 text-[11px] font-medium", selectedPromoId ? "text-monte" : "text-ink")}>
          {summaryText}
        </span>
        <ChevronDown
          className={cn("h-3 w-3 transition-transform duration-200", selectedPromoId ? "text-monte" : "text-ink-2", isExpanded && "rotate-180")}
          strokeWidth={1.75}
          aria-hidden="true"
        />
      </button>

      {isExpanded && (
        <div className="mt-1 space-y-0.5 rounded-[14px] bg-paper p-1.5">
          {visiblePromos.map((promo) => {
            const isSelected = promo.id === selectedPromoId;
            const cap = formatCapShort(promo.capAmount);
            const paymentMethods = parseJsonArray(promo.paymentMethods);
            const appliesToday = promoAppliesOnDay(promo, todayName);
            return (
              <button
                key={promo.id}
                type="button"
                onClick={() => onSelectPromo(isSelected ? null : promo.id)}
                className={cn(
                  "flex min-h-9 w-full items-center gap-1.5 rounded-[14px] px-2.5 py-2 text-left transition-all duration-200 active:scale-[0.98]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monte",
                  isSelected ? "bg-monte-soft ring-2 ring-monte" : "hover:bg-sand",
                )}
              >
                <span className={cn("rounded-[12px] px-1.5 py-0.5 text-[10px] font-bold", isSelected ? "bg-monte text-paper" : "bg-monte-soft text-monte")}>
                  {promo.discountPercent}%
                </span>
                <span className={cn("text-[11px] font-medium", isSelected ? "text-monte" : "text-ink")}>
                  {promo.bankDisplayName}
                </span>
                {paymentMethods[0] && (
                  <span className="text-[10px] text-ink-2">· {paymentMethods[0]}</span>
                )}
                <span className="text-[10px] text-ink-2">
                  {formatDaysShort(promo.daysOfWeek, { allDaysLabel: "Todos" })}
                </span>
                {appliesToday && (
                  <span className="rounded-full bg-monte-soft px-1.5 py-0.5 text-[9px] font-semibold text-monte">
                    Hoy
                  </span>
                )}
                {cap && (
                  <span className="text-[10px] text-ink-2">· tope {cap}</span>
                )}
                {isSelected && (
                  <Check className="ml-auto h-3 w-3 shrink-0 text-monte" strokeWidth={1.75} aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {!isExpanded && extraPromos > 0 && (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="mt-1 min-h-9 px-2.5 pb-1 text-[10px] text-monte underline-offset-2 hover:underline active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monte"
        >
          +{extraPromos} promo{extraPromos !== 1 ? "s" : ""} más de estos bancos
        </button>
      )}
    </div>
  );
}
