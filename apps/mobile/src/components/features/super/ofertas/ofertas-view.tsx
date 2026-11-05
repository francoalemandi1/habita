import { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { Tag } from "lucide-react-native";
import { Banner, EmptyState, useSnackbar } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { spacing } from "@/theme";
import { useTopDeals } from "@/hooks/use-grocery-deals";
import { useAddShoppingListItem, useShoppingList } from "@/hooks/use-shopping-list";
import { isDealInList } from "@/lib/super-shopping-list-logic";
import { createUniqueId } from "@/lib/unique-id";
import { RubroChips } from "@/components/features/super/ofertas/rubro-chips";
import { OfertaCard } from "@/components/features/super/ofertas/oferta-card";

import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

interface OfertasViewProps {
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

export function OfertasView({ onScroll }: OfertasViewProps): React.JSX.Element {
  const colors = useThemeColors();
  const { data, isLoading, error } = useTopDeals();
  const { data: listData } = useShoppingList();
  const addItem = useAddShoppingListItem();
  const snackbar = useSnackbar();
  const [activeRubro, setActiveRubro] = useState<string | null>(null);

  const deals = useMemo(() => data?.topDeals ?? [], [data]);
  const items = listData?.items ?? [];
  const rubros = useMemo(() => Array.from(new Set(deals.map((deal) => deal.categoryLabel))), [deals]);
  const visibleDeals = activeRubro ? deals.filter((deal) => deal.categoryLabel === activeRubro) : deals;

  function handleAdd(productName: string, clientId: string = createUniqueId()): void {
    addItem.mutate(
      { name: productName, clientId },
      {
        onError: () =>
          snackbar.show({
            text: "No se pudo guardar",
            tone: "error",
            actionLabel: "Reintentar",
            onAction: () => handleAdd(productName, clientId),
          }),
      },
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
    return <Banner tone="attention" text="No se pudieron cargar las ofertas" />;
  }

  if (deals.length === 0) {
    return (
      <EmptyState
        icon={Tag}
        title="Sin ofertas disponibles"
        description="Todavía no hay datos de precios para tu zona. Volvé a intentar más tarde."
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
      <RubroChips rubros={rubros} active={activeRubro} onChange={setActiveRubro} />
      <View style={styles.grid}>
        {visibleDeals.map((deal) => (
          <View key={`${deal.productName}|${deal.store}`} style={styles.gridItem}>
            <OfertaCard deal={deal} inList={isDealInList(deal.productName, items)} onAdd={() => handleAdd(deal.productName)} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxl },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  gridItem: { width: "47%" },
});
