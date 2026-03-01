"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useShoppingPlan } from "@/hooks/use-shopping-plan";
import { useSavedCarts, useToggleSaveCart, isCartSaved } from "@/hooks/use-saved-items";
import { usePromos, useRefreshPromos, usePromoPipelineStatus, getStorePromos } from "@/hooks/use-promos";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { ProductSearchInput } from "@/components/features/product-search-input";
import { CatalogSheet } from "@/components/features/catalog-sheet";
import { StoreCartCard } from "@/components/features/store-cart-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { iconSize, storeColors } from "@/lib/design-tokens";
import { StoreLogo } from "@/components/ui/store-logo";
import {
  ShoppingCart,
  ShoppingBag,
  ShoppingBasket,
  Search,
  AlertCircle,
  PackageX,
  ListPlus,
  Trophy,
  Milk,
  Wine,
  Drumstick,
  Apple,
  BarChart3,
  ChevronUp,
  ChevronDown,
  Bookmark,
  RefreshCw,
  Tag,
} from "lucide-react";

import type { AlternativeProduct, CartProduct, StoreCart } from "@/lib/supermarket-search";
import type { BankPromo, GroceryCategory, SavedCart } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import type { SaveCartInput } from "@/lib/validations/saved-items";

// ============================================
// Adjusted types (with user overrides applied)
// ============================================

export interface AdjustedCartProduct extends CartProduct {
  isRemoved: boolean;
}

export interface AdjustedStoreCart extends Omit<StoreCart, "products"> {
  products: AdjustedCartProduct[];
}

// ============================================
// Constants
// ============================================

const LOCAL_STORAGE_KEY = "habita:shopping-terms";
const MAX_TERMS = 30;

