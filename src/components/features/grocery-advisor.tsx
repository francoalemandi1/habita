"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useShoppingPlan } from "@/hooks/use-shopping-plan";
import { useProductSelection } from "@/hooks/use-product-selection";
import { usePaymentMethod, PAYMENT_METHOD_OPTIONS } from "@/hooks/use-payment-method";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSavedCarts, useToggleSaveCart, isCartSaved } from "@/hooks/use-saved-items";
import { usePromos, useRefreshPromos, usePromoPipelineStatus, getStorePromos } from "@/hooks/use-promos";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { SectionGuideCard } from "@/components/features/section-guide-card";
import { useMilestone } from "@/hooks/use-milestone";
import { useCelebration } from "@/hooks/use-celebration";
import { wasSectionToured } from "@/hooks/use-guided-tour";
import { ProductSearchInput, normalizeProductTerm } from "@/components/features/product-search-input";
import { loadSearchItems as loadSavedSearchItems, saveSearchItems } from "@/lib/shopping-cart-storage";
import { CatalogSheet } from "@/components/features/catalog-sheet";
import { StoreCartCard } from "@/components/features/store-cart-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFirstVisit } from "@/hooks/use-first-visit";
import { iconSize, storeColors } from "@/lib/design-tokens";
import { StoreLogo } from "@/components/ui/store-logo";
import {
  ShoppingCart,
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
  Undo2,
  Plus,
  Check,
  X,
  ChevronDown as ChevronDownIcon,
} from "lucide-react";

import { AddExpenseDialog } from "@/components/features/add-expense-dialog";
import type { AlternativeProduct, CartProduct, SearchItem, ShoppingPlanResult, StoreCart } from "@/lib/supermarket-search";
import type { BankPromo, ExpenseCategory, GroceryCategory, SavedCart } from "@prisma/client";
import type { MemberOption } from "@/types/expense";
import type { QuickAddDefaults } from "@/components/features/add-expense-dialog";
import type { CreateExpensePayload } from "@/components/features/expenses-view";
import type { LucideIcon } from "lucide-react";
import type { SaveCartInput } from "@/lib/validations/saved-items";

// ============================================
// Adjusted types (with user overrides applied)
// ============================================

export interface AdjustedCartProduct extends CartProduct {
  // No removed/added/outOfStock states — the card is read-only, swap-only
}

export interface AdjustedStoreCart extends Omit<StoreCart, "products"> {
  products: AdjustedCartProduct[];
}

// ============================================
// Constants
// ============================================

const MAX_TERMS = 30;

