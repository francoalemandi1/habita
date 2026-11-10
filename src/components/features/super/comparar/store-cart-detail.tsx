"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { StoreChip } from "@/components/ds/store-chip";
import { SaveButton } from "@/components/ds/save-button";
import { OpenStoreCartLink } from "./store-cart/open-store-cart-link";
import { ProductRow } from "./store-cart/product-row";
import { formatPrice } from "./store-cart/helpers";

import type { AdjustedStoreCart, CompareAlternative as AlternativeProduct, StoreCartLink } from "@habita/prices";

interface StoreCartDetailProps {
  cart: AdjustedStoreCart;
  mapsUrl: string;
  cartLink: StoreCartLink | null;
  isSaved: boolean;
  isSavePending: boolean;
  onToggleSave: () => void;
  onBack: () => void;
  onSwapProduct: (searchTerm: string, alternative: AlternativeProduct) => void;
  onFindAlternatives?: (
    searchTerm: string,
    currentProductName: string,
    query: string,
    storeName: string,
  ) => Promise<AlternativeProduct[]>;
}

/** One store's cart, replacing the comparison summary while it's open. */
export function StoreCartDetail({
  cart,
  mapsUrl,
  cartLink,
  isSaved,
  isSavePending,
  onToggleSave,
  onBack,
  onSwapProduct,
  onFindAlternatives,
}: StoreCartDetailProps): React.JSX.Element {
  const [openProductTerm, setOpenProductTerm] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cheapestCount = cart.products.filter((product) => product.isCheapest).length;

  useEffect(() => {
    headingRef.current?.focus();
  }, [cart.storeName]);

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={onBack}
        className="min-h-11 w-fit rounded text-left text-[14px] font-semibold text-monte focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monte"
      >
        ‹ Comparación
      </button>

      <div className="rounded-[20px] bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <StoreChip store={cart.storeName} />
            <h3 ref={headingRef} tabIndex={-1} className="mt-2 text-[40px] font-bold leading-none tracking-[-.03em] text-ink outline-none">
              <span className="sr-only">Carrito en {cart.storeName}: </span>
              {formatPrice(cart.totalPrice)}
            </h3>
            <p className="mt-1 text-[13px] text-ink-2">
              {cart.products.length} de {cart.totalSearched} productos
              {cheapestCount > 0 && ` · ${cheapestCount} al mejor precio`}
            </p>
          </div>
          <SaveButton isSaved={isSaved} isPending={isSavePending} onToggle={onToggleSave} size="md" />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {cartLink && <OpenStoreCartLink storeName={cart.storeName} cartLink={cartLink} />}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center gap-1.5 rounded-[12px] bg-sand px-3 text-[13px] font-medium text-ink-2 transition-colors hover:bg-line-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monte"
          >
            <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
            Cómo llegar
          </a>
        </div>

        {cart.missingTerms.length > 0 && (
          <div className="mt-3 rounded-[12px] bg-ladrillo-soft px-3 py-2 text-[13px] text-ladrillo-text">
            No lo encontramos acá: {cart.missingTerms.join(", ")}
          </div>
        )}

        <div className="mt-3">
          {cart.products.map((product) => (
            <ProductRow
              key={product.searchTerm}
              product={product}
              isOpen={openProductTerm === product.searchTerm}
              onToggleOpen={() =>
                setOpenProductTerm((prev) => (prev === product.searchTerm ? null : product.searchTerm))
              }
              onSwap={(alternative) => onSwapProduct(product.searchTerm, alternative)}
              onFindAlternatives={
                onFindAlternatives
                  ? (query) => onFindAlternatives(product.searchTerm, product.productName, query, cart.storeName)
                  : undefined
              }
            />
          ))}
        </div>

        <p className="mt-3 text-[12.5px] text-ink-2">Los precios pueden variar al momento de la compra.</p>
      </div>
    </div>
  );
}
