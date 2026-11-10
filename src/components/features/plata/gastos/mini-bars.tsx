import { cn } from "@/lib/utils";
import { buildMiniBars } from "./gastos-logic";

import type { MonthTotalPoint } from "./gastos-logic";

interface MiniBarsProps {
  monthlyHistory: readonly MonthTotalPoint[];
}

/** 6-month mini bars beside the hero amount: current month in Monte, the rest in Línea (§5.3 Plata). */
export function MiniBars({ monthlyHistory }: MiniBarsProps): React.JSX.Element | null {
  if (monthlyHistory.length === 0) return null;

  const bars = buildMiniBars(monthlyHistory);
  const maxTotal = Math.max(...bars.map((bar) => bar.total), 1);

  return (
    <div className="flex h-12 w-24 shrink-0 items-end gap-1" role="img" aria-label="Gasto de los últimos 6 meses">
      {bars.map((bar) => (
        <div
          key={bar.month}
          className={cn("flex-1 rounded-[3px] transition-[height] duration-[420ms]", bar.isCurrent ? "bg-monte" : "bg-line")}
          style={{ height: `${Math.max((bar.total / maxTotal) * 100, 6)}%` }}
        />
      ))}
    </div>
  );
}
