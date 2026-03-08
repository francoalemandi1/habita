"use client";

import { useState } from "react";
import { Tag, RefreshCw, ChevronDown, ChevronUp, Loader2, Lightbulb, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useGroceryDeals, useRefreshGroceryDeals } from "@/hooks/use-grocery-deals";
import { StoreLogo } from "@/components/ui/store-logo";
import { spacing, typography, iconSize } from "@/lib/design-tokens";

import type { GroceryTab, StoreCluster, ProductPrice } from "@/lib/llm/grocery-advisor";

const CATEGORIES: { value: GroceryTab; label: string; emoji: string }[] = [
  { value: "almacen", label: "Almacén", emoji: "🛒" },
  { value: "frutas_verduras", label: "Frutas y Verd.", emoji: "🥦" },
  { value: "carnes", label: "Carnes", emoji: "🥩" },
  { value: "lacteos", label: "Lácteos", emoji: "🥛" },
  { value: "panaderia_dulces", label: "Panadería", emoji: "🍞" },
  { value: "bebidas", label: "Bebidas", emoji: "🥤" },
  { value: "limpieza", label: "Limpieza", emoji: "🧹" },
  { value: "perfumeria", label: "Perfumería", emoji: "🧴" },
];

const MEDALS = ["🥇", "🥈", "🥉"];

function ProductRow({ product }: { product: ProductPrice }) {
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

function StoreCard({ cluster, rank }: { cluster: StoreCluster; rank: number }) {
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
            <ProductRow key={p.productName} product={p} />
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

interface GroceryDealsViewProps {
  aiEnabled: boolean;
  hasHouseholdLocation: boolean;
  householdCity: string | null;
}

export function GroceryDealsView({ aiEnabled, hasHouseholdLocation, householdCity }: GroceryDealsViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<GroceryTab>("almacen");
  const { location, isLoading: isGeoLoading } = useGeolocation();
  const refreshDeals = useRefreshGroceryDeals();

  const { data, isLoading, error, forceRefreshRef } = useGroceryDeals({
    category: selectedCategory,
    location,
    isGeoLoading,
    hasHouseholdLocation,
    aiEnabled,
  });

  const clusters = data?.clusters ?? [];
  const recommendation = data?.recommendation;
  const notFound = data?.productsNotFound ?? [];
  const isCached = data?.cached ?? false;

  const handleRefresh = () => {
    refreshDeals(selectedCategory, forceRefreshRef);
  };

  if (!aiEnabled) {
    return (
      <>
        <div className={spacing.pageHeader}>
          <h1 className={cn(typography.pageTitle, "flex items-center gap-2")}>
            <Tag className={`${iconSize.lg} text-primary shrink-0`} />
            Ofertas del Súper
          </h1>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-muted/30 px-6 py-16 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-lg font-semibold">IA no disponible</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Esta función requiere que la IA esté habilitada.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={spacing.pageHeader}>
        <h1 className={cn(typography.pageTitle, "flex items-center gap-2")}>
          <Tag className={`${iconSize.lg} text-primary shrink-0`} />
          Ofertas del Súper
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mejores precios por categoría{householdCity ? ` en ${householdCity}` : ""}
        </p>
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
          <p className="text-sm text-muted-foreground">Buscando las mejores ofertas...</p>
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
          {/* Results header */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {isCached ? "📦 Resultados en caché" : "🔄 Resultados frescos"}
            </span>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              <RefreshCw className="h-3 w-3" />
              Actualizar
            </button>
          </div>

          {/* Recommendation */}
          {recommendation && (
            <div className="rounded-xl border-l-4 border-primary bg-primary/5 p-4">
              <p className="text-sm">
                <Lightbulb className="mr-1.5 inline-block h-4 w-4 text-primary" />
                {recommendation}
              </p>
            </div>
          )}

          {/* Store cards */}
          {clusters.map((cluster, i) => (
            <StoreCard key={cluster.storeName} cluster={cluster} rank={i} />
          ))}

          {/* Not found products */}
          {notFound.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
              <p className="font-medium text-amber-700 dark:text-amber-300">
                Sin resultados: {notFound.join(", ")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !data && !error && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-muted/30 px-6 py-16 text-center">
          <Tag className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-lg font-semibold">Elegí una categoría</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Seleccioná una categoría para ver las mejores ofertas del momento.
          </p>
        </div>
      )}
    </>
  );
}
