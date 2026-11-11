"use client";

import { useCallback, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { SearchX } from "lucide-react";
import { Banner } from "@/components/ds/banner";
import { Skeleton } from "@/components/ds/skeleton";
import { useSnackbar } from "@/components/ds/snackbar";
import { apiFetch } from "@/lib/api-client";
import { usePaymentMethod } from "@/hooks/use-payment-method";
import { useSavedCarts, useToggleSaveCart, isCartSaved } from "@/hooks/use-saved-items";
import { usePromos } from "@/hooks/use-promos";
import { CompareHero } from "@/components/features/super/comparar/compare-hero";
import { CompareRanking } from "@/components/features/super/comparar/compare-ranking";
import { TodaysPromoBanner } from "@/components/features/super/comparar/todays-promo-banner";
import { StoreCartDetail } from "@/components/features/super/comparar/store-cart-detail";
import { NotFoundRow } from "@/components/features/super/comparar/not-found-row";
import { UnavailableStoresRow } from "@/components/features/super/comparar/unavailable-stores-row";
import { SavedCartsSection } from "@/components/features/super/comparar/saved-carts-section";
import { applyOverrides, buildStoreCartUrl, pickBestPromoOverall, pickTodaysPromos } from "@habita/prices";

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

function buildMapsUrl(storeName: string): string {
  const query = encodeURIComponent(`${storeName} supermercado`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function CompararView({ searchItems, data, isLoading, error, householdCity }: CompararViewProps): React.JSX.Element {
  const [overrides, setOverrides] = useState<Map<string, CartOverride>>(new Map());
  const [selectedStoreName, setSelectedStoreName] = useState<string | null>(null);
  const { paymentMethods, togglePaymentMethod } = usePaymentMethod();
  const { data: savedCarts } = useSavedCarts();
  const { toggle: toggleSaveCart, isPending: isSavePending } = useToggleSaveCart();
  const { data: promos } = usePromos();
  const snackbar = useSnackbar();

  const adjustedCarts = useMemo(() => {
    if (!data) return [];
    return applyOverrides(data.storeCarts, overrides, searchItems);
  }, [data, overrides, searchItems]);

  const promoPicks = useMemo(
    () => pickTodaysPromos(adjustedCarts, promos ?? [], paymentMethods.map((method) => method.bankSlug), new Date()),
    [adjustedCarts, promos, paymentMethods],
  );
  const bestPromo = useMemo(() => pickBestPromoOverall(promoPicks), [promoPicks]);

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
    // these are the same AdjustedCartProduct objects the detail view already renders.
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

  function openStoreDetail(storeName: string): void {
    setSelectedStoreName(storeName);
  }

  // The trigger unmounts while the detail is open, so re-find it after the summary re-renders.
  function closeStoreDetail(): void {
    const storeName = selectedStoreName;
    flushSync(() => setSelectedStoreName(null));
    if (!storeName) return;
    document.querySelector<HTMLElement>(`[data-store-trigger="${CSS.escape(storeName)}"]`)?.focus();
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

  const [bestCart, ...restCarts] = adjustedCarts;
  const selectedCart = adjustedCarts.find((cart) => cart.storeName === selectedStoreName) ?? null;
  const maxTotal = adjustedCarts.length > 0 ? Math.max(...adjustedCarts.map((cart) => cart.totalPrice)) : 0;

  return (
    <div className="flex flex-col gap-3">
      {selectedCart ? (
        <StoreCartDetail
          cart={selectedCart}
          mapsUrl={buildMapsUrl(selectedCart.storeName)}
          cartLink={buildStoreCartUrl(selectedCart.storeName, selectedCart.products)}
          isSaved={!!isCartSaved(savedCarts, selectedCart.storeName)}
          isSavePending={isSavePending}
          onToggleSave={() => handleSave(selectedCart)}
          onBack={closeStoreDetail}
          onSwapProduct={(searchTerm, alternative) => handleSwap(selectedCart.storeName, searchTerm, alternative)}
          onFindAlternatives={handleFindAlternatives}
        />
      ) : (
        bestCart && (
          <>
            <CompareHero
              cart={bestCart}
              savingsVsMax={Math.round(maxTotal - bestCart.totalPrice)}
              mapsUrl={buildMapsUrl(bestCart.storeName)}
              onViewCart={() => openStoreDetail(bestCart.storeName)}
            />

            <TodaysPromoBanner bestPromo={bestPromo} paymentMethods={paymentMethods} onTogglePaymentMethod={togglePaymentMethod} />

            <CompareRanking
              carts={restCarts}
              promoPicks={promoPicks}
              onSelectStore={openStoreDetail}
            />
          </>
        )
      )}

      {!selectedCart && (
        <>
          <NotFoundRow notFound={data.notFound} suggestions={data.suggestions} />
          <UnavailableStoresRow stores={data.unavailableStores} />
          <SavedCartsSection />
        </>
      )}
    </div>
  );
}
