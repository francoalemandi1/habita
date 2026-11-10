"use client";

import { CATEGORY_ICONS, CATEGORY_LABELS } from "@/lib/expense-constants";
import { cn } from "@/lib/utils";

import type { CategoryBar } from "./como-venimos-logic";

function formatArs(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-AR")}`;
}

/** Per-category bars for the "Mes" segment; the rising category renders in Ladrillo (§9.1). */
export function CategoryBars({ bars }: { bars: CategoryBar[] }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      {bars.map((bar) => {
        const Icon = CATEGORY_ICONS[bar.category];
        return (
          <div key={bar.category} className="flex items-center gap-3">
            <Icon className="size-4 shrink-0 text-ink-2" strokeWidth={1.75} />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[14px] text-ink">{CATEGORY_LABELS[bar.category]}</span>
                <span className="shrink-0 text-[13px] font-medium text-ink">{formatArs(bar.amount)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-sand">
                <div
                  className={cn("h-full rounded-full", bar.isRising ? "bg-ladrillo" : "bg-monte")}
                  style={{ width: `${bar.widthPercent}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
