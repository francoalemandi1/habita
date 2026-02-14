"use client";

import { useState, useMemo } from "react";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useShoppingPlan, useRefreshShoppingPlan } from "@/hooks/use-shopping-plan";
import { useProductSelection } from "@/hooks/use-product-selection";
import { UnifiedStoreCard } from "@/components/features/store-cluster-card";
import { ProductSelectorDialog } from "@/components/features/product-selector-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { iconSize } from "@/lib/design-tokens";
import {
  ShoppingCart,
  Sparkles,
  MapPin,
  RefreshCw,
  AlertCircle,
  Search,
  PackageX,
  SlidersHorizontal,
} from "lucide-react";

// ============================================
// Types
// ============================================

interface ShoppingPlanProps {
  hasLocation: boolean;
  householdCity: string | null;
}

// ============================================
// Component
// ============================================

export function ShoppingPlanView({
  hasLocation,
  householdCity,
}: ShoppingPlanProps) {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const { location, isLoading: isGeoLoading } = useGeolocation();
  const refreshPlan = useRefreshShoppingPlan();
  const { data: selectionData } = useProductSelection();

  const { data, isLoading, isFetching, error, triggered, trigger } = useShoppingPlan({
    location,
    isGeoLoading,
    hasHouseholdLocation: hasLocation,
  });

  const canSearch = hasLocation || (location?.city && location.city !== "");

  const selectionSummary = useMemo(() => {
    if (!selectionData) return { totalCatalog: 0, excludedCount: 0, selectedCount: 0, essentialCount: 0 };

    const totalCatalog = selectionData.products.length;
    const excludedCount = selectionData.excludedProductNames.length;
    const essentialCount = selectionData.products.filter((p) => p.isEssential).length;
    // If no exclusions saved, default view is essentials-only
    const selectedCount = excludedCount > 0
      ? totalCatalog - excludedCount
      : essentialCount;

    return { totalCatalog, excludedCount, selectedCount, essentialCount };
  }, [selectionData]);

  // No location available
  if (!canSearch) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-8 text-center">
        <MapPin className={cn(iconSize["2xl"], "text-muted-foreground")} />
        <p className="text-sm text-muted-foreground">
          Activa la geolocalizacion para ver precios cerca tuyo.
        </p>
      </div>
    );
  }

  // Setup state — before the user triggers the search
  if (!triggered && !data) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-6 text-center">
          <Button
            size="lg"
            onClick={() => setSelectorOpen(true)}
            className="gap-2"
          >
            <Search className="h-4 w-4" />
            Buscar precios
          </Button>
          <p className="text-xs text-muted-foreground">
            Compara precios de supermercados cerca tuyo.
          </p>
        </div>

        <ProductSelectorDialog
          open={selectorOpen}
          onOpenChange={setSelectorOpen}
          onSaved={trigger}
          saveLabel="Buscar precios"
        />
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
          <ShoppingCart className="h-4 w-4 animate-pulse text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Consultando precios en supermercados cercanos...
          </p>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-xl border p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-muted" />
              <div>
                <div className="mb-1 h-4 w-24 rounded bg-muted" />
                <div className="h-3 w-16 rounded bg-muted" />
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-8 text-center">
        <AlertCircle className={cn(iconSize["2xl"], "text-muted-foreground")} />
        <p className="text-sm text-muted-foreground">
          No se pudieron cargar los precios. Intenta de nuevo.
        </p>
        <Button variant="outline" size="sm" onClick={() => refreshPlan()}>
          Reintentar
        </Button>
      </div>
    );
  }

  // No data yet (triggered but still loading — fallback)
  if (!data) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-8 text-center">
        <Search className={cn(iconSize["2xl"], "text-muted-foreground")} />
        <p className="text-sm text-muted-foreground">
          Cargando precios...
        </p>
      </div>
    );
  }

  // Results state
  const displayCity = location?.city || householdCity;
  const generatedDate = data.lastUpdated
    ? new Date(data.lastUpdated).toLocaleString("es-AR", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="space-y-3">
      {/* Location + timestamp + refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {displayCity && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {displayCity}
            </span>
          )}
          {generatedDate && (
            <span>{generatedDate}</span>
          )}
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
            {data.totalProductsFound}/{data.totalProductsSearched} productos
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectorOpen(true)}
            className="h-7 gap-1 px-2 text-xs"
          >
            <SlidersHorizontal className="h-3 w-3" />
            Personalizar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refreshPlan()}
            disabled={isFetching}
            className="h-7 gap-1 px-2 text-xs"
          >
            <RefreshCw className={cn("h-3 w-3", isFetching && "animate-spin")} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Recommendation banner */}
      {data.recommendation && (
        <div className="flex items-start gap-2 rounded-lg bg-primary/5 px-3 py-2">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm text-foreground">{data.recommendation}</p>
        </div>
      )}

      {/* Store clusters */}
      {data.stores.length > 0 ? (
        <div className="space-y-3">
          {data.stores.map((store, idx) => (
            <UnifiedStoreCard key={store.storeName} store={store} rank={idx} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-8 text-center">
          <Search className={cn(iconSize["2xl"], "text-muted-foreground")} />
          <p className="text-sm text-muted-foreground">
            No se encontraron precios.
          </p>
        </div>
      )}

      {/* Products not found */}
      {data.productsNotFound.length > 0 && (
        <div className="rounded-lg border border-dashed px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <PackageX className="h-3 w-3" />
            <span className="font-medium">Sin precio encontrado ({data.productsNotFound.length}):</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.productsNotFound.slice(0, 8).join(", ")}
            {data.productsNotFound.length > 8 && ` y ${data.productsNotFound.length - 8} mas`}
          </p>
        </div>
      )}

      <ProductSelectorDialog
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        onSaved={() => refreshPlan()}
      />
    </div>
  );
}
