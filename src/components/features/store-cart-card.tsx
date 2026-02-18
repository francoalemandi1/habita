"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Store, ChevronDown, ChevronUp, Trophy, ExternalLink, Tag } from "lucide-react";

import type { StoreCart, CartProduct, AlternativeProduct, ProductUnitInfo } from "@/lib/supermarket-search";

// ============================================
// Helpers
// ============================================

/** Format price-per-unit for display: "500g · $3.260/kg" or "1.5L · $3.906/L" */
function formatUnitInfo(unitInfo: ProductUnitInfo): string {
  if (unitInfo.unit === "g") {
    const perKg = (unitInfo.pricePerUnit * 1000).toLocaleString("es-AR", {
      maximumFractionDigits: 0,
    });
    return `${unitInfo.unitLabel} · $${perKg}/kg`;
  }
  const perLiter = (unitInfo.pricePerUnit * 1000).toLocaleString("es-AR", {
    maximumFractionDigits: 0,
  });
  return `${unitInfo.unitLabel} · $${perLiter}/L`;
}

function formatPrice(price: number): string {
  return `$${price.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ============================================
// Store Cart Card
// ============================================

interface StoreCartCardProps {
  cart: StoreCart;
  rank: number;
}

export function StoreCartCard({ cart, rank }: StoreCartCardProps) {
  const isBest = rank === 0;

  return (
    <div
      className={cn(
        "rounded-xl border transition-colors",
        isBest && "border-primary/30 bg-primary/[0.02]",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              isBest
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            <Store className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{cart.storeName}</h3>
              {isBest && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  Mejor opcion
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {cart.products.length} producto{cart.products.length !== 1 ? "s" : ""}
              {cart.cheapestCount > 0 && (
                <>
                  {" · "}
                  <span className="inline-flex items-center gap-0.5">
                    <Trophy className="inline h-2.5 w-2.5" />
                    {cart.cheapestCount}/{cart.products.length} al menor precio
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <span className="text-sm font-semibold">{formatPrice(cart.totalPrice)}</span>
      </div>

      {/* Product list */}
      <ProductList products={cart.products} />
    </div>
  );
}

// ============================================
// Product List (collapsible)
// ============================================

function ProductList({ products }: { products: CartProduct[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const visibleProducts = isExpanded ? products : products.slice(0, 3);
  const hasMore = products.length > 3;

  return (
    <div className="border-t">
      {visibleProducts.map((product) => (
        <ProductRow key={product.searchTerm} product={product} />
      ))}

      {hasMore && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-center gap-1 px-4 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Ver menos
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Ver {products.length - 3} mas
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ============================================
// Product Row
// ============================================

function ProductRow({ product }: { product: CartProduct }) {
  const hasDiscount = product.listPrice && product.listPrice > product.price;

  return (
    <div>
      <a
        href={product.link}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-muted/20"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm">{product.productName}</p>
            {product.isCheapest && (
              <Tag className="h-3 w-3 shrink-0 text-green-600" />
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {product.searchTerm}
          </p>
          {product.unitInfo && (
            <p className="text-[11px] text-muted-foreground/70">
              {formatUnitInfo(product.unitInfo)}
            </p>
          )}
        </div>
        <div className="ml-2 flex shrink-0 items-center gap-1.5">
          <div className="text-right">
            <span
              className={cn(
                "text-sm font-semibold",
                product.isCheapest ? "text-green-600" : "text-foreground",
              )}
            >
              {formatPrice(product.price)}
            </span>
            {hasDiscount && (
              <span className="ml-1.5 text-xs text-muted-foreground line-through">
                {formatPrice(product.listPrice!)}
              </span>
            )}
          </div>
          <ExternalLink className="h-3 w-3 text-muted-foreground" />
        </div>
      </a>

      {/* Alternatives */}
      {product.alternatives.length > 0 && (
        <AlternativesSection alternatives={product.alternatives} />
      )}
    </div>
  );
}

// ============================================
// Alternatives Section (collapsible)
// ============================================

function AlternativesSection({ alternatives }: { alternatives: AlternativeProduct[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="px-4 pb-1">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 py-1 pl-1 text-[11px] text-muted-foreground/70 transition-colors hover:text-foreground"
      >
        <ChevronDown className={cn("h-2.5 w-2.5 transition-transform", isOpen && "rotate-180")} />
        {alternatives.length} alternativa{alternatives.length !== 1 ? "s" : ""}
      </button>

      {isOpen && (
        <div className="ml-1 space-y-0.5 rounded-md bg-muted/30 p-1.5">
          {alternatives.map((alt) => (
            <a
              key={alt.link}
              href={alt.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded px-1.5 py-1 text-xs transition-colors hover:bg-muted/40"
            >
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {alt.productName}
              </span>
              <div className="ml-2 flex shrink-0 items-center gap-1.5">
                <span className="font-medium">{formatPrice(alt.price)}</span>
                {alt.unitInfo && (
                  <span className="text-muted-foreground/60">
                    {formatUnitInfo(alt.unitInfo)}
                  </span>
                )}
                <ExternalLink className="h-2.5 w-2.5 text-muted-foreground/50" />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
