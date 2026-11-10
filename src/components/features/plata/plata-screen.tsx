"use client";

import Link from "next/link";
import { BarChart3, Zap } from "lucide-react";
import { PLATA_ROUTES } from "@habita/contracts";
import { TabScreen } from "@/components/ds/tab-screen";
import { SegmentedControl } from "@/components/ds/segmented-control";
import { useSegmentView } from "@/hooks/use-segment-view";
import { GastosView } from "./gastos/gastos-view";
import { SaldosView } from "./saldos-view";
import { FondoView } from "./fondo-view";

import type { LucideIcon } from "lucide-react";
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
        <>
          <ScreenLink href={PLATA_ROUTES.servicios} label="Servicios" icon={Zap} />
          <ScreenLink href={PLATA_ROUTES.comoVenimos} label="Cómo venimos" icon={BarChart3} />
        </>
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

function ScreenLink({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) {
  return (
    <Link
      href={href}
      className="flex h-10 items-center gap-2 rounded-[12px] bg-surface px-3 text-[14px] font-semibold text-ink outline-none transition-colors duration-100 hover:bg-sand focus-visible:ring-2 focus-visible:ring-monte"
    >
      <Icon className="size-4" strokeWidth={1.75} aria-hidden="true" />
      <span className="sr-only lg:not-sr-only">{label}</span>
    </Link>
  );
}
