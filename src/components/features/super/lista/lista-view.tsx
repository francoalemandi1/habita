"use client";

import { useState } from "react";
import { ShoppingCart, AlertTriangle } from "lucide-react";
import { useSnackbar } from "@/components/ds/snackbar";
import { SectionCard } from "@/components/ds/section-card";
import { Button } from "@/components/ds/button";
import { EmptyState } from "@/components/ds/empty-state";
import { SkeletonBoundary, Skeleton } from "@/components/ds/skeleton";
import { useShoppingList, useAddShoppingListItem, useUpdateShoppingListItem, useDeleteShoppingListItem, useClearCheckedShoppingList } from "@/hooks/use-shopping-list";
import { usePendingMutationIds } from "@/hooks/use-pending-mutations";
import { extractShoppingListPendingId } from "@/lib/offline-shopping-pending-id";
import { useTopDeals } from "@/hooks/use-top-deals";
import { countUnchecked, matchesTopDeal, buildCompareSearchItems, splitShoppingListItems } from "@habita/prices";
import { useSettlingIds } from "@/hooks/use-settling-ids";
import { cancelDelete, scheduleDelete } from "@/lib/deferred-delete";
import { CatalogSheet } from "@/components/features/catalog-sheet";
import { ListaRow } from "@/components/features/super/lista/lista-row";
import { ListaAddRow } from "@/components/features/super/lista/lista-add-row";
import { ListaSections } from "@/components/features/super/lista/lista-sections";

import type { ShoppingListItem } from "@habita/contracts";

import type { SearchItem } from "@/lib/supermarket-search";

const DEFERRED_DELETE_MS = 5000;
/** How long a just-checked row stays in place before it moves to "En el carrito". */
const CHECK_SETTLE_MS = 600;

interface ListaViewProps {
  currentMemberId: string;
  onCompare: (searchItems: SearchItem[]) => void;
}

export function ListaView({ currentMemberId, onCompare }: ListaViewProps): React.JSX.Element {
  const { data, isLoading, isError, refetch } = useShoppingList();
  const addItem = useAddShoppingListItem();
  const updateItem = useUpdateShoppingListItem();
  const deleteItem = useDeleteShoppingListItem();
  const clearChecked = useClearCheckedShoppingList();
  const { data: topDealsData } = useTopDeals();
  const snackbar = useSnackbar();
  const [catalogOpen, setCatalogOpen] = useState(false);
  const pendingItemIds = usePendingMutationIds(["shopping-item"], extractShoppingListPendingId);
  const { settlingIds, settle, cancel } = useSettlingIds(CHECK_SETTLE_MS);

  if (isError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="No pudimos cargar la lista"
        description="Revisá tu conexión e intentá de nuevo."
        action={<Button onClick={() => refetch()}>Reintentar</Button>}
      />
    );
  }

  const items = data?.items ?? [];
  const uncheckedCount = countUnchecked(items);
  const { pending, inCart } = splitShoppingListItems(items, settlingIds);
  const topDeals = topDealsData?.topDeals ?? [];

  function handleAdd(name: string, clientId: string = crypto.randomUUID()): void {
    addItem.mutate({ name, clientId }, {
      onError: () => {
        snackbar.show({
          text: "No se pudo guardar",
          tone: "error",
          actionKind: "retry",
          onAction: () => handleAdd(name, clientId),
        });
      },
    });
  }

  function handleConfirmCatalogTerms(terms: string[]): void {
    for (const term of terms) handleAdd(term);
  }

  function handleToggle(itemId: string, checked: boolean): void {
    if (checked) settle(itemId);
    else cancel(itemId);
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
          onError: () => snackbar.show({ text: "No se pudo eliminar", tone: "error", actionKind: "retry", onAction: () => handleDelete(itemId, name) }),
        });
      },
    });
    snackbar.show({
      text: `${name} eliminado`,
      actionKind: "undo",
      onAction: () => {
        cancelDelete(itemId);
        deleteItem.restoreToCache(previous);
      },
    });
  }

  function renderRow(item: ShoppingListItem): React.ReactNode {
    return (
      <ListaRow
        key={item.id}
        item={item}
        currentMemberId={currentMemberId}
        isOffer={matchesTopDeal(item.name, topDeals)}
        isSyncPending={pendingItemIds.has(item.id)}
        onToggle={() => handleToggle(item.id, item.checkedAt === null)}
        onQuantityChange={(quantity) => handleQuantityChange(item.id, quantity)}
        onDelete={() => handleDelete(item.id, item.name)}
      />
    );
  }

  function handleCompareClick(): void {
    onCompare(buildCompareSearchItems(items));
  }

  return (
    <div className="flex flex-col gap-3">
      <SectionCard
        title={pending.length > 0 ? `Lista · ${pending.length}` : "Lista"}
      >
        <ListaAddRow onAdd={handleAdd} onOpenCatalog={() => setCatalogOpen(true)} />

        <SkeletonBoundary
          loading={isLoading}
          skeleton={
            <div className="flex flex-col gap-3 py-2">
              {[0, 1, 2].map((key) => <Skeleton key={key} className="h-[52px] w-full" />)}
            </div>
          }
        >
          {items.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="La lista está vacía"
              description="Sumá lo que falta en casa y comparamos precios por vos."
              className="py-10 [&>p:first-of-type]:text-[22px]"
            />
          ) : (
            <ListaSections
              pending={pending}
              inCart={inCart}
              renderRow={renderRow}
              onClearCart={() => clearChecked.mutate()}
              isClearing={clearChecked.isPending}
            />
          )}
        </SkeletonBoundary>
      </SectionCard>

      {uncheckedCount > 0 && (
        <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] z-10 md:bottom-4">
          <Button variant="ink" onClick={handleCompareClick} className="w-full shadow-level-1">
            Comparar precios · {uncheckedCount}
          </Button>
        </div>
      )}

      <CatalogSheet
        open={catalogOpen}
        onOpenChange={setCatalogOpen}
        selectedTerms={items.map((item) => item.name)}
        onConfirmTerms={handleConfirmCatalogTerms}
      />
    </div>
  );
}
