"use client";

import { useCallback, useMemo, useState } from "react";
import { buildStoreCartUrl } from "@habita/prices";
import { cn } from "@/lib/utils";

import type { AdjustedStoreCart, CompareAlternative as AlternativeProduct } from "@habita/prices";
import type { BankPromo } from "@prisma/client";
import { ProductRow } from "./product-row";
import { PromoBanner } from "./promo-banner";
import { CartHeader } from "./cart-header";
import { CartFootnotes } from "./cart-footnotes";
import { CartActions } from "./cart-actions";
import { OpenStoreCartLink } from "./open-store-cart-link";
import { calcDiscountedPrice, formatPrice } from "./helpers";

interface StoreCartCardProps {
  cart: AdjustedStoreCart;
  rank: number;
  isComplete: boolean;
  onSwapProduct?: (searchTerm: string, alternative: AlternativeProduct) => void;
  onFindAlternatives?: (
    searchTerm: string,
    currentProductName: string,
    query: string,
    storeName: string,
  ) => Promise<AlternativeProduct[]>;
  isSaved?: boolean;
  isSavePending?: boolean;
  onToggleSave?: () => void;
  onRegisterAsExpense?: (storeName: string, totalPrice: number) => void;
  promos?: BankPromo[];
  isPinned?: boolean;
  onPinStore?: (storeName: string) => void;
  preferredBankSlugs?: string[];
  userCoords?: { lat: number; lng: number };
}

export function StoreCartCard({ cart, rank, isComplete, onSwapProduct, onFindAlternatives, isSaved, isSavePending, onToggleSave, promos, isPinned, onPinStore, preferredBankSlugs, userCoords }: StoreCartCardProps) {
  const isBest = rank === 0;
  const [isOpen, setIsOpen] = useState(false);
  const cartLink = useMemo(() => buildStoreCartUrl(cart.storeName, cart.products), [cart.storeName, cart.products]);

  const mapsUrl = useMemo(() => {
    const q = encodeURIComponent(`${cart.storeName} supermercado`);
    if (userCoords) {
      return `https://www.google.com/maps/dir/?api=1&origin=${userCoords.lat},${userCoords.lng}&destination=${q}&travelmode=driving`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  }, [cart.storeName, userCoords]);

  // Cart-level comparison vs market average
  const productsWithAverage = cart.products.filter((p) => p.averagePrice != null);
  const cartAvgTotal = productsWithAverage.reduce((sum, p) => sum + ((p.averagePrice ?? 0) * p.quantity), 0);
  const cartActualTotal = productsWithAverage.reduce((sum, p) => sum + p.lineTotal, 0);
  const savingsAmount = cartAvgTotal > 0 ? Math.round(cartAvgTotal - cartActualTotal) : 0;
  const savingsPercent = cartAvgTotal > 0 ? Math.round((1 - cartActualTotal / cartAvgTotal) * 100) : null;

  // Promo selection + discounted price — auto-select first preferred bank's promo on mount
  const preferredPromo = preferredBankSlugs?.length
    ? promos?.find((p) => preferredBankSlugs.includes(p.bankSlug)) ?? null
    : null;
  const [selectedPromoId, setSelectedPromoId] = useState<string | null>(preferredPromo?.id ?? null);
  const selectedPromo = promos?.find((p) => p.id === selectedPromoId) ?? null;
  const discountedPrice = selectedPromo
    ? calcDiscountedPrice(cart.totalPrice, selectedPromo.discountPercent, selectedPromo.capAmount)
    : null;
  const promoLabel = selectedPromo ? `-${selectedPromo.discountPercent}% ${selectedPromo.bankDisplayName}` : null;

  const [shareLabel, setShareLabel] = useState<string | null>(null);

  const handleShare = useCallback(async () => {
    const today = new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long" });
    const activeProducts = cart.products;
    const productLines = activeProducts.map((p) => {
      const qty = p.quantity > 1 ? ` x${p.quantity}` : "";
      return `• ${p.productName}${qty} — ${formatPrice(p.lineTotal)}`;
    });
    const lines = [
      `🛒 *Lista ${cart.storeName}* — ${today}`,
      "",
      ...productLines,
      "",
      `*Total: ${formatPrice(cart.totalPrice)}*`,
      "",
      "_Generado con Habita_",
    ];
    const text = lines.join("\n");
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: `${cart.storeName} - Habita`, text });
        setShareLabel("¡Compartido!");
      } else {
        await navigator.clipboard.writeText(text);
        setShareLabel("¡Copiado!");
      }
    } catch (error) {
      console.error("StoreCartCard: failed to share cart", error);
      return;
    }
    setTimeout(() => setShareLabel(null), 2000);
  }, [cart]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[20px] bg-surface transition-all duration-200",
        isBest && "ring-2 ring-monte",
        "animate-stagger-fade-in",
      )}
      style={{ "--stagger-index": rank } as React.CSSProperties}
    >
      <CartHeader
        cart={cart}
        isBest={isBest}
        isComplete={isComplete}
        isPinned={isPinned}
        isOpen={isOpen}
        onToggleOpen={() => setIsOpen((v) => !v)}
        mapsUrl={mapsUrl}
        discountedPrice={discountedPrice}
        promoLabel={promoLabel}
        savingsPercent={savingsPercent}
        onToggleSave={onToggleSave}
        isSaved={isSaved}
        isSavePending={isSavePending}
      />

      {promos && promos.length > 0 && (
        <PromoBanner
          promos={promos}
          selectedPromoId={selectedPromoId}
          onSelectPromo={setSelectedPromoId}
        />
      )}

      {isOpen && (
        <div className="border-t border-line-soft">
          {cart.products.map((product) => (
            <ProductRow
              key={product.searchTerm}
              product={product}
              onSwap={onSwapProduct ? (alt) => onSwapProduct(product.searchTerm, alt) : undefined}
              onFindAlternatives={onFindAlternatives ? (query) => onFindAlternatives(product.searchTerm, product.productName, query, cart.storeName) : undefined}
            />
          ))}

          <p className="px-4 pb-3 pt-2 text-[11px] text-ink-2">
            * Los precios pueden variar al momento de la compra.
          </p>
        </div>
      )}

      <CartFootnotes missingTerms={cart.missingTerms} savingsAmount={savingsAmount} isBest={isBest} />

      {isOpen && cartLink && <OpenStoreCartLink storeName={cart.storeName} cartLink={cartLink} />}

      {isOpen && (
        <CartActions
          storeName={cart.storeName}
          isPinned={isPinned}
          onPinStore={onPinStore}
          shareLabel={shareLabel}
          onShare={() => { void handleShare(); }}
        />
      )}
    </div>
  );
}
