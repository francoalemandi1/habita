import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// Format helpers
// ============================================

export function formatAmount(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })}M`;
  }
  if (amount >= 10_000) {
    return `$${Math.round(amount / 1_000).toLocaleString("es-AR")}k`;
  }
  return `$${amount.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ============================================
// TrendBadge
// ============================================

export function TrendBadge({
  trend,
  percent,
  comparisonLabel = "vs tu promedio",
}: {
  trend: "up" | "down" | "flat";
  percent: number;
  comparisonLabel?: string;
}) {
  if (trend === "flat") {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        similar a tu promedio
      </span>
    );
  }

  const isUp = trend === "up";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        isUp ? "text-red-600" : "text-green-600",
      )}
    >
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isUp ? "+" : "-"}{percent}% {comparisonLabel}
    </span>
  );
}
