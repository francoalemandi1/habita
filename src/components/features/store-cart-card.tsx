"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { StoreLogo } from "@/components/ui/store-logo";
import { ChevronDown, ChevronUp, Trophy, ExternalLink, X, Undo2, AlertCircle, ArrowDownRight, ClipboardCopy, Check, Package } from "lucide-react";

import type { AlternativeProduct, ProductUnitInfo } from "@/lib/supermarket-search";
import type { AdjustedStoreCart, AdjustedCartProduct } from "@/components/features/grocery-advisor";

// ============================================
// Helpers
// ============================================

function formatUnitLabel(unitInfo: ProductUnitInfo): string {
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
  cart: AdjustedStoreCart;
  rank: number;
  isComplete: boolean;
  onSwapProduct?: (searchTerm: string, alternative: AlternativeProduct) => void;
  onRemoveProduct?: (searchTerm: string) => void;
  onRestoreProduct?: (searchTerm: string) => void;
}

export function StoreCartCard({ cart, rank, isComplete, onSwapProduct, onRemoveProduct, onRestoreProduct }: StoreCartCardProps) {
  const isBest = rank === 0;
  const activeProducts = cart.products.filter((p) => !p.isRemoved);
  const activeCount = activeProducts.length;

  // Cart-level comparison vs market average
  const productsWithAverage = activeProducts.filter((p) => p.averagePrice != null);
  const cartAvgTotal = productsWithAverage.reduce((s, p) => s + (p.averagePrice ?? 0), 0);
  const cartActualTotal = productsWithAverage.reduce((s, p) => s + p.price, 0);
  const savingsAmount = cartAvgTotal > 0 ? Math.round(cartAvgTotal - cartActualTotal) : 0;
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
          <div className="relative">
            <StoreLogo storeName={cart.storeName} sizeClass="h-10 w-10" radiusClass="rounded-xl" fallbackFontClass="text-sm" />
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
                  <span className="text-green-600 dark:text-green-400">
                    {cart.cheapestCount} al mejor precio
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
              {savingsPercent > 0 ? `${savingsPercent}% menos vs promedio` : `+${Math.abs(savingsPercent)}% vs promedio`}
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

      {/* Savings footer — actionable conclusion */}
      {savingsAmount > 0 && isBest && (
        <div className="mx-3 mb-3 rounded-xl bg-green-50 px-3 py-2 dark:bg-green-950/30">
          <p className="text-xs font-medium text-green-700 dark:text-green-400">
            Ahorrás {formatPrice(savingsAmount)} comprando acá vs el promedio del mercado
          </p>
        </div>
      )}
      {savingsAmount < 0 && (
        <div className="mx-3 mb-3 rounded-xl bg-amber-50 px-3 py-2 dark:bg-amber-950/30">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {formatPrice(Math.abs(savingsAmount))} más caro que el promedio
          </p>
        </div>
      )}

      {/* Copy list — winner card only */}
      {isBest && (
        <div className="mx-3 mb-3">
          <CopyListButton products={activeProducts} storeName={cart.storeName} />
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

  // Find cheapest alternative (for inline suggestion)
  const cheaperAlt = product.alternatives.length > 0
    ? product.alternatives.reduce<AlternativeProduct | null>((best, alt) => {
        if (alt.price < product.price && (!best || alt.price < best.price)) return alt;
        return best;
      }, null)
    : null;

  // Removed product: strikethrough with restore button
  if (product.isRemoved) {
    return (
      <div className="flex items-center justify-between px-4 py-2.5 opacity-50">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm line-through">{product.productName}</p>
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
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <ProductThumbnail imageUrl={product.imageUrl} />
          <a
            href={product.link}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 flex-1"
          >
            <p className="truncate text-sm font-medium">{product.productName}</p>
            {product.unitInfo && (
              <p className="text-[11px] text-muted-foreground/70">
                {formatUnitLabel(product.unitInfo)}
              </p>
            )}
          </a>
        </div>
        <div className="ml-2 flex shrink-0 items-center gap-1.5">
          <div className="text-right">
            <span
              className={cn(
                "tabular-nums",
                product.isCheapest
                  ? "text-sm font-bold text-green-600 dark:text-green-400"
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

      {/* Cheaper alternative inline suggestion */}
      {cheaperAlt && onSwap && (
        <button
          type="button"
          onClick={() => onSwap(cheaperAlt)}
          className="mx-4 mb-1 flex w-[calc(100%-2rem)] items-center gap-1.5 rounded-lg bg-green-50 px-2.5 py-1.5 text-left transition-colors hover:bg-green-100 dark:bg-green-950/30 dark:hover:bg-green-950/50"
        >
          <ArrowDownRight className="h-3 w-3 shrink-0 text-green-600 dark:text-green-400" />
          <span className="min-w-0 flex-1 truncate text-[11px] text-green-700 dark:text-green-400">
            {cheaperAlt.productName}
          </span>
          <span className="shrink-0 text-[11px] font-semibold text-green-600 dark:text-green-400">
            {formatPrice(cheaperAlt.price)}
          </span>
        </button>
      )}

      {/* More alternatives (if any beyond the inline suggestion) */}
      {product.alternatives.length > 1 && (
        <AlternativesSection
          alternatives={product.alternatives.filter((a) => a.link !== cheaperAlt?.link)}
          onSwap={onSwap}
        />
      )}
      {product.alternatives.length === 1 && !cheaperAlt && (
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

  if (alternatives.length === 0) return null;

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
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors",
                onSwap ? "cursor-pointer hover:bg-primary/10" : "hover:bg-muted/40",
              )}
              onClick={onSwap ? () => onSwap(alt) : undefined}
            >
              <ProductThumbnail imageUrl={alt.imageUrl} size="sm" />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {alt.productName}
              </span>
              <div className="ml-2 flex shrink-0 items-center gap-2">
                <span className="font-medium">{formatPrice(alt.price)}</span>
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

// ============================================
// Copy List Button
// ============================================

function CopyListButton({ products, storeName }: { products: AdjustedCartProduct[]; storeName: string }) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const lines = products.map((p) => `- ${p.productName}`);
    const text = `Lista para ${storeName}:\n${lines.join("\n")}`;
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [products, storeName]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium transition-colors",
        isCopied
          ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
          : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {isCopied ? (
        <>
          <Check className="h-3 w-3" />
          Lista copiada
        </>
      ) : (
        <>
          <ClipboardCopy className="h-3 w-3" />
          Copiar lista
        </>
      )}
    </button>
  );
}

// ============================================
// Product Thumbnail
// ============================================

function ProductThumbnail({ imageUrl, size = "md" }: { imageUrl: string | null; size?: "sm" | "md" }) {
  const [hasError, setHasError] = useState(false);
  const sizeClass = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const iconClass = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  if (!imageUrl || hasError) {
    return (
      <div className={cn("flex shrink-0 items-center justify-center rounded-lg bg-muted/40", sizeClass)}>
        <Package className={cn(iconClass, "text-muted-foreground/50")} />
      </div>
    );
  }

  return (
    <div className={cn("shrink-0 overflow-hidden rounded-lg bg-white", sizeClass)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt=""
        className="h-full w-full object-contain"
        loading="lazy"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
