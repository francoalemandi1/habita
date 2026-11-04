import { cn } from "@/lib/utils";
import { buildMiniBars } from "./gastos-logic";

import type { MonthTotalPoint } from "./gastos-logic";

interface MiniBarsProps {
  monthlyHistory: readonly MonthTotalPoint[];
}

/** 6-month mini bars: current month in Monte, the rest in Línea (handoff §5.3). */
export function MiniBars({ monthlyHistory }: MiniBarsProps): React.JSX.Element | null {
  if (monthlyHistory.length === 0) return null;

  const bars = buildMiniBars(monthlyHistory);
  const maxTotal = Math.max(...bars.map((bar) => bar.total), 1);

  return (
    <div className="flex h-10 items-end gap-1.5">
      {bars.map((bar) => (
        <div
          key={bar.month}
          className={cn("flex-1 rounded-t-[4px]", bar.isCurrent ? "bg-monte" : "bg-line")}
          style={{ height: `${Math.max((bar.total / maxTotal) * 100, 4)}%` }}
        />
      ))}
    </div>
  );
}
