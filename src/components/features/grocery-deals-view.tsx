"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Tag,
  ChevronDown,
  Loader2,
  ShoppingCart,
  ExternalLink,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTopDeals } from "@/hooks/use-top-deals";
import { addSearchItems } from "@/lib/shopping-cart-storage";
import { StoreLogo } from "@/components/ui/store-logo";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { spacing, typography, iconSize } from "@/lib/design-tokens";

import type { TopDealProduct } from "@habita/contracts";

// ============================================
// Top Deal Row
// ============================================

function TopDealRow({
  deal,
  isSelected,
  onToggle,
}: {
  deal: TopDealProduct;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-3 transition-colors",
        isSelected ? "bg-primary/5" : "hover:bg-muted/30",
      )}
    >
      {/* Checkbox + product name */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <button
          onClick={onToggle}
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
            isSelected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/30 hover:border-primary",
          )}
        >
          {isSelected && <Check className="h-3 w-3" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{deal.productName}</p>
          <span className="text-[11px] text-muted-foreground">{deal.categoryLabel}</span>
        </div>
      </div>

      {/* Price + discount + link */}
      <div className="ml-2 flex shrink-0 items-center gap-2">
        <div className="text-right">
          {deal.savingsPercent != null && deal.savingsPercent > 0 && (
            <div className="text-[10px] font-semibold text-green-600 dark:text-green-400">
              -{deal.savingsPercent.toFixed(0)}%
            </div>
          )}
          <span className="text-sm font-bold tabular-nums">{deal.price}</span>
          {deal.originalPrice && (
            <span className="ml-1 text-xs text-muted-foreground line-through">{deal.originalPrice}</span>
          )}
        </div>
        {deal.sourceUrl && (
          <a
            href={deal.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

// ============================================
// Top Deals View
// ============================================

function TopDealsView({ householdCity }: { householdCity: string | null }) {
  const { data, isLoading, error } = useTopDeals();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toastCtx = useToast();
  const router = useRouter();

  const deals = data?.topDeals ?? [];
  const totalDeals = data?.totalDeals ?? 0;

  // Group deals by store, ordered by best average discount
  const storeGroups = useMemo(() => {
    const map = new Map<string, TopDealProduct[]>();
    for (const deal of deals) {
      const existing = map.get(deal.store) ?? [];
      existing.push(deal);
      map.set(deal.store, existing);
    }
    return Array.from(map.entries())
      .map(([store, products]) => {
        const avgDiscount =
          products.reduce((s, p) => s + (p.savingsPercent ?? 0), 0) / products.length;
        return { store, products, avgDiscount };
      })
      .sort((a, b) => b.avgDiscount - a.avgDiscount);
  }, [deals]);

  const [expandedStores, setExpandedStores] = useState<Set<string>>(
    () => new Set(storeGroups.slice(0, 1).map((g) => g.store)),
  );

  const toggleStore = useCallback((store: string) => {
    setExpandedStores((prev) => {
      const next = new Set(prev);
      if (next.has(store)) next.delete(store);
      else next.add(store);
      return next;
    });
  }, []);

  const toggleDeal = useCallback((deal: TopDealProduct) => {
    const key = `${deal.productName}|${deal.store}`;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleAddToCart = useCallback(() => {
    const terms = deals
      .filter((d) => selected.has(`${d.productName}|${d.store}`))
      .map((d) => d.productName);

    if (terms.length === 0) return;

    const added = addSearchItems(terms);
    setSelected(new Set());

    if (added > 0) {
      toastCtx.success(
        `${added} producto${added !== 1 ? "s" : ""} agregado${added !== 1 ? "s" : ""} al carrito`,
        { action: { label: "Ir al carrito", onClick: () => router.push("/compras") } },
      );
    } else {
      toastCtx.info("Ya estaban en tu carrito", "Los productos seleccionados ya estaban agregados.");
    }
  }, [deals, selected, toastCtx, router]);

  return (
    <>
      <div className={spacing.pageHeader}>
        <div>
          <h1 className={cn(typography.pageTitle, "flex items-center gap-2")}>
            <Tag className={`${iconSize.lg} text-primary shrink-0`} />
            Top Ofertas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mejores descuentos reales{householdCity ? ` en ${householdCity}` : ""}
          </p>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Cargando mejores ofertas...</p>
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error instanceof Error ? error.message : "Error al cargar ofertas"}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && deals.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-muted/30 px-6 py-16 text-center">
          <Tag className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-lg font-semibold">Sin ofertas disponibles</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Todavia no hay datos de precios para tu zona. Volve a intentar mas tarde.
          </p>
        </div>
      )}

      {/* Deals grouped by store */}
      {!isLoading && deals.length > 0 && (
        <div className="space-y-3">
          {totalDeals > deals.length && (
            <p className="text-xs text-muted-foreground">
              Mostrando las {deals.length} mejores de {totalDeals} ofertas
            </p>
          )}

          {storeGroups.map(({ store, products, avgDiscount }) => {
            const isExpanded = expandedStores.has(store);
            const storeSelectedCount = products.filter((d) =>
              selected.has(`${d.productName}|${d.store}`)
            ).length;

            return (
              <div
                key={store}
                className="relative overflow-hidden rounded-2xl border border-border/40 bg-card shadow-sm"
              >
                {/* Store header */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <StoreLogo storeName={store} sizeClass="h-10 w-10" radiusClass="rounded-xl" fallbackFontClass="text-sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{store}</p>
                      <p className="text-xs text-muted-foreground">
                        {products.length} oferta{products.length !== 1 ? "s" : ""}
                        {storeSelectedCount > 0 && (
                          <span className="ml-1.5 font-medium text-primary">
                            · {storeSelectedCount} seleccionada{storeSelectedCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {avgDiscount > 0 && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-950/30 dark:text-green-300">
                        -{avgDiscount.toFixed(0)}% prom.
                      </span>
                    )}
                    <button
                      onClick={() => toggleStore(store)}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isExpanded && "rotate-180")} />
                    </button>
                  </div>
                </div>

                {/* Products */}
                {isExpanded && (
                  <div className="border-t border-border/30">
                    {products.map((deal) => {
                      const key = `${deal.productName}|${deal.store}`;
                      return (
                        <div key={key} className="border-b border-border/20 last:border-0">
                          <TopDealRow
                            deal={deal}
                            isSelected={selected.has(key)}
                            onToggle={() => toggleDeal(deal)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Floating add-to-cart button */}
      {selected.size > 0 && (
        <div className="sticky bottom-4 z-20 mt-4 flex items-center justify-center">
          <Button
            onClick={handleAddToCart}
            className="shadow-lg gap-2"
            size="lg"
          >
            <ShoppingCart className="h-4 w-4" />
            Agregar {selected.size} al carrito
          </Button>
        </div>
      )}
    </>
  );
}

// ============================================
// Main component
// ============================================

interface GroceryDealsViewProps {
  hasHouseholdLocation: boolean;
  householdCity: string | null;
}

export function GroceryDealsView({ householdCity }: GroceryDealsViewProps) {
  return <TopDealsView householdCity={householdCity} />;
}
