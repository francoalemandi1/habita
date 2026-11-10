import { ExternalLink } from "lucide-react";

import type { StoreCartLink } from "@habita/prices";

interface OpenStoreCartLinkProps {
  storeName: string;
  cartLink: StoreCartLink;
}

/** Deep link that loads the cart in the store's site (only VTEX stores support it). */
export function OpenStoreCartLink({ storeName, cartLink }: OpenStoreCartLinkProps): React.JSX.Element {
  const isPartial = cartLink.includedCount < cartLink.totalCount;

  return (
    <div className="mx-4 mb-3">
      <a
        href={cartLink.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-11 items-center justify-center gap-1.5 rounded-[12px] bg-sand px-3 py-2 text-xs font-medium text-ink-2 transition-colors hover:bg-line-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monte"
      >
        <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        Abrir carrito en {storeName}
      </a>
      {isPartial && (
        <p className="mt-1 text-center text-[11px] text-ink-2">
          Carga {cartLink.includedCount} de {cartLink.totalCount} productos. Los demás, desde su link.
        </p>
      )}
    </div>
  );
}
