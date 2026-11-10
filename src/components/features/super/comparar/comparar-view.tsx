"use client";

import { useCallback, useMemo, useState } from "react";
import { SearchX } from "lucide-react";
import { Banner } from "@/components/ds/banner";
import { Skeleton } from "@/components/ds/skeleton";
import { useSnackbar } from "@/components/ds/snackbar";
import { apiFetch } from "@/lib/api-client";
import { usePaymentMethod } from "@/hooks/use-payment-method";
import { useSavedCarts, useToggleSaveCart, isCartSaved } from "@/hooks/use-saved-items";
import { usePromos, getStorePromos } from "@/hooks/use-promos";
import { StoreCartCard } from "@/components/features/store-cart-card";
import { PaymentMethodChips } from "@/components/features/super/comparar/payment-method-chips";
import { NotFoundRow } from "@/components/features/super/comparar/not-found-row";
import { UnavailableStoresRow } from "@/components/features/super/comparar/unavailable-stores-row";
import { SavedCartsSection } from "@/components/features/super/comparar/saved-carts-section";
import { applyOverrides, buildSavingsSummary } from "@habita/prices";

import type { SearchItem, ShoppingPlanResult } from "@/lib/supermarket-search";
import type { CartOverride, CompareAlternative as AlternativeProduct } from "@habita/prices";
import type { SaveCartInput } from "@/lib/validations/saved-items";

interface CompararViewProps {
  searchItems: SearchItem[];
  data: ShoppingPlanResult | null;
  isLoading: boolean;
  error: string | null;
  householdCity: string | null;
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

export function CompararView({ searchItems, data, isLoading, error, householdCity }: CompararViewProps): React.JSX.Element {
  const [overrides, setOverrides] = useState<Map<string, CartOverride>>(new Map());
  const { paymentMethods, togglePaymentMethod } = usePaymentMethod();
  const { data: savedCarts } = useSavedCarts();
  const { toggle: toggleSaveCart, isPending: isSavePending } = useToggleSaveCart();
  const { data: promos } = usePromos();
  const snackbar = useSnackbar();

  const adjustedCarts = useMemo(() => {
    if (!data) return [];
    return applyOverrides(data.storeCarts, overrides, searchItems);
  }, [data, overrides, searchItems]);

  const { savingsVsNext, nextStoreName } = buildSavingsSummary(adjustedCarts);

  const handleSwap = useCallback((storeName: string, searchTerm: string, alternative: AlternativeProduct) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      next.set(`${storeName}::${searchTerm}`, { type: "swap", alternative });
      return next;
    });
  }, []);

  const handleFindAlternatives = useCallback(
    async (searchTerm: string, currentProductName: string, query: string, storeName: string) => {
      const response = await apiFetch<{ alternatives: AlternativeProduct[] }>("/api/ai/shopping-plan/alternatives", {
        method: "POST",
        body: { storeName, searchTerm, currentProductName, query, city: householdCity },
      });
      return response.alternatives;
    },
    [householdCity],
  );

  function handleSave(cart: (typeof adjustedCarts)[number]): void {
    // `products` is typed as a loose JSON record on the API side (saveCartSchema);
    // these are the same AdjustedCartProduct objects store-cart-card already renders.
    const input: SaveCartInput = {
      storeName: cart.storeName,
      searchTerms: cart.products.map((p) => p.searchTerm),
      searchItems,
      products: cart.products as unknown as SaveCartInput["products"],
      totalPrice: cart.totalPrice,
      cheapestCount: cart.cheapestCount,
      missingTerms: cart.missingTerms,
      totalSearched: cart.totalSearched,
    };
    toggleSaveCart({ input })?.catch(() =>
      snackbar.show({ text: "No se pudo guardar", tone: "error", actionKind: "retry", onAction: () => handleSave(cart) }),
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (error) {
    return <Banner tone="attention">{error}</Banner>;
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-start gap-1.5 rounded-[20px] bg-surface px-5 py-6">
          <SearchX className="mb-1 size-6 text-ink-2" strokeWidth={1.75} aria-hidden="true" />
          <p className="text-[17px] font-semibold text-ink">Compará la lista</p>
          <p className="max-w-sm text-[14px] text-ink-2">
            Tocá Comparar precios y buscamos cada producto en los súper de tu zona, con las promos de tus bancos.
          </p>
        </div>
        <SavedCartsSection />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {savingsVsNext !== null && savingsVsNext > 0 && nextStoreName && (
        <Banner tone="offer">Ahorrás {formatCurrency(savingsVsNext)} comprando en {adjustedCarts[0]?.storeName} vs {nextStoreName}</Banner>
      )}

      <PaymentMethodChips selected={paymentMethods} onToggle={togglePaymentMethod} />

      <div className="flex flex-col gap-3">
        {adjustedCarts.map((cart, index) => (
          <StoreCartCard
            key={cart.storeName}
            cart={cart}
            rank={index}
            isComplete={cart.missingTerms.length === 0}
            onSwapProduct={(searchTerm, alternative) => handleSwap(cart.storeName, searchTerm, alternative)}
            onFindAlternatives={handleFindAlternatives}
            isSaved={!!isCartSaved(savedCarts, cart.storeName)}
            isSavePending={isSavePending}
            onToggleSave={() => handleSave(cart)}
            promos={getStorePromos(promos, cart.storeName)}
            preferredBankSlugs={paymentMethods.map((method) => method.bankSlug)}
          />
        ))}
      </div>

      <NotFoundRow notFound={data.notFound} suggestions={data.suggestions} />

      <UnavailableStoresRow stores={data.unavailableStores} />

      <SavedCartsSection />
    </div>
  );
}
