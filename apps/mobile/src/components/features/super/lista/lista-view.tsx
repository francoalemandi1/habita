import { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { ShoppingCart } from "lucide-react-native";
import { Banner, Button, EmptyState, useSnackbar } from "@/components/ds";
import {
  useAddShoppingListItem,
  useClearCheckedShoppingList,
  useDeleteShoppingListItem,
  useShoppingItemPendingIds,
  useShoppingList,
  useUpdateShoppingListItem,
} from "@/hooks/use-shopping-list";
import { useTopDeals } from "@/hooks/use-grocery-deals";
import { buildCompareSearchItems, countUnchecked, matchesTopDeal } from "@/lib/super-shopping-list-logic";
import { cancelDelete, scheduleDelete } from "@/lib/deferred-delete";
import { createUniqueId } from "@/lib/unique-id";
import { useThemeColors } from "@/hooks/use-theme";
import { spacing } from "@/theme";
import { ListaAddRow } from "@/components/features/super/lista/lista-add-row";
import { ListaRow } from "@/components/features/super/lista/lista-row";
import { CatalogModal } from "@/components/features/super/catalog-modal";

import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import type { SearchItem } from "@habita/contracts";

const DEFERRED_DELETE_MS = 5000;

interface ListaViewProps {
  currentMemberId: string;
  onCompare: (items: SearchItem[]) => void;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

export function ListaView({ currentMemberId, onCompare, onScroll }: ListaViewProps): React.JSX.Element {
  const colors = useThemeColors();
  const { data, isLoading, isError, refetch } = useShoppingList();
  const addItem = useAddShoppingListItem();
  const updateItem = useUpdateShoppingListItem();
  const deleteItem = useDeleteShoppingListItem();
  const clearChecked = useClearCheckedShoppingList();
  const { data: topDealsData } = useTopDeals();
  const snackbar = useSnackbar();
  const pendingItemIds = useShoppingItemPendingIds();
  const [catalogOpen, setCatalogOpen] = useState(false);

  const items = useMemo(() => data?.items ?? [], [data]);
  const uncheckedCount = countUnchecked(items);
  const hasChecked = items.some((item) => item.checkedAt !== null);
  const topDeals = topDealsData?.topDeals ?? [];

  function handleAdd(name: string, clientId: string = createUniqueId()): void {
    addItem.mutate(
      { name, clientId },
      {
        onError: () =>
          snackbar.show({
            text: "No se pudo guardar",
            tone: "error",
            actionLabel: "Reintentar",
            onAction: () => handleAdd(name, clientId),
          }),
      },
    );
  }

  function handleToggle(itemId: string, checked: boolean): void {
    updateItem.mutate({ itemId, checked });
  }

  function handleQuantityChange(itemId: string, quantity: number): void {
    updateItem.mutate({ itemId, quantity });
  }

  function handleDelete(itemId: string, name: string): void {
    const previous = deleteItem.removeFromCache(itemId);
    scheduleDelete({
      id: itemId,
      delayMs: DEFERRED_DELETE_MS,
      run: () => {
        deleteItem.mutate(itemId, {
          onError: () =>
            snackbar.show({
              text: "No se pudo eliminar",
              tone: "error",
              actionLabel: "Reintentar",
              onAction: () => handleDelete(itemId, name),
            }),
        });
      },
    });
    snackbar.show({
      text: `${name} eliminado`,
      actionLabel: "Deshacer",
      onAction: () => {
        cancelDelete(itemId);
        deleteItem.restoreToCache(previous);
      },
    });
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <ListaAddRow onAdd={handleAdd} onOpenCatalog={() => setCatalogOpen(true)} disabled={addItem.isPending} />

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.monte} />
          </View>
        ) : isError ? (
          <View style={styles.loading}>
            <Banner tone="attention" text="No pudimos cargar la lista." />
            <Button label="Reintentar" variant="link" onPress={() => void refetch()} />
          </View>
        ) : items.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Todavía no agregaste nada"
            description="Sumá productos y comparamos precios por vos."
          />
        ) : (
          <View>
            {items.map((item) => (
              <ListaRow
                key={item.id}
                item={item}
                currentMemberId={currentMemberId}
                isOffer={matchesTopDeal(item.name, topDeals)}
                isPendingSync={pendingItemIds.has(item.id)}
                onToggle={() => handleToggle(item.id, item.checkedAt === null)}
                onQuantityChange={(quantity) => handleQuantityChange(item.id, quantity)}
                onDelete={() => handleDelete(item.id, item.name)}
              />
            ))}
          </View>
        )}

        {hasChecked ? (
          <Button
            label="Borrar tachados"
            variant="link"
            onPress={() => clearChecked.mutate()}
            style={styles.clearBtn}
          />
        ) : null}
      </ScrollView>

      {uncheckedCount > 0 ? (
        <View style={styles.floatingCta}>
          <Button
            label={`Comparar precios · ${uncheckedCount}`}
            variant="ink"
            onPress={() => onCompare(buildCompareSearchItems(items))}
          />
        </View>
      ) : null}

      <CatalogModal
        visible={catalogOpen}
        addedNames={items.map((item) => item.name)}
        onClose={() => setCatalogOpen(false)}
        onAddTerm={handleAdd}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: "relative" },
  scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl + 56, gap: spacing.md },
  loading: { paddingVertical: spacing.xxl, alignItems: "center" },
  clearBtn: { alignSelf: "flex-start" },
  floatingCta: { position: "absolute", left: spacing.xl, right: spacing.xl, bottom: spacing.lg },
});
