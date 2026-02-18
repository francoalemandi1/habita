"use client";

import { useState, useCallback, useEffect } from "react";
import { useShoppingPlan } from "@/hooks/use-shopping-plan";
import { ProductSearchInput } from "@/components/features/product-search-input";
import { CatalogSheet } from "@/components/features/catalog-sheet";
import { StoreCartCard } from "@/components/features/store-cart-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { iconSize } from "@/lib/design-tokens";
import {
  ShoppingCart,
  Search,
  AlertCircle,
  PackageX,
  ListPlus,
} from "lucide-react";

// ============================================
// Constants
// ============================================

const LOCAL_STORAGE_KEY = "habita:shopping-terms";
const MAX_TERMS = 30;

function loadSavedTerms(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((t): t is string => typeof t === "string");
  } catch {
    // Corrupted data — ignore
  }
  return [];
}

function saveTerms(terms: string[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(terms));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

// ============================================
// Component
// ============================================

interface ShoppingPlanProps {
  hasLocation: boolean;
  householdCity: string | null;
}

export function ShoppingPlanView(_props: ShoppingPlanProps) {
  const [searchTerms, setSearchTerms] = useState<string[]>([]);
  const [catalogOpen, setCatalogOpen] = useState(false);

  // Load saved terms after hydration to avoid SSR mismatch
  useEffect(() => {
    const saved = loadSavedTerms();
    if (saved.length > 0) setSearchTerms(saved);
  }, []);
  const { data, isLoading, error, search, reset } = useShoppingPlan();

  const addTerm = useCallback((term: string) => {
    setSearchTerms((prev) => {
      if (prev.length >= MAX_TERMS) return prev;
      const isDuplicate = prev.some((t) => t.toLowerCase() === term.toLowerCase());
      if (isDuplicate) return prev;
      const next = [...prev, term];
      saveTerms(next);
      return next;
    });
  }, []);

  const removeTerm = useCallback((term: string) => {
    setSearchTerms((prev) => {
      const next = prev.filter((t) => t !== term);
      saveTerms(next);
      return next;
    });
  }, []);

  const handleSearch = useCallback(() => {
    if (searchTerms.length === 0) return;
    search(searchTerms);
  }, [searchTerms, search]);

  const handleNewSearch = useCallback(() => {
    reset();
  }, [reset]);

  // ── Results state ──
  if (data) {
    const searchedDate = new Date(data.searchedAt).toLocaleString("es-AR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{searchedDate}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewSearch}
            className="h-7 gap-1 px-2 text-xs"
          >
            <Search className="h-3 w-3" />
            Nueva busqueda
          </Button>
        </div>

        {/* Store carts */}
        {data.storeCarts.length > 0 ? (
          <div className="space-y-3">
            {data.storeCarts.map((cart, idx) => (
              <StoreCartCard key={cart.storeName} cart={cart} rank={idx} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-8 text-center">
            <Search className={cn(iconSize["2xl"], "text-muted-foreground")} />
            <p className="text-sm text-muted-foreground">
              No se encontraron precios para estos productos.
            </p>
          </div>
        )}

        {/* Not found */}
        {data.notFound.length > 0 && (
          <div className="rounded-lg border border-dashed px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <PackageX className="h-3 w-3" />
              <span className="font-medium">
                Sin resultados ({data.notFound.length}):
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.notFound.join(", ")}
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
          <ShoppingCart className="h-4 w-4 animate-pulse text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Buscando precios en supermercados...
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

  // ── Error state ──
  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-8 text-center">
          <AlertCircle className={cn(iconSize["2xl"], "text-muted-foreground")} />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={handleSearch}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  // ── Input state (default) ──
  return (
    <div className="space-y-4">
      <ProductSearchInput
        searchTerms={searchTerms}
        onAdd={addTerm}
        onRemove={removeTerm}
      />

      <div className="flex items-center gap-2">
        <Button
          onClick={handleSearch}
          disabled={searchTerms.length === 0}
          className="gap-2"
        >
          <Search className="h-4 w-4" />
          Buscar precios
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCatalogOpen(true)}
          className="gap-1.5 text-xs text-muted-foreground"
        >
          <ListPlus className="h-3.5 w-3.5" />
          Ver catalogo
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Compara precios en 11 supermercados de todo el pais.
      </p>

      <CatalogSheet
        open={catalogOpen}
        onOpenChange={setCatalogOpen}
        selectedTerms={searchTerms}
        onAddTerm={addTerm}
      />
    </div>
  );
}
