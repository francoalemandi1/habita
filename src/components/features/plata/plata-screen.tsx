"use client";

import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { PLATA_ROUTES } from "@habita/contracts";
import { TabScreen } from "@/components/ds/tab-screen";
import { SegmentedControl } from "@/components/ds/segmented-control";
import { useSegmentView } from "@/hooks/use-segment-view";
import { GastosView } from "./gastos/gastos-view";
import { SaldosView } from "./saldos-view";
import { FondoView } from "./fondo-view";

import type { PlataViewProps } from "./plata-view-props";

export type PlataViewKey = "gastos" | "saldos" | "fondo";

const VIEWS = ["gastos", "saldos", "fondo"] as const satisfies readonly PlataViewKey[];

const OPTIONS: Array<{ value: PlataViewKey; label: string }> = [
  { value: "gastos", label: "Gastos" },
  { value: "saldos", label: "Saldos" },
  { value: "fondo", label: "Fondo" },
];

interface PlataScreenProps {
  viewProps: PlataViewProps;
  gastos: React.ComponentProps<typeof GastosView>;
}

/** Plata tab: Gastos is server-rendered once (it is the default); Saldos and Fondo load their own data. */
export function PlataScreen({ viewProps, gastos }: PlataScreenProps): React.JSX.Element {
  const [view, setView] = useSegmentView(VIEWS, "gastos");

  return (
    <TabScreen
      title="Plata"
      segments={<SegmentedControl label="Vista de Plata" options={OPTIONS} value={view} onChange={setView} />}
      actions={
        <Link
          href={PLATA_ROUTES.comoVenimos}
          aria-label="Cómo venimos"
          className="flex size-10 items-center justify-center rounded-[12px] text-ink-2 transition-colors duration-100 hover:bg-surface hover:text-ink outline-none focus-visible:ring-2 focus-visible:ring-monte"
        >
          <BarChart3 className="size-5" strokeWidth={1.75} aria-hidden="true" />
        </Link>
      }
    >
      <div key={view} className="animate-content-in">
        {view === "gastos" && <GastosView {...gastos} />}
        {view === "saldos" && <SaldosView {...viewProps} />}
        {view === "fondo" && <FondoView {...viewProps} />}
      </div>
    </TabScreen>
  );
}
