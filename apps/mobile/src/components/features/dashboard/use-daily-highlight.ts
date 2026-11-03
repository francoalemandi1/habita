import { useMemo } from "react";
import { getTodayCategory } from "@/hooks/use-grocery-deals";

import type { GroceryDealsResponse } from "@habita/contracts";
import type { DailyHighlightState } from "./types";

interface EventItem {
  title: string;
  startDate?: string | null;
  venueName?: string | null;
  editorialHighlight?: string | null;
}

interface UseDailyHighlightInput {
  dailyDeal: GroceryDealsResponse | undefined;
  recommendedEvent: EventItem | null;
  isLoading: boolean;
}

export function useDailyHighlight({
  dailyDeal,
  recommendedEvent,
  isLoading,
}: UseDailyHighlightInput): {
  highlight: DailyHighlightState | null;
  loading: boolean;
} {
  return useMemo(() => {
    if (isLoading) {
      return { highlight: null, loading: true };
    }

    const bestCluster = dailyDeal?.clusters[0];

    // 1. Deal with >30% average discount
    if (bestCluster && bestCluster.averageDiscountPercent > 30) {
      return {
        highlight: {
          type: "deal" as const,
          title: bestCluster.storeName,
          subtitle: `${Math.round(bestCluster.averageDiscountPercent)}% dto promedio · ${bestCluster.productCount} producto${bestCluster.productCount !== 1 ? "s" : ""}`,
          categoryLabel: "OFERTA",
          ctaLabel: "Ver ofertas",
          ctaRoute: "/(app)/grocery-deals",
          ctaParams: { category: getTodayCategory() },
        },
        loading: false,
      };
    }

    // 2. Event with editorial highlight (or first available event)
    if (recommendedEvent) {
      const dateStr = recommendedEvent.startDate
        ? new Date(recommendedEvent.startDate).toLocaleDateString("es-AR", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })
        : null;
      const subtitle = [dateStr, recommendedEvent.venueName]
        .filter(Boolean)
        .join(" · ");

      return {
        highlight: {
          type: "event" as const,
          title: recommendedEvent.title,
          subtitle: subtitle || "Evento cerca tuyo",
          categoryLabel: "EVENTO",
          ctaLabel: "Ver evento",
          ctaRoute: "/(app)/descubrir",
        },
        loading: false,
      };
    }

    // 3. Deal with any discount
    if (bestCluster) {
      return {
        highlight: {
          type: "deal" as const,
          title: bestCluster.storeName,
          subtitle: `${bestCluster.productCount} producto${bestCluster.productCount !== 1 ? "s" : ""} en oferta`,
          categoryLabel: "OFERTA",
          ctaLabel: "Ver precios",
          ctaRoute: "/(app)/grocery-deals",
          ctaParams: { category: getTodayCategory() },
        },
        loading: false,
      };
    }

    return { highlight: null, loading: false };
  }, [dailyDeal, recommendedEvent, isLoading]);
}
