import Link from "next/link";
import { ShoppingBasket } from "lucide-react";
import { APP_ROUTES } from "@habita/contracts";
import { StoreChip } from "@/components/ds/store-chip";
import { EmptyState } from "@/components/ds/empty-state";
import { formatArs } from "./casa-logic";

export interface SuperCardCart {
  productCount: number;
  storeName: string;
  totalPrice: number;
  relativeLabel: string;
}

interface SuperCardProps {
  cart: SuperCardCart | null;
}

/** Casa board, Súper card (handoff §5.3 "Casa") — current member's latest saved cart. */
export function SuperCard({ cart }: SuperCardProps): React.JSX.Element {
  if (!cart) {
    return (
      <Link href={APP_ROUTES.super} className="flex flex-col rounded-[20px] bg-surface">
        <EmptyState
          icon={ShoppingBasket}
          title="Súper"
          description="Armá la lista y compará precios"
          className="px-6 py-10"
        />
      </Link>
    );
  }

  return (
    <Link href={APP_ROUTES.super} className="flex flex-col gap-3 rounded-[20px] bg-surface p-6">
      <h2 className="text-[24px] font-bold leading-none tracking-[-.03em] text-ink">Súper</h2>
      <span className="text-[14px] text-ink-2">
        {cart.productCount} productos · {cart.relativeLabel}
      </span>
      <div className="mt-auto flex items-center gap-2">
        <StoreChip store={cart.storeName} />
        <span className="text-[18px] font-medium tabular-nums text-ink">{formatArs(cart.totalPrice)}</span>
      </div>
    </Link>
  );
}
