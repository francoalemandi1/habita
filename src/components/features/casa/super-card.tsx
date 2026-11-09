import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { APP_ROUTES } from "@habita/contracts";
import { StoreChip } from "@/components/ds/store-chip";
import { formatArs } from "./casa-logic";

export interface SuperCardCart {
  storeName: string;
  totalPrice: number;
  relativeLabel: string;
}

interface SuperCardProps {
  pendingItemCount: number;
  /** Latest saved cart, only when it is recent enough for its prices to still mean something. */
  recentCart: SuperCardCart | null;
}

function listLabel(count: number): string {
  if (count === 0) return "La lista está vacía";
  if (count === 1) return "1 producto en la lista";
  return `${count} productos en la lista`;
}

/** Casa board, Súper card (§5.3 Casa): the shared list and, if fresh, where it was cheapest. */
export function SuperCard({ pendingItemCount, recentCart }: SuperCardProps): React.JSX.Element {
  return (
    <Link
      href={APP_ROUTES.super}
      className="group flex flex-col gap-3 rounded-[20px] bg-surface p-5 outline-none transition-colors duration-100 hover:bg-surface/80 focus-visible:ring-2 focus-visible:ring-monte md:p-6"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[22px] font-bold leading-none tracking-[-.03em] text-ink">Súper</h2>
        <ChevronRight className="size-5 text-ink-3 transition-transform duration-100 group-hover:translate-x-0.5" strokeWidth={1.75} aria-hidden="true" />
      </div>
      <span className="text-[14px] text-ink-2">{listLabel(pendingItemCount)}</span>
      {recentCart ? (
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-2">
          <StoreChip store={recentCart.storeName} />
          <span className="text-[18px] font-semibold tracking-[-.02em] text-ink">{formatArs(recentCart.totalPrice)}</span>
          <span className="text-[12px] text-ink-2">{recentCart.relativeLabel}</span>
        </div>
      ) : (
        <span className="mt-auto pt-2 text-[13px] font-medium text-monte">
          {pendingItemCount > 0 ? "Comparar precios" : "Agregar productos"}
        </span>
      )}
    </Link>
  );
}
