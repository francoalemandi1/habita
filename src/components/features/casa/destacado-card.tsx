import Link from "next/link";
import { CalendarHeart, ChevronRight } from "lucide-react";
import { RemoteImage } from "@/components/ds/remote-image";
import { PLANES_LIST_PATH } from "@/lib/planes-logic";

export interface DestacadoEvent {
  id: string;
  title: string;
  /** L1 label: "PARA EL FINDE" on weekends, "DESTACADO" otherwise. */
  label: string;
  /** "Domingo 11 h · Teatro del Libertador". */
  meta: string;
  imageUrl: string | null;
}

interface DestacadoCardProps {
  event: DestacadoEvent | null;
}

function ImagePlaceholder(): React.JSX.Element {
  return (
    <div className="flex size-full items-center justify-center bg-sand">
      <CalendarHeart className="size-7 text-ink-3" strokeWidth={1.75} aria-hidden="true" />
    </div>
  );
}

/** Casa board, Destacado card (§5.3 Casa) — at most one plan, with its photo. */
export function DestacadoCard({ event }: DestacadoCardProps): React.JSX.Element {
  if (!event) {
    return (
      <Link
        href={PLANES_LIST_PATH}
        className="flex flex-col justify-between gap-3 rounded-[20px] bg-surface p-5 outline-none transition-colors duration-100 hover:bg-surface/80 focus-visible:ring-2 focus-visible:ring-monte md:p-6"
      >
        <span className="text-[11px] font-semibold uppercase tracking-[.08em] text-ink-2">Planes</span>
        <span className="text-[14px] text-ink-2">Mirá qué hay para hacer cerca.</span>
        <span className="text-[13px] font-medium text-monte">Ver planes</span>
      </Link>
    );
  }

  return (
    <Link
      href={`/casa/planes/${event.id}`}
      className="group flex flex-col overflow-hidden rounded-[20px] bg-surface outline-none transition-colors duration-100 hover:bg-surface/80 focus-visible:ring-2 focus-visible:ring-monte"
    >
      {event.imageUrl && (
        <div className="relative h-28 w-full overflow-hidden bg-sand">
          <RemoteImage
            src={event.imageUrl}
            alt=""
            className="transition-transform duration-260 group-hover:scale-[1.02]"
            fallback={<ImagePlaceholder />}
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-1 p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[.08em] text-ink-2">{event.label}</span>
          <ChevronRight className="size-5 shrink-0 text-ink-3 transition-transform duration-100 group-hover:translate-x-0.5" strokeWidth={1.75} aria-hidden="true" />
        </div>
        <span className="line-clamp-2 text-[15px] font-semibold leading-snug text-ink">{event.title}</span>
        <span className="line-clamp-1 text-[13px] text-ink-2">{event.meta}</span>
      </div>
    </Link>
  );
}