const QUICK_CATEGORIES: Array<{
  key: GroceryCategory;
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}> = [
  { key: "ALMACEN", label: "Almacen", icon: ShoppingBasket, color: "text-amber-700", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  { key: "LACTEOS", label: "Lacteos", icon: Milk, color: "text-blue-700", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  { key: "BEBIDAS", label: "Bebidas", icon: Wine, color: "text-purple-700", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
  { key: "CARNES", label: "Carnes", icon: Drumstick, color: "text-red-700", bgColor: "bg-red-100 dark:bg-red-900/30" },
  { key: "FRUTAS_VERDURAS", label: "Frutas", icon: Apple, color: "text-green-700", bgColor: "bg-green-100 dark:bg-green-900/30" },
];

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
// Cart overrides
// ============================================

interface CartOverride {
  type: "swap" | "remove";
  alternative?: AlternativeProduct;
}

/** Key for the overrides map: "storeName::searchTerm" */
function overrideKey(storeName: string, searchTerm: string): string {
  return `${storeName}::${searchTerm}`;
}

/** Apply user overrides (swap/remove) to the original API carts. */
function applyOverrides(carts: StoreCart[], overrides: Map<string, CartOverride>): AdjustedStoreCart[] {
  if (overrides.size === 0) {
    return carts.map((cart) => ({
      ...cart,
      products: cart.products.map((p) => ({ ...p, isRemoved: false })),
    }));
  }

  return carts
    .map((cart) => {
      const products = cart.products.map((p) => {
        const key = overrideKey(cart.storeName, p.searchTerm);
        const override = overrides.get(key);

        if (override?.type === "remove") {
          return { ...p, isRemoved: true };
        }

        if (override?.type === "swap" && override.alternative) {
          const alt = override.alternative;
          return {
            ...p,
            isRemoved: false,
            productName: alt.productName,
            price: alt.price,
            listPrice: alt.listPrice,
            link: alt.link,
            unitInfo: alt.unitInfo,
            alternatives: [
              { productName: p.productName, price: p.price, listPrice: p.listPrice, link: p.link, imageUrl: p.imageUrl, unitInfo: p.unitInfo },
              ...p.alternatives.filter((a) => a.link !== alt.link),
            ],
          };
        }

        return { ...p, isRemoved: false };
      });

      const activeProducts = products.filter((p) => !p.isRemoved);
      if (activeProducts.length === 0) return null;

      const totalPrice = activeProducts.reduce((sum, p) => sum + p.price, 0);
      const cheapestCount = activeProducts.filter((p) => p.isCheapest).length;
      return { ...cart, products, totalPrice, cheapestCount };
    })
    .filter((c): c is AdjustedStoreCart => c !== null);
  // Preserve original API ranking — don't re-sort after user overrides
}

// ============================================
// Comparison summary
// ============================================

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

/** Build a human-readable comparison summary from the adjusted carts. */
function buildComparisonSummary(carts: AdjustedStoreCart[]): string {
  if (carts.length === 0) return "No hay supermercados para comparar.";
  if (carts.length === 1) {
    return `Solo se encontraron resultados en ${carts[0]!.storeName} (${formatCurrency(carts[0]!.totalPrice)}).`;
  }

  const winner = carts[0]!;
  const runnerUp = carts[1]!;
  const worst = carts[carts.length - 1]!;
  const savingsVsSecond = Math.round(runnerUp.totalPrice - winner.totalPrice);
  const savingsVsWorst = Math.round(worst.totalPrice - winner.totalPrice);
  const pctVsSecond = Math.round((savingsVsSecond / runnerUp.totalPrice) * 100);

  const lines: string[] = [];

  // Winner headline
  lines.push(
    `${winner.storeName} es la opción más barata con un total de ${formatCurrency(winner.totalPrice)}, ` +
    `${formatCurrency(savingsVsSecond)} menos que ${runnerUp.storeName} (${pctVsSecond}% de ahorro).`,
  );

  // Spread between best and worst
  if (carts.length > 2) {
    lines.push(
      `La diferencia entre el más barato y el más caro (${worst.storeName}, ${formatCurrency(worst.totalPrice)}) ` +
      `es de ${formatCurrency(savingsVsWorst)}.`,
    );
  }

  // Cheapest-product breakdown
  const storesWithCheapest = carts.filter((c) => c.cheapestCount > 0);
  if (storesWithCheapest.length > 0) {
    const cheapestBreakdown = storesWithCheapest
      .map((c) => `${c.storeName} (${c.cheapestCount})`)
      .join(", ");
    lines.push(`Productos al mejor precio por supermercado: ${cheapestBreakdown}.`);
  }

  // Missing products warning
  const storesWithMissing = carts.filter((c) => c.missingTerms.length > 0);
  if (storesWithMissing.length > 0) {
    const missingNote = storesWithMissing
      .map((c) => `${c.storeName} (${c.missingTerms.length})`)
      .join(", ");
    lines.push(`Productos no encontrados: ${missingNote}. Tené en cuenta que un total más bajo puede deberse a que faltan productos.`);
  }

  return lines.join("\n\n");
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
  const [catalogInitialCategory, setCatalogInitialCategory] = useState<GroceryCategory | null>(null);
  const [overrides, setOverrides] = useState<Map<string, CartOverride>>(new Map());
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showPromos, setShowPromos] = useState(false);

  // Load saved terms after hydration to avoid SSR mismatch
  useEffect(() => {
    const saved = loadSavedTerms();
    if (saved.length > 0) setSearchTerms(saved);
  }, []);
  const { data, isLoading, error, search, reset } = useShoppingPlan();

  // Saved carts
  const { data: savedCarts } = useSavedCarts();
  const { toggle: toggleSaveCart, isPending: isSavePending } = useToggleSaveCart();

  // Bank promos
  const { data: promos } = usePromos();
  const refreshPromos = useRefreshPromos();
  const { isRunning: isPromosPipelineRunning, refetchStatus: refetchPromosStatus } = usePromoPipelineStatus();

  const handleToggleSaveCart = useCallback(
    (cart: AdjustedStoreCart) => {
      const existing = isCartSaved(savedCarts, cart.storeName);
      if (existing) {
        toggleSaveCart({ savedCartId: existing.id });
      } else {
        const activeProducts = cart.products.filter((p) => !p.isRemoved);
        const input: SaveCartInput = {
          storeName: cart.storeName,
          searchTerms: searchTerms,
          products: activeProducts.map((p) => ({
            searchTerm: p.searchTerm,
            productName: p.productName,
            price: p.price,
            listPrice: p.listPrice,
            imageUrl: p.imageUrl,
            link: p.link,
            isCheapest: p.isCheapest,
            unitInfo: p.unitInfo,
            alternatives: p.alternatives,
          })),
          totalPrice: cart.totalPrice,
          cheapestCount: cart.cheapestCount,
          missingTerms: cart.missingTerms,
          totalSearched: cart.totalSearched,
        };
        toggleSaveCart({ input });
      }
    },
    [savedCarts, searchTerms, toggleSaveCart],
  );

  const adjustedCarts = useMemo(() => {
    if (!data) return [];
    return applyOverrides(data.storeCarts, overrides);
  }, [data, overrides]);

  const filteredCarts = useMemo(() => {
    if (selectedStores.size === 0) return adjustedCarts;
    return adjustedCarts.filter((c) => selectedStores.has(c.storeName));
  }, [adjustedCarts, selectedStores]);

  const comparisonSummary = useMemo(() => {
    if (filteredCarts.length < 2) return null;
    return buildComparisonSummary(filteredCarts);
  }, [filteredCarts]);

  const toggleStore = useCallback((storeName: string) => {
    setSelectedStores((prev) => {
      const next = new Set(prev);
      if (next.has(storeName)) {
        next.delete(storeName);
      } else {
        next.add(storeName);
      }
      return next;
    });
    setShowComparison(false);
  }, []);

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
    setOverrides(new Map());
    setSelectedStores(new Set());
    setShowComparison(false);
  }, [reset]);

  const swapProduct = useCallback((storeName: string, searchTerm: string, alternative: AlternativeProduct) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      next.set(overrideKey(storeName, searchTerm), { type: "swap", alternative });
      return next;
    });
  }, []);

  const removeProduct = useCallback((storeName: string, searchTerm: string) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      next.set(overrideKey(storeName, searchTerm), { type: "remove" });
      return next;
    });
  }, []);

  const restoreProduct = useCallback((storeName: string, searchTerm: string) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      next.delete(overrideKey(storeName, searchTerm));
      return next;
    });
  }, []);

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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setShowSaved(false); setShowPromos(false); }}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                !showSaved && !showPromos
                  ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              Resultados
            </button>
            <button
              type="button"
              onClick={() => { setShowPromos(true); setShowSaved(false); }}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                showPromos
                  ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Tag className="h-3 w-3" />
              Promos bancarias
              {promos && promos.length > 0 && (
                <span className={cn(
                  "ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                  showPromos ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                )}>
                  {promos.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => { setShowSaved(true); setShowPromos(false); }}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                showSaved
                  ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Bookmark className="h-3 w-3" />
              Guardados
              {savedCarts && savedCarts.length > 0 && (
                <span className={cn(
                  "ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                  showSaved ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                )}>
                  {savedCarts.length}
                </span>
              )}
            </button>
          </div>
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

        {/* Promos view */}
        {showPromos && (
          <PromosView
            promos={promos}
            isRunning={isPromosPipelineRunning}
            onRefresh={async () => { await refreshPromos(); refetchPromosStatus(); }}
          />
        )}

        {/* Saved carts view */}
        {showSaved && !showPromos && (
          <SavedCartsView
            savedCarts={savedCarts}
            toggleSaveCart={toggleSaveCart}
            isSavePending={isSavePending}
          />
        )}

        {/* Results content (hidden when showing saved/promos) */}
        {!showSaved && !showPromos && (
          <>
            {/* Searched date */}
            <span className="text-xs text-muted-foreground">{searchedDate}</span>

            {/* Comparison bar — toggleable store chips */}
            {adjustedCarts.length > 1 && (
              <div className="flex gap-2 overflow-x-auto px-0.5 py-0.5">
                {adjustedCarts.map((cart, idx) => {
                  const isWinner = idx === 0;
                  const isSelected = selectedStores.size === 0 || selectedStores.has(cart.storeName);
                  return (
                    <button
                      type="button"
                      key={cart.storeName}
                      onClick={() => toggleStore(cart.storeName)}
                      className={cn(
                        "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                        isSelected
                          ? isWinner
                            ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                            : "bg-muted/80 text-foreground ring-1 ring-border"
                          : "bg-muted/30 text-muted-foreground/50",
                      )}
                    >
                      <StoreLogo storeName={cart.storeName} sizeClass="h-4 w-4" fallbackFontClass="text-[7px]" />
                      {isWinner && isSelected && <Trophy className="h-3 w-3 text-amber-500" />}
                      <span className="tabular-nums">
                        ${cart.totalPrice.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Comparar button + summary panel */}
            {comparisonSummary && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowComparison((prev) => !prev)}
                  className={cn(
                    "flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium transition-colors",
                    showComparison
                      ? "bg-primary/10 text-primary"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {showComparison ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5" />
                      Ocultar comparacion
                    </>
                  ) : (
                    <>
                      <BarChart3 className="h-3.5 w-3.5" />
                      Comparar
                    </>
                  )}
                </button>
                {showComparison && (
                  <div className="mt-2 rounded-xl border bg-card px-4 py-3">
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold">
                      <BarChart3 className="h-3.5 w-3.5 text-primary" />
                      Resumen comparativo
                    </p>
                    {comparisonSummary.split("\n\n").map((paragraph) => (
                      <p key={paragraph.slice(0, 40)} className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Store carts */}
            {filteredCarts.length > 0 ? (
              <div className="space-y-3">
                {filteredCarts.map((cart, idx) => (
                  <StoreCartCard
                    key={cart.storeName}
                    cart={cart}
                    rank={idx}
                    isComplete={cart.missingTerms.length === 0}
                    onSwapProduct={(searchTerm, alt) => swapProduct(cart.storeName, searchTerm, alt)}
                    onRemoveProduct={(searchTerm) => removeProduct(cart.storeName, searchTerm)}
                    onRestoreProduct={(searchTerm) => restoreProduct(cart.storeName, searchTerm)}
                    isSaved={!!isCartSaved(savedCarts, cart.storeName)}
                    isSavePending={isSavePending}
                    onToggleSave={() => handleToggleSaveCart(cart)}
                    promos={getStorePromos(promos, cart.storeName)}
                  />
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
          </>
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
        <div className="space-y-2">
          {Object.keys(storeColors).map((name, idx) => (
            <div
              key={name}
              className="animate-stagger-fade-in flex items-center gap-3 rounded-xl border px-3 py-2.5"
              style={{ '--stagger-index': idx } as React.CSSProperties}
            >
              <StoreLogo storeName={name} sizeClass="h-8 w-8" radiusClass="rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <p className="text-xs font-medium">{name}</p>
                <div className="h-2 w-3/4 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
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
      {/* Chips (visible when there are saved carts or promos) */}
      {((savedCarts && savedCarts.length > 0) || (promos && promos.length > 0)) && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setShowSaved(false); setShowPromos(false); }}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              !showSaved && !showPromos
                ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            Buscar
          </button>
          <button
            type="button"
            onClick={() => { setShowPromos(true); setShowSaved(false); }}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              showPromos
                ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Tag className="h-3 w-3" />
            Promos bancarias
            {promos && promos.length > 0 && (
              <span className={cn(
                "ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                showPromos ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
              )}>
                {promos.length}
              </span>
            )}
          </button>
          {savedCarts && savedCarts.length > 0 && (
            <button
              type="button"
              onClick={() => { setShowSaved(true); setShowPromos(false); }}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                showSaved
                  ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Bookmark className="h-3 w-3" />
              Guardados
              <span className={cn(
                "ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                showSaved ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
              )}>
                {savedCarts.length}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Promos view (input state) */}
      {showPromos ? (
        <PromosView
          promos={promos}
          isRunning={isPromosPipelineRunning}
          onRefresh={async () => { await refreshPromos(); refetchPromosStatus(); }}
        />
      ) : showSaved ? (
        <SavedCartsView
          savedCarts={savedCarts}
          toggleSaveCart={toggleSaveCart}
          isSavePending={isSavePending}
        />
      ) : (
        <>
          {/* Empty state — motivational hero when no terms yet */}
          {searchTerms.length === 0 && (
            <div className="animate-fade-in flex flex-col items-center gap-2 py-6 text-center">
              <ShoppingBag className={cn(iconSize["3xl"], "text-primary/70")} />
              <h2 className="text-base font-semibold">
                Armá tu lista y encontrá el mejor precio
              </h2>
              <p className="max-w-xs text-xs text-muted-foreground">
                Agregá productos, compará 11 supermercados y descubrí dónde conviene.
              </p>
            </div>
          )}

          <ProductSearchInput
        searchTerms={searchTerms}
        onAdd={addTerm}
        onRemove={removeTerm}
      />

      {/* Category quick-start pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {QUICK_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => {
                setCatalogInitialCategory(cat.key);
                setCatalogOpen(true);
              }}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                cat.bgColor, cat.color,
                "hover:opacity-80",
              )}
            >
              <Icon className={iconSize.xs} />
              {cat.label}
            </button>
          );
        })}
      </div>

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

          {/* Store logos strip */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground/60">Buscamos en</span>
            <div className="flex gap-1">
              {Object.keys(storeColors).map((name) => (
                <StoreLogo key={name} storeName={name} sizeClass="h-5 w-5" fallbackFontClass="text-[8px]" />
              ))}
            </div>
          </div>

          <CatalogSheet
            open={catalogOpen}
            onOpenChange={(open) => {
              setCatalogOpen(open);
              if (!open) setCatalogInitialCategory(null);
            }}
            selectedTerms={searchTerms}
            onAddTerm={addTerm}
            initialCategory={catalogInitialCategory}
          />
        </>
      )}
    </div>
  );
}

// ============================================
// Promos View
// ============================================

import { scorePromo, scoreStore, parseDaysOfWeek, getTodayDayName } from "@/lib/promos/scoring";

interface PromosViewProps {
  promos: BankPromo[] | undefined;
  isRunning: boolean;
  onRefresh: () => Promise<void>;
}

/** Format daysOfWeek JSON array into a human-readable label. */
function formatDays(daysOfWeek: string): string {
  const days = parseDaysOfWeek(daysOfWeek);
  if (days.length === 0) return "Todos los días";
  if (days.length === 7) return "Todos los días";
  return days.join(", ");
}

/** Format capAmount to a readable string. */
function formatCap(capAmount: number | null): string | null {
  if (!capAmount) return null;
  return `$${capAmount.toLocaleString("es-AR")}`;
}

/** Parse a JSON array string, returning empty array on failure. */
function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Simple fuzzy match: all query chars exist in target in order, case-insensitive. */
function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

/** Best promo per bank within a store. */
interface BankBestPromo {
  bankSlug: string;
  bankDisplayName: string;
  bestPromo: BankPromo;
  /** All promos from this bank in this store, sorted by score. */
  allPromos: BankPromo[];
}

/** A store with its promos organized by bank. */
interface StorePromoGroup {
  storeName: string;
  storeScore: number;
  bankGroups: BankBestPromo[];
  totalPromos: number;
}

function PromosView({ promos, isRunning, onRefresh }: PromosViewProps) {
  const [bankFilter, setBankFilter] = useState("");
  const [expandedStores, setExpandedStores] = useState<Set<string>>(new Set());
  const todayName = getTodayDayName();

  const toggleStore = useCallback((storeName: string) => {
    setExpandedStores((prev) => {
      const next = new Set(prev);
      if (next.has(storeName)) {
        next.delete(storeName);
      } else {
        next.add(storeName);
      }
      return next;
    });
  }, []);

  // Group promos by store → by bank, pick best per bank, sort by score
  const storeGroups = useMemo((): StorePromoGroup[] => {
    if (!promos || promos.length === 0) return [];

    // Apply bank filter first
    const filtered = bankFilter.trim()
      ? promos.filter((p) => fuzzyMatch(bankFilter, p.bankDisplayName))
      : promos;

    if (filtered.length === 0) return [];

    // Group by store
    const storeMap = new Map<string, BankPromo[]>();
    for (const promo of filtered) {
      const existing = storeMap.get(promo.storeName);
      if (existing) {
        existing.push(promo);
      } else {
        storeMap.set(promo.storeName, [promo]);
      }
    }

    return Array.from(storeMap.entries())
      .map(([storeName, storePromos]) => {
        // Within each store, group by bank
        const bankMap = new Map<string, BankPromo[]>();
        for (const promo of storePromos) {
          const existing = bankMap.get(promo.bankSlug);
          if (existing) {
            existing.push(promo);
          } else {
            bankMap.set(promo.bankSlug, [promo]);
          }
        }

        // Build bank groups: best promo per bank, sorted by score
        const bankGroups: BankBestPromo[] = Array.from(bankMap.entries())
          .map(([bankSlug, bankPromos]) => {
            const sorted = [...bankPromos].sort(
              (a, b) => scorePromo(b, todayName) - scorePromo(a, todayName),
            );
            return {
              bankSlug,
              bankDisplayName: sorted[0]!.bankDisplayName,
              bestPromo: sorted[0]!,
              allPromos: sorted,
            };
          })
          .sort((a, b) => scorePromo(b.bestPromo, todayName) - scorePromo(a.bestPromo, todayName));

        return {
          storeName,
          storeScore: scoreStore(storePromos, todayName),
          bankGroups,
          totalPromos: storePromos.length,
        };
      })
      .sort((a, b) => b.storeScore - a.storeScore);
  }, [promos, todayName, bankFilter]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className={cn(iconSize.sm, "text-green-600 dark:text-green-400")} />
          <h3 className="text-sm font-semibold">Promos bancarias</h3>
          {promos && promos.length > 0 && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-400">
              {promos.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRunning}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
            "disabled:opacity-50",
          )}
        >
          <RefreshCw className={cn("h-3 w-3", isRunning && "animate-spin")} />
          {isRunning ? "Buscando..." : "Actualizar"}
        </button>
      </div>

      {/* Pipeline running indicator */}
      {isRunning && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950/30">
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-green-600 dark:text-green-400" />
          <p className="text-xs text-green-700 dark:text-green-400">
            Buscando promociones bancarias en supermercados...
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isRunning && (!promos || promos.length === 0) && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-8 text-center">
          <Tag className={cn(iconSize["2xl"], "text-muted-foreground")} />
          <p className="text-sm font-medium text-muted-foreground">No hay promos cargadas</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Tocá &quot;Actualizar&quot; para buscar descuentos bancarios en supermercados.
          </p>
        </div>
      )}

      {/* Bank search */}
      {promos && promos.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={bankFilter}
            onChange={(e) => setBankFilter(e.target.value)}
            placeholder="Buscar banco..."
            className={cn(
              "w-full rounded-xl border bg-background py-2 pl-9 pr-3 text-sm",
              "placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-green-500/30",
            )}
          />
        </div>
      )}

      {/* Store cards with bank promos */}
      {storeGroups.map(({ storeName, bankGroups, totalPromos: storeTotal }) => {
        const isExpanded = expandedStores.has(storeName);
        const extraPromos = storeTotal - bankGroups.length;

        return (
          <div key={storeName} className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            {/* Store header */}
            <div className="flex items-center gap-3 p-4 pb-3">
              <StoreLogo storeName={storeName} sizeClass="h-8 w-8" radiusClass="rounded-xl" fallbackFontClass="text-xs" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold">{storeName}</h4>
                <p className="text-xs text-muted-foreground">
                  {bankGroups.length} banco{bankGroups.length !== 1 ? "s" : ""} · {storeTotal} promo{storeTotal !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Best promo per bank (always visible) */}
            <div className="border-t">
              {bankGroups.map(({ bankSlug, bestPromo }) => {
                const cap = formatCap(bestPromo.capAmount);
                return (
                  <div
                    key={bankSlug}
                    className="flex items-center gap-2 border-b px-4 py-2 last:border-b-0"
                  >
                    <span className="rounded-md bg-green-100 px-1.5 py-0.5 text-[11px] font-bold text-green-700 dark:bg-green-900/40 dark:text-green-400">
                      {bestPromo.discountPercent}%
                    </span>
                    <span className="text-sm font-medium">{bestPromo.bankDisplayName}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDays(bestPromo.daysOfWeek)}
                    </span>
                    {cap && (
                      <span className="text-[11px] text-muted-foreground">· Tope: {cap}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Expand toggle (only if there are more promos) */}
            {extraPromos > 0 && (
              <button
                type="button"
                onClick={() => toggleStore(storeName)}
                className="flex w-full items-center justify-center gap-1 border-t py-2 text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
              >
                <ChevronDown className={cn(
                  "h-3 w-3 transition-transform duration-200",
                  isExpanded && "rotate-180",
                )} />
                {isExpanded ? "Ocultar" : `Ver ${extraPromos} promo${extraPromos !== 1 ? "s" : ""} más`}
              </button>
            )}

            {/* Expanded: all promos per bank */}
            {isExpanded && (
              <div className="border-t bg-muted/10">
                {bankGroups
                  .filter((bg) => bg.allPromos.length > 1)
                  .map(({ bankSlug, bankDisplayName, allPromos }) => (
                    <div key={bankSlug}>
                      {/* Bank sub-header */}
                      <div className="bg-muted/30 px-4 py-1.5">
                        <span className="text-xs font-medium">{bankDisplayName}</span>
                      </div>
                      {/* All promos except the best (already shown above) */}
                      {allPromos.slice(1).map((promo) => {
                        const paymentMethods = parseJsonArray(promo.paymentMethods);
                        const cap = formatCap(promo.capAmount);
                        return (
                          <div
                            key={promo.id}
                            className="flex items-start border-b px-4 py-2 last:border-b-0"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="rounded-md bg-green-100/60 px-1.5 py-0.5 text-[11px] font-bold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                  {promo.discountPercent}%
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDays(promo.daysOfWeek)}
                                </span>
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                {paymentMethods.length > 0 && (
                                  <span className="text-[11px] text-muted-foreground">{paymentMethods.join(", ")}</span>
                                )}
                                {cap && (
                                  <span className="text-[11px] text-muted-foreground">Tope: {cap}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
              </div>
            )}
          </div>
        );
      })}

      {/* No results for bank search */}
      {promos && promos.length > 0 && storeGroups.length === 0 && bankFilter.trim() && (
        <p className="py-4 text-center text-xs text-muted-foreground">
          No se encontraron promos para &quot;{bankFilter}&quot;
        </p>
      )}
    </div>
  );
}

// ============================================
// Saved Carts View
// ============================================

interface SavedCartsViewProps {
  savedCarts: SavedCart[] | undefined;
  toggleSaveCart: (params: { savedCartId?: string; input?: SaveCartInput }) => void;
  isSavePending: boolean;
}

function SavedCartsView({ savedCarts, toggleSaveCart, isSavePending }: SavedCartsViewProps) {
  const queryClient = useQueryClient();
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const handleRefresh = useCallback(async (savedCartId: string) => {
    setRefreshingId(savedCartId);
    try {
      await apiFetch("/api/saved-items/deals/refresh", {
        method: "POST",
        body: { savedCartId },
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.saved.deals() });
    } catch {
      // Error handled silently
    } finally {
      setRefreshingId(null);
    }
  }, [queryClient]);

  if (!savedCarts || savedCarts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-8 text-center">
        <Bookmark className={cn(iconSize["2xl"], "text-muted-foreground")} />
        <p className="text-sm font-medium text-muted-foreground">No tenés carritos guardados</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Buscá precios y guardá el carrito de un super tocando el marcador en la tarjeta.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {savedCarts.map((cart) => {
        const products = cart.products as unknown as Array<Record<string, unknown>>;
        const savedDate = new Date(cart.savedAt).toLocaleString("es-AR", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        const isRefreshing = refreshingId === cart.id;

        return (
          <div key={cart.id} className="rounded-2xl border bg-card shadow-sm">
            {/* Store header */}
            <div className="flex items-center justify-between p-4 pb-2">
              <div className="flex items-center gap-3">
                <StoreLogo storeName={cart.storeName} sizeClass="h-8 w-8" radiusClass="rounded-xl" fallbackFontClass="text-xs" />
                <div>
                  <h3 className="text-sm font-semibold">{cart.storeName}</h3>
                  <p className="text-xs text-muted-foreground">
                    {products.length} producto{products.length !== 1 ? "s" : ""} · {savedDate}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleRefresh(cart.id)}
                  disabled={refreshingId !== null}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                    "disabled:opacity-50",
                  )}
                >
                  <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
                  {isRefreshing ? "Actualizando..." : "Actualizar"}
                </button>
                <button
                  type="button"
                  onClick={() => toggleSaveCart({ savedCartId: cart.id })}
                  disabled={isSavePending}
                  className={cn(
                    "flex items-center justify-center rounded-full p-1.5 text-xs transition-colors",
                    "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
                    "disabled:opacity-50",
                  )}
                  title="Eliminar carrito guardado"
                >
                  <Bookmark className="h-3.5 w-3.5 fill-current" />
                </button>
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between border-t px-4 py-2.5">
              <span className="text-xs font-medium text-muted-foreground">Total</span>
              <span className="text-sm font-bold tabular-nums">
                {formatCurrency(cart.totalPrice)}
              </span>
            </div>

            {/* Product list (read-only) */}
            <div className="border-t">
              {products.map((product, idx) => {
                const name = String(product["productName"] ?? "");
                const price = Number(product["price"] ?? 0);
                const term = String(product["searchTerm"] ?? "");
                return (
                  <div key={`${term}-${idx}`} className="flex items-center justify-between px-4 py-2 transition-colors hover:bg-muted/20">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{name}</p>
                      <p className="text-[11px] text-muted-foreground/70">{term}</p>
                    </div>
                    <span className="ml-2 shrink-0 text-sm font-medium tabular-nums">
                      {formatCurrency(price)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Missing terms */}
            {cart.missingTerms.length > 0 && (
              <div className="border-t px-4 py-2">
                <p className="text-[11px] text-muted-foreground">
                  <PackageX className="mr-1 inline h-3 w-3" />
                  Sin resultados: {cart.missingTerms.join(", ")}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