const QUICK_CATEGORIES: Array<{
  key: GroceryCategory;
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}> = [
  { key: "ALMACEN", label: "Almacen", icon: ShoppingBasket, color: "text-amber-700 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  { key: "LACTEOS", label: "Lacteos", icon: Milk, color: "text-blue-700 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  { key: "BEBIDAS", label: "Bebidas", icon: Wine, color: "text-purple-700 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
  { key: "CARNES", label: "Carnes", icon: Drumstick, color: "text-red-700 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/30" },
  { key: "FRUTAS_VERDURAS", label: "Frutas", icon: Apple, color: "text-green-700 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/30" },
];

function mergeSearchItems(items: SearchItem[]): SearchItem[] {
  const map = new Map<string, SearchItem>();
  for (const item of items) {
    const normalized = normalizeProductTerm(item.term);
    if (!normalized) continue;
    const existing = map.get(normalized);
    if (existing) {
      existing.quantity += Math.max(1, Math.floor(item.quantity));
      continue;
    }
    map.set(normalized, {
      term: item.term.trim(),
      quantity: Math.max(1, Math.floor(item.quantity)),
    });
  }
  return Array.from(map.values());
}

// ============================================
// Cart overrides
// ============================================

interface CartOverride {
  type?: "swap";
  alternative?: AlternativeProduct;
}

/** Key for the overrides map: "storeName::searchTerm" */
function overrideKey(storeName: string, searchTerm: string): string {
  return `${storeName}::${searchTerm}`;
}

/** Apply user overrides (swap/remove) to the original API carts. */
function applyOverrides(
  carts: StoreCart[],
  overrides: Map<string, CartOverride>,
  searchItems: SearchItem[],
): AdjustedStoreCart[] {
  const quantityByTerm = new Map(searchItems.map((item) => [item.term, item.quantity]));

  return carts
    .map((cart) => {
      const products = cart.products.map((p) => {
        const key = overrideKey(cart.storeName, p.searchTerm);
        const override = overrides.get(key);
        const quantity = quantityByTerm.get(p.searchTerm) ?? p.quantity ?? 1;
        const base: AdjustedCartProduct = {
          ...p,
          quantity,
          lineTotal: p.price * quantity,
        };

        if (override?.type === "swap" && override.alternative) {
          const alt = override.alternative;
          return {
            ...base,
            productName: alt.productName,
            price: alt.price,
            lineTotal: alt.price * quantity,
            listPrice: alt.listPrice,
            imageUrl: alt.imageUrl,
            link: alt.link,
            unitInfo: alt.unitInfo,
            alternatives: [
              { productName: p.productName, price: p.price, listPrice: p.listPrice, link: p.link, imageUrl: p.imageUrl, unitInfo: p.unitInfo },
              ...p.alternatives.filter((a) => a.link !== alt.link),
            ],
          };
        }

        return base;
      });

      const totalPrice = products.reduce((sum, p) => sum + p.lineTotal, 0);
      const cheapestCount = products.filter((p) => p.isCheapest).length;
      return { ...cart, products, totalPrice, cheapestCount };
    });
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

// ============================================
// PaymentMethodPicker
// ============================================

function PaymentMethodPicker({
  paymentMethods,
  onToggle,
}: {
  paymentMethods: { bankSlug: string; label: string }[];
  onToggle: (method: { bankSlug: string; label: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = query
    ? PAYMENT_METHOD_OPTIONS.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase()),
      )
    : PAYMENT_METHOD_OPTIONS;

  const hasSelected = paymentMethods.length > 0;

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium text-muted-foreground">¿Con qué pagás?</p>

      {/* Selected chips */}
      {hasSelected && (
        <div className="-mx-4 flex flex-wrap gap-1.5 px-4">
          {paymentMethods.map((m) => (
            <button
              key={m.bankSlug}
              type="button"
              onClick={() => onToggle(m)}
              className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-all active:scale-[0.97]"
            >
              {m.label}
              <span className="ml-0.5 opacity-70">×</span>
            </button>
          ))}
        </div>
      )}

      {/* Popover trigger */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 active:scale-[0.97]",
              "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Plus className="h-3 w-3" />
            {hasSelected ? "Agregar otro" : "Agregar banco o billetera"}
            <ChevronDownIcon className="h-3 w-3 opacity-60" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          {/* Search input */}
          <div className="border-b p-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar banco o billetera..."
              className="w-full rounded-md bg-muted/50 px-3 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
              autoFocus
            />
          </div>
          {/* Options list */}
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</p>
            ) : (
              filtered.map((option) => {
                const isSelected = paymentMethods.some((m) => m.bankSlug === option.bankSlug);
                return (
                  <button
                    key={option.bankSlug}
                    type="button"
                    onClick={() => { onToggle(option); setQuery(""); }}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-muted/60",
                      isSelected && "text-primary",
                    )}
                  >
                    <span className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                      isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                    )}>
                      {isSelected && <Check className="h-3 w-3" />}
                    </span>
                    {option.label}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface ShoppingPlanProps {
  hasLocation: boolean;
  householdCity: string | null;
}

export function ShoppingPlanView(props: ShoppingPlanProps) {
  const { isFirstVisit: isFirstVisitAhorra, dismiss: dismissAhorra } = useFirstVisit("ahorra");
  const searchMilestone = useMilestone("first-search");
  const { celebrate } = useCelebration();
  const { paymentMethods, togglePaymentMethod } = usePaymentMethod();
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [searchItems, setSearchItems] = useState<SearchItem[]>([]);
  const [lastSearchedTerms, setLastSearchedTerms] = useState<Set<string>>(new Set());
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogInitialCategory, setCatalogInitialCategory] = useState<GroceryCategory | null>(null);
  const [overrides, setOverrides] = useState<Map<string, CartOverride>>(new Map());
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());
  const [pinnedStore, setPinnedStore] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showPromos, setShowPromos] = useState(false);
  const [clearUndoSnapshot, setClearUndoSnapshot] = useState<SearchItem[] | null>(null);

  // Register as expense
  const [expenseDefaults, setExpenseDefaults] = useState<QuickAddDefaults | null>(null);

  const { data: membersData } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const res = await apiFetch<{ members: Array<{ id: string; name: string; userId: string | null }> }>("/api/members");
      return res;
    },
  });
  const { data: meData } = useQuery({
    queryKey: ["members", "me"],
    queryFn: async () => {
      const res = await apiFetch<{ member: { id: string } | null }>("/api/members/me");
      return res;
    },
  });
  const members: MemberOption[] = (membersData?.members ?? []).map((m) => ({ id: m.id, name: m.name }));
  const currentMemberId = meData?.member?.id ?? "";

  const handleRegisterAsExpense = useCallback((storeName: string, totalPrice: number) => {
    setExpenseDefaults({
      title: storeName,
      amount: Math.round(totalPrice),
      category: "GROCERIES" as ExpenseCategory,
    });
  }, []);

  const handleExpenseCreated = useCallback(async (payload: CreateExpensePayload) => {
    await apiFetch("/api/expenses", {
      method: "POST",
      body: {
        title: payload.title,
        amount: payload.amount,
        category: payload.category,
        paidById: payload.paidById,
        splitType: payload.splitType,
        splits: payload.splits,
        notes: payload.notes,
      },
    });
  }, []);

  // Load saved terms after hydration to avoid SSR mismatch
  useEffect(() => {
    const saved = loadSavedSearchItems();
    if (saved.length > 0) setSearchItems(saved);
  }, []);

  // Request user location once — used for "Cómo llegar" Maps links
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => { /* permission denied or unavailable — silently ignore */ },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
  }, []);
  const { data, isLoading, error, search, reset, restore } = useShoppingPlan();
  const undoSnapshot = useRef<{
    data: ShoppingPlanResult;
    overrides: Map<string, CartOverride>;
    selectedStores: Set<string>;
  } | null>(null);
  const searchTerms = useMemo(() => searchItems.map((item) => item.term), [searchItems]);

  const hasResults = (data?.storeCarts?.length ?? 0) > 0;

  const newItems = useMemo(() => {
    if (!hasResults || lastSearchedTerms.size === 0) return [];
    return searchItems.filter((i) => !lastSearchedTerms.has(normalizeProductTerm(i.term)));
  }, [searchItems, lastSearchedTerms, hasResults]);

  // Saved carts
  // Product catalog for autocomplete
  const { data: catalogData } = useProductSelection();

  const { data: savedCarts } = useSavedCarts();
  const { toggle: toggleSaveCart, isPending: isSavePending } = useToggleSaveCart();

  // Bank promos
  const { data: promos, isSuccess: isPromosLoaded } = usePromos();
  const refreshPromos = useRefreshPromos();
  const { isRunning: isPromosPipelineRunning, refetchStatus: refetchPromosStatus } = usePromoPipelineStatus();

  // Auto-trigger pipeline on first load if no promos exist yet
  useEffect(() => {
    if (isPromosLoaded && promos?.length === 0 && !isPromosPipelineRunning) {
      void refreshPromos().then(() => refetchPromosStatus());
    }
    // Only run once after the initial data load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPromosLoaded]);

  const handleToggleSaveCart = useCallback(
    (cart: AdjustedStoreCart) => {
      const existing = isCartSaved(savedCarts, cart.storeName);
      if (existing) {
        toggleSaveCart({ savedCartId: existing.id });
      } else {
        const activeProducts = cart.products;
        const input: SaveCartInput = {
          storeName: cart.storeName,
          searchTerms: searchTerms,
          searchItems,
          products: activeProducts.map((p) => ({
            searchTerm: p.searchTerm,
            quantity: p.quantity,
            productName: p.productName,
            price: p.price,
            lineTotal: p.lineTotal,
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
    [savedCarts, searchItems, searchTerms, toggleSaveCart],
  );

  const adjustedCarts = useMemo(() => {
    if (!data) return [];
    return applyOverrides(data.storeCarts, overrides, searchItems);
  }, [data, overrides, searchItems]);

  const filteredCarts = useMemo(() => {
    const base = selectedStores.size === 0 ? adjustedCarts : adjustedCarts.filter((c) => selectedStores.has(c.storeName));
    if (!pinnedStore) return base;
    return [...base].sort((a, b) => {
      if (a.storeName === pinnedStore) return -1;
      if (b.storeName === pinnedStore) return 1;
      return 0;
    });
  }, [adjustedCarts, selectedStores, pinnedStore]);

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
    setSearchItems((prev) => {
      if (prev.length >= MAX_TERMS) return prev;
      const normalized = normalizeProductTerm(term);
      const duplicate = prev.find((item) => normalizeProductTerm(item.term) === normalized);
      if (duplicate) {
        const next = prev.map((item) =>
          normalizeProductTerm(item.term) === normalized
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
        saveSearchItems(next);
        return next;
      }
      const next = [...prev, { term, quantity: 1 }];
      saveSearchItems(next);
      return next;
    });
  }, []);

  const removeTerm = useCallback((term: string) => {
    setSearchItems((prev) => {
      const normalized = normalizeProductTerm(term);
      const next = prev.filter((item) => normalizeProductTerm(item.term) !== normalized);
      saveSearchItems(next);
      return next;
    });
  }, []);

  const clearAllTerms = useCallback(() => {
    setClearUndoSnapshot((prev) => prev ?? [...searchItems]);
    setSearchItems([]);
    saveSearchItems([]);
  }, [searchItems]);

  const undoClearTerms = useCallback(() => {
    if (!clearUndoSnapshot) return;
    setSearchItems(clearUndoSnapshot);
    saveSearchItems(clearUndoSnapshot);
    setClearUndoSnapshot(null);
  }, [clearUndoSnapshot]);

  const setTermQuantity = useCallback((term: string, quantity: number) => {
    setSearchItems((prev) => {
      const normalized = normalizeProductTerm(term);
      const next = prev.map((item) =>
        normalizeProductTerm(item.term) === normalized
          ? { ...item, quantity: Math.max(1, Math.floor(quantity)) }
          : item,
      );
      saveSearchItems(next);
      return next;
    });
  }, []);

  const applyCatalogSelection = useCallback((terms: string[]) => {
    setSearchItems((prev) => {
      const prevMap = new Map(prev.map((item) => [normalizeProductTerm(item.term), item]));
      const next = mergeSearchItems(
        terms.map((term) => {
          const existing = prevMap.get(normalizeProductTerm(term));
          return { term, quantity: existing?.quantity ?? 1 };
        }),
      );
      saveSearchItems(next);
      // Auto-trigger search with the merged items
      if (next.length > 0) {
        setTimeout(() => {
          search(next, paymentMethods.map((m) => m.bankSlug));
          setLastSearchedTerms(new Set(next.map((i) => normalizeProductTerm(i.term))));
        }, 0);
      }
      return next;
    });
  }, [search, paymentMethods]);

  const handleSearch = useCallback(() => {
    if (searchItems.length === 0) return;
    search(searchItems, paymentMethods.map((m) => m.bankSlug));
    setLastSearchedTerms(new Set(searchItems.map((i) => normalizeProductTerm(i.term))));
    if (searchMilestone.complete()) celebrate("first-search");
    if (typeof window !== "undefined") {
      localStorage.setItem("habita:shopping-first-search", "1");
    }
  }, [searchItems, search, paymentMethods, searchMilestone, celebrate]);

  const handleNewSearch = useCallback(() => {
    if (data) {
      undoSnapshot.current = { data, overrides, selectedStores };
    }
    reset();
    setOverrides(new Map());
    setSelectedStores(new Set());
    setShowComparison(false);
  }, [data, overrides, selectedStores, reset]);

  const handleUndo = useCallback(() => {
    const snapshot = undoSnapshot.current;
    if (!snapshot) return;
    restore(snapshot.data);
    setOverrides(snapshot.overrides);
    setSelectedStores(snapshot.selectedStores);
    undoSnapshot.current = null;
  }, [restore]);

  const swapProduct = useCallback((storeName: string, searchTerm: string, alternative: AlternativeProduct) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      const previous = next.get(overrideKey(storeName, searchTerm));
      next.set(overrideKey(storeName, searchTerm), { ...previous, type: "swap", alternative });
      return next;
    });
  }, []);

  const findScopedAlternatives = useCallback(
    async (searchTerm: string, currentProductName: string, query: string, storeName: string) => {
      const response = await apiFetch<{ alternatives: AlternativeProduct[] }>(
        "/api/ai/shopping-plan/alternatives",
        {
          method: "POST",
          body: {
            storeName,
            searchTerm,
            currentProductName,
            query,
            city: props.householdCity,
          },
        },
      );
      return response.alternatives;
    },
    [props.householdCity],
  );

  // ── Results state ──
  if (data) {
    const searchedDate = new Date(data.searchedAt).toLocaleString("es-AR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <>
        {members.length > 0 && currentMemberId && (
          <AddExpenseDialog
            members={members}
            currentMemberId={currentMemberId}
            onExpenseCreated={(payload) => void handleExpenseCreated(payload)}
            externalOpen={expenseDefaults !== null}
            onExternalOpenChange={(open) => { if (!open) setExpenseDefaults(null); }}
            defaultValues={expenseDefaults ?? undefined}
          />
        )}
      <div className="space-y-3">
        {/* Header tabs */}
        <SectionTabs
          tabs={[
            { key: "results", label: "Resultados" },
            { key: "promos", label: "Promos bancarias", icon: Tag, count: promos?.length },
            { key: "saved", label: "Guardados", icon: Bookmark, count: savedCarts?.length },
          ]}
          activeKey={showPromos ? "promos" : showSaved ? "saved" : "results"}
          onSelect={(key) => {
            setShowPromos(key === "promos");
            setShowSaved(key === "saved");
          }}
          trailing={
            !showPromos && !showSaved ? (
              <button
                type="button"
                onClick={handleNewSearch}
                className="flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-[0.97]"
              >
                <Search className="h-3 w-3" />
                <span className="hidden sm:inline">Nueva búsqueda</span>
              </button>
            ) : undefined
          }
        />

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
            promos={promos}
            onRegisterAsExpense={handleRegisterAsExpense}
          />
        )}

        {/* Results content (hidden when showing saved/promos) */}
        {!showSaved && !showPromos && (
          <>
            {/* Payment method selector — keep visible in results so user can filter promos */}
            <PaymentMethodPicker
              paymentMethods={paymentMethods}
              onToggle={togglePaymentMethod}
            />

            {/* Context line: date + store count */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{searchedDate}</span>
              <span className="text-border">·</span>
              <span>Comparando en {adjustedCarts.length} supermercados</span>
            </div>

            {/* Not found — shown before store cards for visibility */}
            {data.notFound.length > 0 && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-100/60 px-3 py-2.5 dark:bg-amber-950/30">
                <PackageX className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-400" />
                <div>
                  <span className="text-xs font-medium text-amber-800 dark:text-amber-300">
                    Sin resultados ({data.notFound.length}):
                  </span>
                  <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-400">
                    {data.notFound.join(", ")}
                  </p>
                </div>
              </div>
            )}

            {/* Comparison bar — toggleable store chips */}
            {adjustedCarts.length > 1 && (
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 py-0.5 scrollbar-none">
                {adjustedCarts.map((cart, idx) => {
                  const isWinner = idx === 0;
                  const isSelected = selectedStores.size === 0 || selectedStores.has(cart.storeName);
                  return (
                    <button
                      type="button"
                      key={cart.storeName}
                      onClick={() => toggleStore(cart.storeName)}
                      className={cn(
                        "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all duration-200 active:scale-[0.97]",
                        isSelected
                          ? isWinner
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted/80 text-foreground ring-1 ring-border/50"
                          : "bg-muted/40 text-muted-foreground",
                      )}
                    >
                      <StoreLogo storeName={cart.storeName} sizeClass="h-4 w-4" fallbackFontClass="text-[7px]" />
                      {isWinner && isSelected && <Trophy className="h-3 w-3 text-amber-300" />}
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
                    "flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium transition-all duration-200 active:scale-[0.98]",
                    showComparison
                      ? "bg-primary/10 text-primary"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
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
                  <div className="mt-2 rounded-2xl border border-border/30 bg-card px-4 py-3">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
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

            {/* Quick-add products to search from results view */}
            <QuickAddFromResults onAdd={addTerm} />

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
                    onFindAlternatives={findScopedAlternatives}
                    isSaved={!!isCartSaved(savedCarts, cart.storeName)}
                    isSavePending={isSavePending}
                    onToggleSave={() => handleToggleSaveCart(cart)}
                    onRegisterAsExpense={handleRegisterAsExpense}
                    promos={(() => {
                      const storePromos = getStorePromos(promos, cart.storeName);
                      const slugs = paymentMethods.map((m) => m.bankSlug);
                      return slugs.length > 0 ? storePromos.filter((p) => slugs.includes(p.bankSlug)) : storePromos;
                    })()}
                    isPinned={pinnedStore === cart.storeName}
                    onPinStore={(storeName) => setPinnedStore((prev) => prev === storeName ? null : storeName)}
                    preferredBankSlugs={paymentMethods.map((m) => m.bankSlug)}
                    userCoords={userCoords ?? undefined}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/40 px-6 py-10 text-center">
                <Search className={cn(iconSize["2xl"], "text-muted-foreground")} />
                <p className="text-sm text-muted-foreground">
                  No se encontraron precios para estos productos.
                </p>
              </div>
            )}
          </>
        )}
      </div>
      </>
    );
  }

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2.5 rounded-2xl border border-border/30 bg-card px-4 py-3">
          <ShoppingCart className="h-4 w-4 animate-pulse text-primary" />
          <p className="text-sm font-medium text-foreground">
            Buscando precios...
          </p>
          <span className="text-xs text-muted-foreground">
            {Object.keys(storeColors).length} supermercados
          </span>
        </div>
        <div className="space-y-2">
          {Object.keys(storeColors).map((name, idx) => (
            <div
              key={name}
              className="animate-stagger-fade-in flex items-center gap-3 rounded-2xl border border-border/30 px-4 py-3"
              style={{ '--stagger-index': idx } as React.CSSProperties}
            >
              <StoreLogo storeName={name} sizeClass="h-8 w-8" radiusClass="rounded-xl" />
              <div className="flex-1 space-y-2">
                <p className="text-xs font-medium">{name}</p>
                <div className="h-2 w-3/4 rounded-full bg-muted shimmer-skeleton" />
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
    <>
      {members.length > 0 && currentMemberId && (
        <AddExpenseDialog
          members={members}
          currentMemberId={currentMemberId}
          onExpenseCreated={(payload) => void handleExpenseCreated(payload)}
          externalOpen={expenseDefaults !== null}
          onExternalOpenChange={(open) => { if (!open) setExpenseDefaults(null); }}
          defaultValues={expenseDefaults ?? undefined}
        />
      )}
    <div className="space-y-4">
      {/* Section tabs (visible when there are saved carts or promos) */}
      {((savedCarts && savedCarts.length > 0) || (promos && promos.length > 0)) && (
        <SectionTabs
          tabs={[
            { key: "search", label: "Buscar" },
            { key: "promos", label: "Promos bancarias", icon: Tag, count: promos?.length },
            ...(savedCarts && savedCarts.length > 0
              ? [{ key: "saved", label: "Guardados", icon: Bookmark, count: savedCarts.length }]
              : []),
          ]}
          activeKey={showPromos ? "promos" : showSaved ? "saved" : "search"}
          onSelect={(key) => {
            setShowPromos(key === "promos");
            setShowSaved(key === "saved");
          }}
        />
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
          promos={promos}
          onRegisterAsExpense={handleRegisterAsExpense}
        />
      ) : (
        <>
          {/* Undo new search */}
          {undoSnapshot.current && (
            <button
              type="button"
              onClick={handleUndo}
              className="flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline active:opacity-70"
            >
              <Undo2 className="h-3 w-3" />
              Volver a los resultados anteriores
            </button>
          )}

          {/* Empty state — 3-step visual onboarding */}
          {searchItems.length === 0 && (
            <div className="animate-fade-in rounded-2xl border border-border/30 bg-card px-4 py-5">
              <div className="flex items-start gap-4">
                {[
                  { step: "1", icon: ListPlus, text: "Agregá productos a tu lista" },
                  { step: "2", icon: Search, text: "Buscamos en 11 supermercados" },
                  { step: "3", icon: Trophy, text: "Encontrá el mejor precio" },
                ].map(({ step, icon: StepIcon, text }, idx) => (
                  <div key={step} className="flex flex-1 flex-col items-center gap-2 text-center">
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                      idx === 0
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/80 text-muted-foreground",
                    )}>
                      {step}
                    </div>
                    <StepIcon className={cn("h-5 w-5", idx === 0 ? "text-primary" : "text-muted-foreground")} />
                    <p className="text-[11px] leading-snug text-muted-foreground">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isFirstVisitAhorra && !wasSectionToured("ahorra") && (
            <SectionGuideCard
              steps={[
                { icon: <ShoppingCart className="h-4 w-4" />, title: "Agregá productos", description: "Escribí lo que necesitás o elegí del catálogo" },
                { icon: <Search className="h-4 w-4" />, title: "Buscamos en 11 supers", description: "Comparamos precios en tiempo real" },
                { icon: <Trophy className="h-4 w-4" />, title: "Compará y ahorrá", description: "Te mostramos dónde te conviene comprar" },
              ]}
              onDismiss={dismissAhorra}
            />
          )}

          <ProductSearchInput
            searchItems={searchItems}
            onAdd={addTerm}
            onRemove={removeTerm}
            onSetQuantity={setTermQuantity}
            products={catalogData?.products}
            collapsible
          />

          {/* Payment method selector */}
          <PaymentMethodPicker
            paymentMethods={paymentMethods}
            onToggle={togglePaymentMethod}
          />

      {/* Catalog banner */}
      <button
        type="button"
        onClick={() => setCatalogOpen(true)}
        className="flex w-full items-center gap-3 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3.5 text-left transition-colors hover:bg-primary/15"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
          <ListPlus className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Elegí productos del catálogo</p>
          <p className="text-xs text-muted-foreground">
            {(catalogData?.products?.length ?? 0) > 0
              ? `${catalogData?.products?.length} productos disponibles`
              : "Seleccioná de nuestra lista para buscar precios"}
          </p>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      <div className="flex items-center gap-2">
        <Button
          onClick={handleSearch}
          disabled={searchItems.length === 0}
          className="gap-2"
        >
          {hasResults && newItems.length > 0
            ? <RefreshCw className="h-4 w-4" />
            : <Search className="h-4 w-4" />
          }
          {hasResults && newItems.length > 0 ? "Actualizar búsqueda" : "Buscar precios"}
        </Button>
        {searchItems.length > 0 && !clearUndoSnapshot && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllTerms}
            className="ml-auto gap-1.5 text-xs text-muted-foreground"
          >
            Limpiar todo
          </Button>
        )}
        {clearUndoSnapshot && (
          <button
            type="button"
            onClick={undoClearTerms}
            className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline active:opacity-70"
          >
            <Undo2 className="h-3 w-3" />
            Deshacer
          </button>
        )}
      </div>

          {/* Store logos strip */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">Buscamos en</span>
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
            onConfirmTerms={applyCatalogSelection}
            initialCategory={catalogInitialCategory}
          />
        </>
      )}
    </div>
    </>
  );
}

// ============================================
// Section Tabs (shared between input + results)
// ============================================

interface TabItem {
  key: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

interface SectionTabsProps {
  tabs: TabItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  trailing?: React.ReactNode;
}

function SectionTabs({ tabs, activeKey, onSelect, trailing }: SectionTabsProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="-mx-4 flex flex-1 items-center gap-2 overflow-x-auto px-4 scrollbar-none">
        {tabs.map((tab) => {
          const isActive = tab.key === activeKey;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onSelect(tab.key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all duration-200 active:scale-[0.97]",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {Icon && <Icon className="h-3 w-3" />}
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <span className={cn(
                  "ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                  isActive ? "bg-white/20 text-primary-foreground" : "bg-muted text-muted-foreground",
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  );
}

// ============================================
// Promos View
// ============================================

import { scorePromo, scoreStore, parseDaysOfWeek, getTodayDayName, isPromoExpired, promoAppliesToday } from "@/lib/promos/scoring";

interface PromosViewProps {
  promos: BankPromo[] | undefined;
  isRunning: boolean;
  onRefresh: () => Promise<void>;
}

/** Capitalize first letter of a day name. */
function capitalizeDay(day: string): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

/** Format daysOfWeek JSON array into a human-readable label. */
function formatDays(daysOfWeek: string): string {
  const days = parseDaysOfWeek(daysOfWeek);
  if (days.length === 0) return "Todos los días";
  if (days.length === 7) return "Todos los días";
  return days.map(capitalizeDay).join(", ");
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
  const [searchFilter, setSearchFilter] = useState("");
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

    // Remove expired promos, then apply search filter
    const active = promos.filter((p) => !isPromoExpired(p));
    const filtered = searchFilter.trim()
      ? active.filter(
          (p) =>
            fuzzyMatch(searchFilter, p.bankDisplayName) ||
            fuzzyMatch(searchFilter, p.storeName),
        )
      : active;

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
  }, [promos, todayName, searchFilter]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRunning}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all duration-200 active:scale-[0.97]",
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
        <div className="flex items-center gap-2.5 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 dark:border-primary/30 dark:bg-primary/10">
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
          <p className="text-xs text-foreground">
            Buscando promociones bancarias...
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isRunning && (!promos || promos.length === 0) && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/40 px-6 py-10 text-center">
          <Tag className={cn(iconSize["2xl"], "text-muted-foreground")} />
          <p className="text-sm font-medium text-muted-foreground">No hay promos cargadas</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Tocá &quot;Actualizar&quot; para buscar descuentos bancarios en supermercados.
          </p>
        </div>
      )}

      {/* Search */}
      {promos && promos.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Buscar banco o supermercado..."
            className={cn(
              "w-full rounded-xl border border-border/40 bg-card py-2.5 pl-9 pr-3 text-sm",
              "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20",
            )}
          />
        </div>
      )}

      {/* Store cards with bank promos */}
      {storeGroups.map(({ storeName, bankGroups, totalPromos: storeTotal }) => {
        const isExpanded = expandedStores.has(storeName);
        const extraPromos = storeTotal - bankGroups.length;

        return (
          <div key={storeName} className="overflow-hidden rounded-2xl border border-border/40 bg-card shadow-sm">
            {/* Store header */}
            <div className="flex items-center gap-3 p-4">
              <StoreLogo storeName={storeName} sizeClass="h-8 w-8" radiusClass="rounded-xl" fallbackFontClass="text-xs" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold">{storeName}</h4>
                <p className="text-xs text-muted-foreground">
                  {bankGroups.length} banco{bankGroups.length !== 1 ? "s" : ""} · {storeTotal} promo{storeTotal !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Bank promo cards — modern gap layout */}
            <div className="space-y-1.5 px-3 pb-3">
              {bankGroups.map(({ bankSlug, bestPromo }) => {
                const cap = formatCap(bestPromo.capAmount);
                const paymentMethods = parseJsonArray(bestPromo.paymentMethods);
                const appliesToday = promoAppliesToday(bestPromo, todayName);
                return (
                  <div
                    key={bankSlug}
                    className="flex items-center gap-2.5 rounded-xl bg-muted/30 px-3 py-2.5 dark:bg-muted/15"
                  >
                    <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400">
                      {bestPromo.discountPercent}%
                    </span>
                    <span className="text-sm font-medium">{bestPromo.bankDisplayName}</span>
                    {paymentMethods[0] && (
                      <span className="text-xs text-muted-foreground">· {paymentMethods[0]}</span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatDays(bestPromo.daysOfWeek)}
                    </span>
                    {appliesToday && (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        Hoy
                      </span>
                    )}
                    {cap && (
                      <span className="text-[11px] text-muted-foreground">tope {cap}</span>
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
                className="flex w-full items-center justify-center gap-1.5 border-t border-border/30 py-2.5 text-xs font-medium text-muted-foreground transition-all duration-200 hover:bg-muted/30 active:scale-[0.98]"
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
              <div className="border-t border-border/30 px-3 py-2 space-y-2">
                {bankGroups
                  .filter((bg) => bg.allPromos.length > 1)
                  .map(({ bankSlug, bankDisplayName, allPromos }) => (
                    <div key={bankSlug}>
                      <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {bankDisplayName}
                      </p>
                      <div className="space-y-1">
                        {allPromos.slice(1).map((promo) => {
                          const paymentMethods = parseJsonArray(promo.paymentMethods);
                          const cap = formatCap(promo.capAmount);
                          return (
                            <div
                              key={promo.id}
                              className="flex items-center gap-2 rounded-lg bg-muted/20 px-3 py-2 dark:bg-muted/10"
                            >
                              <span className="rounded-md bg-emerald-100/60 px-1.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                {promo.discountPercent}%
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDays(promo.daysOfWeek)}
                              </span>
                              {paymentMethods[0] && (
                                <span className="text-[11px] text-muted-foreground">· {paymentMethods[0]}</span>
                              )}
                              {cap && (
                                <span className="ml-auto text-[11px] text-muted-foreground">tope {cap}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        );
      })}

      {/* No results for search */}
      {promos && promos.length > 0 && storeGroups.length === 0 && searchFilter.trim() && (
        <p className="py-4 text-center text-xs text-muted-foreground">
          No se encontraron promos para &quot;{searchFilter}&quot;
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
  promos?: BankPromo[];
  onRegisterAsExpense?: (storeName: string, totalPrice: number) => void;
}

function toAdjustedSavedCart(savedCart: SavedCart): AdjustedStoreCart {
  const rawProducts = Array.isArray(savedCart.products)
    ? savedCart.products as Array<Record<string, unknown>>
    : [];

  const products: AdjustedCartProduct[] = rawProducts.map((rawProduct, index) => {
    const searchTerm = typeof rawProduct.searchTerm === "string" && rawProduct.searchTerm.trim().length > 0
      ? rawProduct.searchTerm
      : typeof rawProduct.productName === "string" && rawProduct.productName.trim().length > 0
        ? rawProduct.productName
        : `producto-${index + 1}`;
    const quantityRaw = typeof rawProduct.quantity === "number" ? rawProduct.quantity : 1;
    const quantity = Math.max(1, Math.floor(quantityRaw));
    const price = typeof rawProduct.price === "number" ? rawProduct.price : 0;
    const lineTotal = typeof rawProduct.lineTotal === "number" ? rawProduct.lineTotal : price * quantity;

    return {
      searchTerm,
      quantity,
      productName: typeof rawProduct.productName === "string" ? rawProduct.productName : searchTerm,
      price,
      lineTotal,
      listPrice: typeof rawProduct.listPrice === "number" ? rawProduct.listPrice : null,
      imageUrl: typeof rawProduct.imageUrl === "string" ? rawProduct.imageUrl : null,
      link: typeof rawProduct.link === "string" ? rawProduct.link : "",
      isCheapest: Boolean(rawProduct.isCheapest),
      unitInfo: rawProduct.unitInfo as CartProduct["unitInfo"],
      alternatives: Array.isArray(rawProduct.alternatives)
        ? rawProduct.alternatives as AlternativeProduct[]
        : [],
      averagePrice: typeof rawProduct.averagePrice === "number" ? rawProduct.averagePrice : null,
    };
  });

  const totalPrice = products.reduce((sum, product) => sum + product.lineTotal, 0);
  const cheapestCount = products.filter((product) => product.isCheapest).length;

  return {
    storeName: savedCart.storeName,
    products,
    totalPrice,
    cheapestCount,
    missingTerms: savedCart.missingTerms,
    totalSearched: savedCart.totalSearched,
  };
}

// ============================================
// Quick Add From Results
// ============================================

function QuickAddFromResults({ onAdd }: { onAdd: (term: string) => void }) {
  const [value, setValue] = useState("");

  const handleAdd = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue("");
  }, [value, onAdd]);

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
        placeholder="Agregar producto a la búsqueda..."
        className="h-9 flex-1 rounded-xl border border-border/40 bg-card px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
      <Button size="sm" variant="outline" onClick={handleAdd} disabled={!value.trim()} className="shrink-0">
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function SavedCartsView({ savedCarts, toggleSaveCart, isSavePending, promos, onRegisterAsExpense }: SavedCartsViewProps) {
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
      {savedCarts
        .map((savedCart) => ({ savedCart, adjusted: toAdjustedSavedCart(savedCart) }))
        .sort((a, b) => a.adjusted.totalPrice - b.adjusted.totalPrice)
        .map(({ savedCart, adjusted }, index) => {
          const isRefreshing = refreshingId === savedCart.id;

          return (
            <div key={savedCart.id} className="space-y-2">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleRefresh(savedCart.id)}
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
              </div>
              <StoreCartCard
                cart={adjusted}
                rank={index}
                isComplete={adjusted.missingTerms.length === 0}
                isSaved
                isSavePending={isSavePending}
                onToggleSave={() => toggleSaveCart({ savedCartId: savedCart.id })}
                onRegisterAsExpense={onRegisterAsExpense}
                promos={getStorePromos(promos, adjusted.storeName)}
              />
            </div>
          );
        })}
    </div>
  );
}
