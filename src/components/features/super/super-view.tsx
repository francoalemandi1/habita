"use client";

import { useState } from "react";
import { useShoppingPlan } from "@/hooks/use-shopping-plan";
import { useSegmentView } from "@/hooks/use-segment-view";
import { TabScreen } from "@/components/ds/tab-screen";
import { SegmentedControl } from "@/components/ds/segmented-control";
import { SuperShell } from "@/components/features/super/super-shell";
import { ListaView } from "@/components/features/super/lista/lista-view";
import { CompararView } from "@/components/features/super/comparar/comparar-view";
import { OfertasView } from "@/components/features/super/ofertas/ofertas-view";

import type { SearchItem } from "@/lib/supermarket-search";

export type SuperViewKey = "lista" | "comparar" | "ofertas";

const VIEWS = ["lista", "comparar", "ofertas"] as const satisfies readonly SuperViewKey[];

const MOBILE_OPTIONS: Array<{ value: SuperViewKey; label: string }> = [
  { value: "lista", label: "Lista" },
  { value: "comparar", label: "Comparar" },
  { value: "ofertas", label: "Ofertas" },
];

// From `lg` up Lista and Comparar share one split screen (handoff §10 Web), so they are one segment.
const DESKTOP_OPTIONS: Array<{ value: SuperViewKey; label: string }> = [
  { value: "lista", label: "Lista y comparar" },
  { value: "ofertas", label: "Ofertas" },
];

interface SuperViewProps {
  currentMemberId: string;
  householdCity: string | null;
}

/**
 * Owns the one piece of state shared across segments: the shopping-plan
 * search, so "Comparar precios · N" in Lista can trigger it and switch to
 * the Comparar segment (handoff §5.3).
 */
export function SuperView({ currentMemberId, householdCity }: SuperViewProps): React.JSX.Element {
  const [view, setView] = useSegmentView(VIEWS, "lista");
  const [searchItems, setSearchItems] = useState<SearchItem[]>([]);
  const { data, isLoading, error, search } = useShoppingPlan();
  const desktopValue: SuperViewKey = view === "ofertas" ? "ofertas" : "lista";

  function handleCompare(items: SearchItem[]): void {
    setSearchItems(items);
    void search(items);
    setView("comparar");
  }

  const segments = (
    <>
      <SegmentedControl label="Vista de Súper" options={MOBILE_OPTIONS} value={view} onChange={setView} className="lg:hidden" />
      <SegmentedControl
        label="Vista de Súper"
        options={DESKTOP_OPTIONS}
        value={desktopValue}
        onChange={setView}
        className="hidden md:hidden lg:inline-flex"
      />
    </>
  );

  return (
    <TabScreen title="Súper" segments={segments}>
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
    </TabScreen>
  );
}
