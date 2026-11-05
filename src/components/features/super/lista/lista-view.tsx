"use client";

import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { useSnackbar } from "@/components/ds/snackbar";
import { Button } from "@/components/ds/button";
import { EmptyState } from "@/components/ds/empty-state";
import { SkeletonBoundary, Skeleton } from "@/components/ds/skeleton";
import { useShoppingList, useAddShoppingListItem, useUpdateShoppingListItem, useDeleteShoppingListItem, useClearCheckedShoppingList } from "@/hooks/use-shopping-list";
import { useTopDeals } from "@/hooks/use-top-deals";
import { countUnchecked, matchesTopDeal, buildCompareSearchItems } from "@/lib/super-shopping-list-logic";
import { cancelDelete, scheduleDelete } from "@/lib/deferred-delete";
import { CatalogSheet } from "@/components/features/catalog-sheet";
import { ListaRow } from "@/components/features/super/lista/lista-row";
import { ListaAddRow } from "@/components/features/super/lista/lista-add-row";

import type { SearchItem } from "@/lib/supermarket-search";

const DEFERRED_DELETE_MS = 5000;

interface ListaViewProps {
  currentMemberId: string;
  onCompare: (searchItems: SearchItem[]) => void;
}

export function ListaView({ currentMemberId, onCompare }: ListaViewProps): React.JSX.Element {
  const { data, isLoading } = useShoppingList();
  const addItem = useAddShoppingListItem();
  const updateItem = useUpdateShoppingListItem();
  const deleteItem = useDeleteShoppingListItem();
  const clearChecked = useClearCheckedShoppingList();
  const { data: topDealsData } = useTopDeals();
  const snackbar = useSnackbar();
  const [catalogOpen, setCatalogOpen] = useState(false);

  const items = data?.items ?? [];
  const uncheckedCount = countUnchecked(items);
  const hasChecked = items.some((item) => item.checkedAt !== null);
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

  function handleCompareClick(): void {
    onCompare(buildCompareSearchItems(items));
  }

  return (
    <div className="flex flex-col gap-3">
      <ListaAddRow onAdd={handleAdd} onOpenCatalog={() => setCatalogOpen(true)} disabled={addItem.isPending} />

      <SkeletonBoundary
        loading={isLoading}
        skeleton={
          <div className="flex flex-col gap-3 py-2">
            {[0, 1, 2].map((key) => <Skeleton key={key} className="h-[60px] w-full" />)}
          </div>
        }
      >
        {items.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Todavía no agregaste nada"
            description="Sumá productos y comparamos precios por vos."
          />
        ) : (
          <div className="flex flex-col">
            {items.map((item) => (
              <ListaRow
                key={item.id}
                item={item}
                currentMemberId={currentMemberId}
                isOffer={matchesTopDeal(item.name, topDeals)}
                onToggle={() => handleToggle(item.id, item.checkedAt === null)}
                onQuantityChange={(quantity) => handleQuantityChange(item.id, quantity)}
                onDelete={() => handleDelete(item.id, item.name)}
              />
            ))}
          </div>
        )}
      </SkeletonBoundary>

      {hasChecked && (
        <Button variant="link" onClick={() => clearChecked.mutate()} className="self-start text-ink-2">
          Borrar tachados
        </Button>
      )}

      {uncheckedCount > 0 && (
        <Button onClick={handleCompareClick} className="w-full">
          Comparar precios · {uncheckedCount}
        </Button>
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
