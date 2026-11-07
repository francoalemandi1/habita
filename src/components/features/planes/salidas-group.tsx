import { Compass } from "lucide-react";
import { EmptyState } from "@/components/ds/empty-state";
import { Skeleton } from "@/components/ds/skeleton";
import { InlineError } from "@/components/features/inline-error";
import { SalidasRow } from "@/components/features/planes/salidas-row";

import type { SalidaGroupState } from "@/lib/planes-salidas-logic";
import type { RelaxEvent } from "@/lib/events/types";

export interface SalidasGroupProps {
  title: string;
  /** "missing-city" is handled one level up, by the panel — never rendered here. */
  state: SalidaGroupState;
  events: RelaxEvent[];
  emptyDescription: string;
  onRetry: () => void;
}

/** One Salidas group ("Actividades" or "Restaurantes") — handles its own loading/error/empty state. */
export function SalidasGroup({ title, state, events, emptyDescription, onRetry }: SalidasGroupProps): React.JSX.Element {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[13px] font-semibold uppercase tracking-[.04em] text-ink-2">{title}</h2>

      {state === "loading" && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {state === "ai-disabled" && <p className="text-[14px] text-ink-2">Hoy no podemos sugerir esto.</p>}

      {state === "error" && (
        <InlineError message={`No pudimos cargar ${title.toLowerCase()}.`} onRetry={onRetry} />
      )}

      {state === "empty" && <EmptyState icon={Compass} title="Sin resultados" description={emptyDescription} />}

      {state === "ready" && (
        <div className="flex flex-col">
          {events.map((event, index) => (
            <SalidasRow key={event.id ?? `${title}-${index}`} event={event} />
          ))}
        </div>
      )}

      {state === "missing-city" && null}
    </section>
  );
}
