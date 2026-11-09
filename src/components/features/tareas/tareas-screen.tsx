"use client";

import Link from "next/link";
import { Shuffle, Sparkles } from "lucide-react";
import { TabScreen } from "@/components/ds/tab-screen";
import { SegmentedControl } from "@/components/ds/segmented-control";
import { useSegmentView } from "@/hooks/use-segment-view";
import { TAREAS_ROUTES } from "@habita/contracts";
import { SemanaView } from "./semana-view";
import { ListaView } from "./lista-view";
import { RepartoView } from "./reparto-view";

export type TareasViewKey = "semana" | "lista" | "reparto";

const VIEWS = ["semana", "lista", "reparto"] as const satisfies readonly TareasViewKey[];

const OPTIONS: Array<{ value: TareasViewKey; label: string }> = [
  { value: "semana", label: "Semana" },
  { value: "lista", label: "Lista" },
  { value: "reparto", label: "Reparto" },
];

interface TareasScreenProps {
  members: ReadonlyArray<{ id: string; name: string }>;
  currentMemberId: string;
}

/** Tareas tab: Semana · Lista · Reparto switch on the client; each view owns its React Query data. */
export function TareasScreen({ members, currentMemberId }: TareasScreenProps): React.JSX.Element {
  const [view, setView] = useSegmentView(VIEWS, "semana");

  return (
    <TabScreen
      title="Tareas"
      className="max-w-[1360px]"
      segments={<SegmentedControl label="Vista de Tareas" options={OPTIONS} value={view} onChange={setView} />}
      actions={<TareasActions />}
    >
      <div key={view} className="animate-content-in">
        {view === "semana" && <SemanaView members={members} currentMemberId={currentMemberId} />}
        {view === "lista" && <ListaView />}
        {view === "reparto" && <RepartoView currentMemberId={currentMemberId} />}
      </div>
    </TabScreen>
  );
}

const ACTION_CLASS =
  "flex h-10 items-center gap-2 rounded-[12px] px-3 text-[14px] font-semibold transition-colors duration-100 outline-none focus-visible:ring-2 focus-visible:ring-monte";

function TareasActions(): React.JSX.Element {
  return (
    <>
      <Link href={TAREAS_ROUTES.rotations} className={`${ACTION_CLASS} bg-surface text-ink hover:bg-sand`}>
        <Shuffle className="size-4" strokeWidth={1.75} aria-hidden="true" />
        <span className="hidden sm:inline">Rotaciones</span>
        <span className="sr-only sm:hidden">Rotaciones</span>
      </Link>
      <Link href={TAREAS_ROUTES.plan} className={`${ACTION_CLASS} bg-ink text-paper hover:bg-ink/90`}>
        <Sparkles className="size-4" strokeWidth={1.75} aria-hidden="true" />
        Plan
      </Link>
    </>
  );
}
