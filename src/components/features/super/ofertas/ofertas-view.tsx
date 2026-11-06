"use client";

import { useState } from "react";
import { Tag } from "lucide-react";
import { EmptyState } from "@/components/ds/empty-state";
import { Skeleton } from "@/components/ds/skeleton";
import { useSnackbar } from "@/components/ds/snackbar";
import { useTopDeals } from "@/hooks/use-top-deals";
import { InlineError } from "@/components/features/inline-error";
import { useShoppingList, useAddShoppingListItem } from "@/hooks/use-shopping-list";
import { isDealInList } from "@/lib/super-shopping-list-logic";
import { OfertaCard } from "@/components/features/super/ofertas/oferta-card";
import { RubroChips } from "@/components/features/super/ofertas/rubro-chips";

export function OfertasView(): React.JSX.Element {
  const { data, isLoading, error, refetch } = useTopDeals();
  const { data: listData } = useShoppingList();
  const addItem = useAddShoppingListItem();
  const snackbar = useSnackbar();
  const [activeRubro, setActiveRubro] = useState<string | null>(null);

  const deals = data?.topDeals ?? [];
  const items = listData?.items ?? [];

  const rubros = Array.from(new Set(deals.map((deal) => deal.categoryLabel)));
  const visibleDeals = activeRubro ? deals.filter((deal) => deal.categoryLabel === activeRubro) : deals;

  function handleAdd(productName: string): void {
    addItem.mutate(
      { name: productName, clientId: crypto.randomUUID() },
      {
        onError: () =>
          snackbar.show({ text: "No se pudo guardar", tone: "error", actionKind: "retry", onAction: () => handleAdd(productName) }),
      },
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((key) => <Skeleton key={key} className="h-56 w-full" />)}
      </div>
    );
  }

  if (error) {
    return <InlineError message="No se pudieron cargar las ofertas." onRetry={() => refetch()} />;
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
    <div className="flex flex-col gap-4">
      <RubroChips rubros={rubros} active={activeRubro} onChange={setActiveRubro} />
      <div className="grid grid-cols-2 gap-3">
        {visibleDeals.map((deal) => (
          <OfertaCard
            key={`${deal.productName}|${deal.store}`}
            deal={deal}
            inList={isDealInList(deal.productName, items)}
            onAdd={() => handleAdd(deal.productName)}
          />
        ))}
      </div>
    </div>
  );
}
