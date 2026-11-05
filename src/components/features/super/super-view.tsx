"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useShoppingPlan } from "@/hooks/use-shopping-plan";
import { SuperShell } from "@/components/features/super/super-shell";
import { ListaView } from "@/components/features/super/lista/lista-view";
import { CompararView } from "@/components/features/super/comparar/comparar-view";
import { OfertasView } from "@/components/features/super/ofertas/ofertas-view";

import type { SuperViewKey } from "@/components/features/super/super-segments";
import type { SearchItem } from "@/lib/supermarket-search";

interface SuperViewProps {
  view: SuperViewKey;
  currentMemberId: string;
  householdCity: string | null;
}

/**
 * Owns the one piece of state shared across segments: the shopping-plan
 * search, so "Comparar precios · N" in Lista can trigger it and switch to
 * the Comparar segment (handoff §5.3).
 */
export function SuperView({ view, currentMemberId, householdCity }: SuperViewProps): React.JSX.Element {
  const router = useRouter();
  const [searchItems, setSearchItems] = useState<SearchItem[]>([]);
  const { data, isLoading, error, search } = useShoppingPlan();

  function handleCompare(items: SearchItem[]): void {
    setSearchItems(items);
    void search(items);
    router.replace("/super?v=comparar", { scroll: false });
  }

  return (
    <SuperShell
      view={view}
      lista={<ListaView currentMemberId={currentMemberId} onCompare={handleCompare} />}
      comparar={
        <CompararView
          searchItems={searchItems}
          data={data}
          isLoading={isLoading}
          error={error}
          householdCity={householdCity}
        />
      }
      ofertas={<OfertasView />}
    />
  );
}
