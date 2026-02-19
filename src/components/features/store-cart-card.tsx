"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { storeColors, storeColorFallback } from "@/lib/design-tokens";
import { ChevronDown, ChevronUp, Trophy, ExternalLink, Tag, X, Undo2, AlertCircle } from "lucide-react";

import type { AlternativeProduct, ProductUnitInfo } from "@/lib/supermarket-search";
import type { AdjustedStoreCart, AdjustedCartProduct } from "@/components/features/grocery-advisor";

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

function getStoreColor(storeName: string) {
  return storeColors[storeName] ?? storeColorFallback;
}

// ============================================
// Store Cart Card
// ============================================

interface StoreCartCardProps {
  cart: AdjustedStoreCart;
  rank: number;
  isComplete: boolean;
  onSwapProduct?: (searchTerm: string, alternative: AlternativeProduct) => void;
  onRemoveProduct?: (searchTerm: string) => void;
  onRestoreProduct?: (searchTerm: string) => void;
}

export function StoreCartCard({ cart, rank, isComplete, onSwapProduct, onRemoveProduct, onRestoreProduct }: StoreCartCardProps) {
  const isBest = rank === 0;
  const storeColor = getStoreColor(cart.storeName);
  const activeProducts = cart.products.filter((p) => !p.isRemoved);
  const activeCount = activeProducts.length;

  // Cart-level comparison vs market average
  const productsWithAverage = activeProducts.filter((p) => p.averagePrice != null);
  const cartAvgTotal = productsWithAverage.reduce((s, p) => s + (p.averagePrice ?? 0), 0);
  const cartActualTotal = productsWithAverage.reduce((s, p) => s + p.price, 0);
  const savingsPercent = cartAvgTotal > 0 ? Math.round((1 - cartActualTotal / cartAvgTotal) * 100) : null;

  return (
    <div
      className={cn(
        "rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md",
        isBest
          ? "border-2 border-primary/50 bg-primary/5 shadow-primary/10"
          : "border border-border/60 bg-card",
        "animate-stagger-fade-in",
      )}
      style={{ '--stagger-index': rank } as React.CSSProperties}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          {/* Store avatar — letter with brand color */}
          <div
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
            style={{ backgroundColor: storeColor.bg, color: storeColor.text }}
          >
            {cart.storeName.charAt(0).toUpperCase()}
            {isBest && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 shadow-sm">
                <Trophy className="h-2.5 w-2.5 text-white" />
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{cart.storeName}</h3>
              {isBest && isComplete && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  Mejor opcion
                </span>
              )}
              {isBest && !isComplete && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  Mejor precio
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeCount} de {cart.totalSearched} producto{cart.totalSearched !== 1 ? "s" : ""}
              {cart.cheapestCount > 0 && (
                <>
                  {" · "}
                  <span className="inline-flex items-center gap-0.5 text-green-600 dark:text-green-400">
                    <Tag className="inline h-2.5 w-2.5" />
                    {cart.cheapestCount}/{activeCount} al menor precio
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Price block */}
        <div className="text-right">
          <div className={cn("text-lg font-bold tabular-nums", isBest ? "text-primary" : "text-foreground")}>
            {formatPrice(cart.totalPrice)}
          </div>
          {savingsPercent != null && savingsPercent !== 0 && (
            <span className={cn(
              "text-[11px] font-medium",
              savingsPercent > 0 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400",
            )}>
              {savingsPercent > 0 ? `${savingsPercent}% menos` : `+${Math.abs(savingsPercent)}%`}
            </span>
          )}
        </div>
      </div>

      {/* Product list */}
      <ProductList
        products={cart.products}
        onSwapProduct={onSwapProduct}
        onRemoveProduct={onRemoveProduct}
        onRestoreProduct={onRestoreProduct}
      />

      {/* Missing products disclaimer */}
      {cart.missingTerms.length > 0 && (
        <div className="mx-3 mb-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 dark:bg-amber-950/30">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">No encontrado</p>
            <p className="text-[11px] text-amber-600 dark:text-amber-500">
              {cart.missingTerms.join(", ")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Product List (collapsible)
// ============================================

interface ProductListProps {
  products: AdjustedCartProduct[];
  onSwapProduct?: (searchTerm: string, alternative: AlternativeProduct) => void;
  onRemoveProduct?: (searchTerm: string) => void;
  onRestoreProduct?: (searchTerm: string) => void;
}

function ProductList({ products, onSwapProduct, onRemoveProduct, onRestoreProduct }: ProductListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const visibleProducts = isExpanded ? products : products.slice(0, 3);
  const hasMore = products.length > 3;

  return (
    <div className="border-t">
      {visibleProducts.map((product) => (
        <ProductRow
          key={product.searchTerm}
          product={product}
          onSwap={onSwapProduct ? (alt) => onSwapProduct(product.searchTerm, alt) : undefined}
          onRemove={onRemoveProduct ? () => onRemoveProduct(product.searchTerm) : undefined}
          onRestore={onRestoreProduct ? () => onRestoreProduct(product.searchTerm) : undefined}
        />
      ))}

      {hasMore && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "mx-4 mb-2 mt-1 flex w-[calc(100%-2rem)] items-center justify-center gap-1.5",
            "rounded-full bg-muted/60 py-1.5 text-xs font-medium text-muted-foreground",
            "transition-colors hover:bg-muted hover:text-foreground",
          )}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Ver menos
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Ver {products.length - 3} productos mas
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

interface ProductRowProps {
  product: AdjustedCartProduct;
  onSwap?: (alternative: AlternativeProduct) => void;
  onRemove?: () => void;
  onRestore?: () => void;
}

function ProductRow({ product, onSwap, onRemove, onRestore }: ProductRowProps) {
  const hasDiscount = product.listPrice && product.listPrice > product.price;

  // Removed product: strikethrough with restore button
  if (product.isRemoved) {
    return (
      <div className="flex items-center justify-between px-4 py-2.5 opacity-50">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm line-through">{product.productName}</p>
          <p className="truncate text-xs text-muted-foreground line-through">
            {product.searchTerm}
          </p>
        </div>
        <div className="ml-2 flex shrink-0 items-center gap-1.5">
          <span className="text-sm text-muted-foreground line-through">
            {formatPrice(product.price)}
          </span>
          {onRestore && (
            <button
              type="button"
              onClick={onRestore}
              className="text-muted-foreground transition-colors hover:text-primary"
              title="Restaurar producto"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-muted/20">
        <a
          href={product.link}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1"
        >
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-medium">{product.productName}</p>
            {product.isCheapest && (
              <Tag className="h-3 w-3 shrink-0 text-green-600 dark:text-green-400" />
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground/70">
            {product.searchTerm}
          </p>
          {product.unitInfo && (
            <p className="text-[11px] text-muted-foreground/70">
              {formatUnitInfo(product.unitInfo)}
            </p>
          )}
          {product.averagePrice != null && (
            <p className="text-[11px] text-muted-foreground/70">
              {"Prom: "}
              {formatPrice(Math.round(product.averagePrice))}
              {product.price < product.averagePrice && (
                <span className="ml-1 text-green-600">
                  ({Math.round((1 - product.price / product.averagePrice) * 100)}% menos)
                </span>
              )}
              {product.price > product.averagePrice && (
                <span className="ml-1 text-amber-600">
                  ({Math.round((product.price / product.averagePrice - 1) * 100)}% mas)
                </span>
              )}
            </p>
          )}
        </a>
        <div className="ml-2 flex shrink-0 items-center gap-1.5">
          <div className="text-right">
            <span
              className={cn(
                "tabular-nums",
                product.isCheapest
                  ? "text-base font-bold text-green-600 dark:text-green-400"
                  : "text-sm font-semibold text-foreground",
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
          <a href={product.link} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </a>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-muted-foreground/40 transition-colors hover:text-destructive"
              title="Quitar producto"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Alternatives */}
      {product.alternatives.length > 0 && (
        <AlternativesSection alternatives={product.alternatives} onSwap={onSwap} />
      )}
    </div>
  );
}

// ============================================
// Alternatives Section (collapsible)
// ============================================

interface AlternativesSectionProps {
  alternatives: AlternativeProduct[];
  onSwap?: (alternative: AlternativeProduct) => void;
}

function AlternativesSection({ alternatives, onSwap }: AlternativesSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="px-4 pb-1.5">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
          "bg-muted/50 text-muted-foreground transition-colors",
          "hover:bg-muted hover:text-foreground",
          isOpen && "bg-primary/10 text-primary",
        )}
      >
        <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", isOpen && "rotate-180")} />
        {alternatives.length} alternativa{alternatives.length !== 1 ? "s" : ""}
      </button>

      {isOpen && (
        <div className="mt-1.5 space-y-0.5 rounded-xl bg-muted/40 p-2">
          {alternatives.map((alt) => (
            <div
              key={alt.link}
              className={cn(
                "flex items-center justify-between rounded-lg px-2 py-1.5 text-xs transition-colors",
                onSwap ? "cursor-pointer hover:bg-primary/10" : "hover:bg-muted/40",
              )}
              onClick={onSwap ? () => onSwap(alt) : undefined}
            >
              <div className="min-w-0 flex-1">
                <span className="truncate text-muted-foreground">
                  {alt.productName}
                </span>
              </div>
              <div className="ml-2 flex shrink-0 items-center gap-2">
                <span className="font-medium">{formatPrice(alt.price)}</span>
                {alt.unitInfo && (
                  <span className="text-[11px] text-muted-foreground/60">
                    {formatUnitInfo(alt.unitInfo)}
                  </span>
                )}
                {onSwap && (
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    Elegir
                  </span>
                )}
                <a
                  href={alt.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-2.5 w-2.5 text-muted-foreground/50" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
