import Link from "next/link";
import { PLANES_LIST_PATH } from "@/lib/planes-logic";

export interface DestacadoEvent {
  id: string;
  title: string;
  subtitle: string;
}

interface DestacadoCardProps {
  event: DestacadoEvent | null;
}

/** Casa board, Destacado card (handoff §5.3 "Casa") — at most one event. */
export function DestacadoCard({ event }: DestacadoCardProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3 rounded-[20px] bg-surface p-6">
      <span className="text-[11px] font-semibold uppercase tracking-[.08em] text-ink-3">Destacado</span>
      {event ? (
        <Link href={`/casa/planes/${event.id}`} className="flex flex-col gap-0.5">
          <span className="text-[15px] font-medium text-ink">{event.title}</span>
          <span className="text-[13px] text-ink-2">{event.subtitle}</span>
        </Link>
      ) : (
        <span className="text-[13px] text-ink-2">Todavía no hay planes cerca.</span>
      )}
      <Link href={PLANES_LIST_PATH} className="mt-auto text-[13px] text-monte underline underline-offset-[3px]">
        Ver todos
      </Link>
    </div>
  );
}
