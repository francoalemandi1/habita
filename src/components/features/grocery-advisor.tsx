"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useShoppingPlan } from "@/hooks/use-shopping-plan";
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
} from "lucide-react";

import type { AlternativeProduct, CartProduct, StoreCart } from "@/lib/supermarket-search";
import type { GroceryCategory } from "@prisma/client";
import type { LucideIcon } from "lucide-react";

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

  // Load saved terms after hydration to avoid SSR mismatch
  useEffect(() => {
    const saved = loadSavedTerms();
    if (saved.length > 0) setSearchTerms(saved);
  }, []);
  const { data, isLoading, error, search, reset } = useShoppingPlan();

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
    </div>
  );
}
