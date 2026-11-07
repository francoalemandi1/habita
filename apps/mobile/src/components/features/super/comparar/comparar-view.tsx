import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { SearchX } from "lucide-react-native";
import { Banner, Button, EmptyState, useSnackbar } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { spacing } from "@/theme";
import { useDeleteSavedCart, useSaveCart, useSavedCarts } from "@/hooks/use-saved-carts";
import { useShoppingAlternatives } from "@/hooks/use-shopping-plan";
import { usePromos } from "@/hooks/use-promos";
import { usePaymentMethods } from "@/components/features/super/comparar/payment-methods";
import { PaymentMethodChips } from "@/components/features/super/comparar/payment-method-chips";
import { StoreCartCard } from "@/components/features/super/comparar/store-cart-card";
import { NotFoundRow } from "@/components/features/super/comparar/not-found-row";
import { UnavailableStoresRow } from "@/components/features/super/comparar/unavailable-stores-row";
import { SavedCartsSection } from "@/components/features/super/comparar/saved-carts-section";
import { applyOverrides, buildSavingsSummary } from "@/lib/super-compare-logic";

import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import type { CartOverride } from "@/lib/super-compare-logic";
import type { AlternativeProduct, SaveCartInput, SearchItem, ShoppingPlanResult } from "@habita/contracts";

function overrideMapKey(storeName: string, searchTerm: string): string {
  return `${storeName}::${searchTerm}`;
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

interface CompararViewProps {
  searchItems: SearchItem[];
  data: ShoppingPlanResult | null;
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

export function CompararView({ searchItems, data, isLoading, error, onRetry, onScroll }: CompararViewProps): React.JSX.Element {
  const colors = useThemeColors();
  const [overrides, setOverrides] = useState<Map<string, CartOverride>>(new Map());
  const { paymentMethods, togglePaymentMethod } = usePaymentMethods();
  const { data: savedCarts } = useSavedCarts();
  const deleteSavedCart = useDeleteSavedCart();
  const saveCart = useSaveCart();
  const { data: promosData } = usePromos();
  const findAlternatives = useShoppingAlternatives();
  const snackbar = useSnackbar();

  const adjustedCarts = useMemo(() => {
    if (!data) return [];
    return applyOverrides(data.storeCarts, overrides, searchItems);
  }, [data, overrides, searchItems]);

  const { savingsVsNext, nextStoreName } = buildSavingsSummary(adjustedCarts);

  const handleSwap = useCallback((storeName: string, searchTerm: string, alternative: AlternativeProduct) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      next.set(overrideMapKey(storeName, searchTerm), { type: "swap", alternative });
      return next;
    });
  }, []);

  const handleFindAlternatives = useCallback(
    async (searchTerm: string, currentProductName: string, query: string, storeName: string) => {
      const response = await findAlternatives.mutateAsync({ storeName, searchTerm, currentProductName, query });
      return response.alternatives;
    },
    [findAlternatives],
  );

  function handleSave(cart: (typeof adjustedCarts)[number]): void {
    const alreadySaved = savedCarts?.find((saved) => saved.storeName === cart.storeName);
    if (alreadySaved) {
      void deleteSavedCart.mutateAsync(alreadySaved.id);
      return;
    }
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
    saveCart.mutateAsync(input).catch(() =>
      snackbar.show({ text: "No se pudo guardar", tone: "error", actionLabel: "Reintentar", onAction: () => handleSave(cart) }),
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.monte} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loading}>
        <Banner tone="attention" text={error} />
        {onRetry ? <Button label="Reintentar" variant="link" onPress={onRetry} /> : null}
      </View>
    );
  }

  if (!data) {
    return (
      <EmptyState
        icon={SearchX}
        title="Nada para comparar todavía"
        description="Agregá productos en Lista y tocá Comparar precios."
      />
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      {savingsVsNext !== null && savingsVsNext > 0 && nextStoreName ? (
        <Banner
          tone="offer"
          text={`Ahorrás ${formatCurrency(savingsVsNext)} comprando en ${adjustedCarts[0]?.storeName} vs ${nextStoreName}`}
        />
      ) : null}

      <PaymentMethodChips selected={paymentMethods} onToggle={togglePaymentMethod} />

      <View style={styles.cards}>
        {adjustedCarts.map((cart, index) => (
          <StoreCartCard
            key={cart.storeName}
            cart={cart}
            rank={index}
            promos={(promosData ?? []).filter((promo) => promo.storeName === cart.storeName)}
            isSaved={!!savedCarts?.some((saved) => saved.storeName === cart.storeName)}
            isSavePending={saveCart.isPending || deleteSavedCart.isPending}
            onToggleSave={() => handleSave(cart)}
            onSwapProduct={(searchTerm, alternative) => handleSwap(cart.storeName, searchTerm, alternative)}
            onFindAlternatives={handleFindAlternatives}
          />
        ))}
      </View>

      <NotFoundRow notFound={data.notFound} suggestions={data.suggestions} />

      <UnavailableStoresRow stores={data.unavailableStores} />

      <SavedCartsSection />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxl },
  cards: { gap: spacing.md },
});
