"use client";

import { useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Tag,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
  Lightbulb,
  ShoppingCart,
  ExternalLink,
  Check,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useGroceryDeals, useRefreshGroceryDeals } from "@/hooks/use-grocery-deals";
import { useTopDeals } from "@/hooks/use-top-deals";
import { addSearchItems } from "@/lib/shopping-cart-storage";
import { StoreLogo } from "@/components/ui/store-logo";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { spacing, typography, iconSize } from "@/lib/design-tokens";

import type { GroceryTab, StoreCluster, ProductPrice } from "@/lib/grocery-deals-scraper";
import type { TopDealProduct } from "@habita/contracts";

// ============================================
// Catalog sub-view (old category chips view)
// ============================================

const CATEGORIES: { value: GroceryTab; label: string; emoji: string }[] = [
  { value: "almacen", label: "Almacen", emoji: "🛒" },
  { value: "frutas_verduras", label: "Frutas y Verd.", emoji: "🥦" },
  { value: "carnes", label: "Carnes", emoji: "🥩" },
  { value: "lacteos", label: "Lacteos", emoji: "🥛" },
  { value: "panaderia_dulces", label: "Panaderia", emoji: "🍞" },
  { value: "bebidas", label: "Bebidas", emoji: "🥤" },
  { value: "limpieza", label: "Limpieza", emoji: "🧹" },
  { value: "perfumeria", label: "Perfumeria", emoji: "🧴" },
];

const MEDALS = ["🥇", "🥈", "🥉"];

function CatalogProductRow({ product }: { product: ProductPrice }) {
  const content = (
    <div className="flex items-start justify-between border-b py-2 last:border-0">
      <div className="flex-1 pr-3">
        <p className="text-sm font-medium">{product.productName}</p>
        {product.discount && product.discount !== "0%" && (
          <p className="mt-0.5 text-xs text-green-600 dark:text-green-400">↓ {product.discount}</p>
        )}
      </div>
      <div className="text-right">
        <p className="text-sm font-bold">{product.price}</p>
        {product.originalPrice && (
          <p className="text-xs text-muted-foreground line-through">{product.originalPrice}</p>
        )}
      </div>
    </div>
  );

  if (product.sourceUrl) {
    return (
      <a href={product.sourceUrl} target="_blank" rel="noopener noreferrer" className="block hover:bg-muted/30">
        {content}
      </a>
    );
  }
  return content;
}

function CatalogStoreCard({ cluster, rank }: { cluster: StoreCluster; rank: number }) {
  const [expanded, setExpanded] = useState(rank === 0);

  return (
    <div className={cn("rounded-xl border bg-card", rank === 0 && "ring-2 ring-primary")}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between p-4"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{MEDALS[rank] ?? `#${rank + 1}`}</span>
          <StoreLogo storeName={cluster.storeName} sizeClass="h-8 w-8" />
          <div className="text-left">
            <p className="font-semibold">{cluster.storeName}</p>
            <p className="text-xs text-muted-foreground">{cluster.productCount} productos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {cluster.averageDiscountPercent > 0 && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950/30 dark:text-green-300">
              -{cluster.averageDiscountPercent.toFixed(0)}% prom.
            </span>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>
      {expanded && (
        <div className="border-t px-4 pb-4">
          {cluster.products.map((p) => (
            <CatalogProductRow key={p.productName} product={p} />
          ))}
          {cluster.totalEstimatedSavings > 0 && (
            <p className="mt-2 text-xs font-semibold text-green-600 dark:text-green-400">
              Ahorro estimado: ${cluster.totalEstimatedSavings.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CatalogView({
  hasHouseholdLocation,
  householdCity,
  onBack,
}: {
  hasHouseholdLocation: boolean;
  householdCity: string | null;
  onBack: () => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<GroceryTab>("almacen");
  const { location, isLoading: isGeoLoading } = useGeolocation();
  const refreshDeals = useRefreshGroceryDeals();

  const { data, isLoading, error, forceRefreshRef } = useGroceryDeals({
    category: selectedCategory,
    location,
    isGeoLoading,
    hasHouseholdLocation,
  });

  const clusters = data?.clusters ?? [];
  const recommendation = data?.recommendation;
  const notFound = data?.productsNotFound ?? [];
  const isCached = data?.cached ?? false;

  return (
    <>
      <div className={spacing.pageHeader}>
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className={cn(typography.pageTitle, "flex items-center gap-2")}>
              <Tag className={`${iconSize.lg} text-primary shrink-0`} />
              Catalogo de Ofertas
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Precios por categoria{householdCity ? ` en ${householdCity}` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Category pills */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground hover:bg-muted/80"
              )}
            >
              <span>{cat.emoji}</span>
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Buscando ofertas...</p>
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error instanceof Error ? error.message : "Error al buscar ofertas"}
        </div>
      )}

      {/* Results */}
      {!isLoading && clusters.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {isCached ? "Resultados en cache" : "Resultados frescos"}
            </span>
            <button
              onClick={() => refreshDeals(selectedCategory, forceRefreshRef)}
              className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              <RefreshCw className="h-3 w-3" />
              Actualizar
            </button>
          </div>

          {recommendation && (
            <div className="rounded-xl border-l-4 border-primary bg-primary/5 p-4">
              <p className="text-sm">
                <Lightbulb className="mr-1.5 inline-block h-4 w-4 text-primary" />
                {recommendation}
              </p>
            </div>
          )}

          {clusters.map((cluster, i) => (
            <CatalogStoreCard key={cluster.storeName} cluster={cluster} rank={i} />
          ))}

          {notFound.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
              <p className="font-medium text-amber-700 dark:text-amber-300">
                Sin resultados: {notFound.join(", ")}
              </p>
            </div>
          )}
        </div>
      )}

      {!isLoading && !data && !error && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-muted/30 px-6 py-16 text-center">
          <Tag className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-lg font-semibold">Elegi una categoria</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Selecciona una categoria para ver las mejores ofertas del momento.
          </p>
        </div>
      )}
    </>
  );
}

// ============================================
// Top Deals sub-view (default)
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

function TopDealsView({
  householdCity,
  onShowCatalog,
}: {
  householdCity: string | null;
  onShowCatalog: () => void;
}) {
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className={cn(typography.pageTitle, "flex items-center gap-2")}>
              <Tag className={`${iconSize.lg} text-primary shrink-0`} />
              Top Ofertas
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Mejores descuentos reales{householdCity ? ` en ${householdCity}` : ""}
            </p>
          </div>
          <button
            onClick={onShowCatalog}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Ver catalogo →
          </button>
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

export function GroceryDealsView({ hasHouseholdLocation, householdCity }: GroceryDealsViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isCatalogView = searchParams.get("view") === "catalog";

  const showCatalog = useCallback(() => {
    router.push("/grocery-deals?view=catalog");
  }, [router]);

  const showTopDeals = useCallback(() => {
    router.push("/grocery-deals");
  }, [router]);

  if (isCatalogView) {
    return (
      <CatalogView
        hasHouseholdLocation={hasHouseholdLocation}
        householdCity={householdCity}
        onBack={showTopDeals}
      />
    );
  }

  return (
    <TopDealsView
      householdCity={householdCity}
      onShowCatalog={showCatalog}
    />
  );
}
