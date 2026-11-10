"use client";

import { monthKeyToLabel } from "@/components/features/plata/gastos/gastos-logic";

import type { MonthTotalBar } from "./como-venimos-logic";

function formatArs(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-AR")}`;
}

/**
 * Total-per-month bars for "3 meses" / "Año" — the API has no per-category
 * breakdown for past months, only month-level totals (see the stage report).
 */
export function MonthTotalBars({ bars }: { bars: MonthTotalBar[] }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-ink-2">Total gastado por mes</p>
      {bars.map((bar) => (
        <div key={bar.month} className="flex items-center gap-3">
          <span className="w-16 shrink-0 text-[13px] text-ink-2">{monthKeyToLabel(bar.month)}</span>
          <div className="h-2 w-full overflow-hidden rounded-full bg-sand">
            <div
              className="h-full rounded-full bg-monte"
              style={{ width: `${bar.widthPercent}%` }}
            />
          </div>
          <span className="w-24 shrink-0 text-right text-[13px] font-medium text-ink">
            {formatArs(bar.total)}
          </span>
        </div>
      ))}
    </div>
  );
}
