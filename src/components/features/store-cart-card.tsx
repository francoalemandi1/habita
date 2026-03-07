"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { StoreLogo } from "@/components/ui/store-logo";
import { SaveButton } from "@/components/ui/save-button";
import { ChevronDown, Trophy, ExternalLink, ArrowDownRight, ClipboardCopy, Check, Package, Tag, Pin, Share2, AlertCircle } from "lucide-react";

import type { AlternativeProduct, ProductUnitInfo } from "@/lib/supermarket-search";
import type { AdjustedStoreCart, AdjustedCartProduct } from "@/components/features/grocery-advisor";
import type { BankPromo } from "@prisma/client";

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

function buildSuggestedReplaceQuery(product: AdjustedCartProduct): string {
  const baseTerm = product.searchTerm.trim();
  if (!product.unitInfo) return baseTerm;
  const normalizedBase = baseTerm.toLowerCase();
  const unitLabel = product.unitInfo.unitLabel.toLowerCase();
  if (normalizedBase.includes(unitLabel)) return baseTerm;
  return `${baseTerm} ${product.unitInfo.unitLabel}`.trim();
}

function calcDiscountedPrice(totalPrice: number, discountPercent: number, capAmount: number | null): number {
  const rawDiscount = totalPrice * discountPercent / 100;
  const actualDiscount = capAmount && capAmount > 0 ? Math.min(rawDiscount, capAmount) : rawDiscount;
  return Math.round(totalPrice - actualDiscount);
}

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ============================================
// Store Cart Card
// ============================================

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
}

export function StoreCartCard({ cart, rank, isComplete, onSwapProduct, onFindAlternatives, isSaved, isSavePending, onToggleSave, promos, isPinned, onPinStore }: StoreCartCardProps) {
  const isBest = rank === 0;
  const [isOpen, setIsOpen] = useState(false);

  // Cart-level comparison vs market average
  const productsWithAverage = cart.products.filter((p) => p.averagePrice != null);
  const cartAvgTotal = productsWithAverage.reduce((sum, p) => sum + ((p.averagePrice ?? 0) * p.quantity), 0);
  const cartActualTotal = productsWithAverage.reduce((sum, p) => sum + p.lineTotal, 0);
  const savingsAmount = cartAvgTotal > 0 ? Math.round(cartAvgTotal - cartActualTotal) : 0;
  const savingsPercent = cartAvgTotal > 0 ? Math.round((1 - cartActualTotal / cartAvgTotal) * 100) : null;

  // Promo selection + discounted price
  const [selectedPromoId, setSelectedPromoId] = useState<string | null>(null);
  const selectedPromo = promos?.find((p) => p.id === selectedPromoId) ?? null;
  const discountedPrice = selectedPromo
    ? calcDiscountedPrice(cart.totalPrice, selectedPromo.discountPercent, selectedPromo.capAmount)
    : null;

  const [shareLabel, setShareLabel] = useState<string | null>(null);

  const handleShare = useCallback(async () => {
    const productLines = cart.products
      .slice(0, 5)
      .map((p) => `• ${p.productName}: $${p.price.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`);
    const extraCount = cart.products.length - 5;
    const lines = [
      `Comparé precios en ${cart.storeName} con Habita:`,
      "",
      ...productLines,
      ...(extraCount > 0 ? [`... y ${extraCount} más`] : []),
      "",
      `Total: $${cart.totalPrice.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`,
      ...(cart.cheapestCount > 0 ? ["", `💰 ${cart.cheapestCount} producto${cart.cheapestCount !== 1 ? "s" : ""} más barato${cart.cheapestCount !== 1 ? "s" : ""} que en otros supers`] : []),
      "",
      "Comparador de precios en Habita 🏠",
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
    } catch {
      return;
    }
    setTimeout(() => setShareLabel(null), 2000);
  }, [cart]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md",
        isBest || isPinned
          ? "border border-primary/30 bg-primary/3"
          : "border border-border/40 bg-card",
        "animate-stagger-fade-in",
      )}
      style={{ '--stagger-index': rank } as React.CSSProperties}
    >
      {/* Winner / pinned accent bar */}
      {(isBest || isPinned) && (
        <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-primary/40" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="relative shrink-0">
            <StoreLogo storeName={cart.storeName} sizeClass="h-10 w-10" radiusClass="rounded-xl" fallbackFontClass="text-sm" />
            {isBest && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 shadow-sm">
                <Trophy className="h-2.5 w-2.5 text-white" />
              </span>
            )}
            {isPinned && !isBest && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary shadow-sm">
                <Pin className="h-2.5 w-2.5 text-white" />
              </span>
            )}
          </div>
          <div className="min-w-0">
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
              {cart.products.length} de {cart.totalSearched} producto{cart.totalSearched !== 1 ? "s" : ""}
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

        {/* Price block + actions */}
        <div className="flex shrink-0 items-center gap-2">
          <div className="text-right">
            {discountedPrice != null ? (
              <>
                <div className="text-[11px] tabular-nums text-muted-foreground line-through">
                  {formatPrice(cart.totalPrice)}
                </div>
                <div className="text-lg font-bold tabular-nums text-primary">
                  {formatPrice(discountedPrice)}
                </div>
                <span className="text-[10px] font-medium text-primary">
                  -{selectedPromo!.discountPercent}% {selectedPromo!.bankDisplayName}
                </span>
              </>
            ) : (
              <>
                <div className={cn("text-lg font-bold tabular-nums", isBest || isPinned ? "text-primary" : "text-foreground")}>
                  {formatPrice(cart.totalPrice)}
                </div>
                {savingsPercent != null && savingsPercent !== 0 && (
                  <span className={cn(
                    "text-[11px] font-medium",
                    savingsPercent > 0 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400",
                  )}>
                    {savingsPercent > 0 ? `${savingsPercent}% menos` : `+${Math.abs(savingsPercent)}% vs prom.`}
                  </span>
                )}
              </>
            )}
          </div>

          {onToggleSave && (
            <SaveButton
              isSaved={isSaved ?? false}
              isPending={isSavePending ?? false}
              onToggle={onToggleSave}
              size="md"
            />
          )}
          <button
            type="button"
            onClick={() => { void handleShare(); }}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={shareLabel ?? "Compartir"}
          >
            {shareLabel ? (
              <span className="text-[10px] font-semibold text-primary leading-none whitespace-nowrap">{shareLabel}</span>
            ) : (
              <Share2 className="h-4 w-4" />
            )}
          </button>
          {/* Collapse toggle — top right */}
          <button
            type="button"
            onClick={() => setIsOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={isOpen ? "Ocultar productos" : "Ver productos"}
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")} />
          </button>
        </div>
      </div>

      {/* Bank promo banner */}
      {promos && promos.length > 0 && (
        <PromoBanner
          promos={promos}
          selectedPromoId={selectedPromoId}
          onSelectPromo={setSelectedPromoId}
        />
      )}

      {/* Product list (collapsible) */}
      {isOpen && (
        <div className="border-t border-border/30">
          {cart.products.map((product) => (
            <ProductRow
              key={product.searchTerm}
              product={product}
              onSwap={onSwapProduct ? (alt) => onSwapProduct(product.searchTerm, alt) : undefined}
              onFindAlternatives={onFindAlternatives ? (query) => onFindAlternatives(product.searchTerm, product.productName, query, cart.storeName) : undefined}
            />
          ))}

          {/* Price disclaimer */}
          <p className="px-4 pb-3 pt-2 text-[11px] text-muted-foreground/60">
            * Los precios pueden variar al momento de la compra.
          </p>
        </div>
      )}

      {/* Missing products disclaimer */}
      {cart.missingTerms.length > 0 && (
        <div className="mx-4 mb-3 flex items-start gap-2 rounded-xl bg-amber-100/60 px-3 py-2 dark:bg-amber-950/30">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-400" />
          <div>
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">No encontrado</p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              {cart.missingTerms.join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Savings footer */}
      {savingsAmount > 0 && isBest && (
        <div className="mx-4 mb-3 rounded-xl bg-green-100/60 px-3 py-2 dark:bg-green-950/40">
          <p className="text-xs font-medium text-green-800 dark:text-green-300">
            Ahorrás {formatPrice(savingsAmount)} comprando acá vs el promedio del mercado
          </p>
        </div>
      )}

      {/* Pin / copy row */}
      <div className="flex items-center gap-2 px-4 pb-3">
        {onPinStore && (
          <button
            type="button"
            onClick={() => onPinStore(cart.storeName)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              isPinned
                ? "bg-primary/10 text-primary"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Pin className="h-3 w-3" />
            {isPinned ? "Fijado" : "Elegir este super"}
          </button>
        )}
        <CopyListButton products={cart.products} storeName={cart.storeName} />
      </div>
    </div>
  );
}

// ============================================
// Product Row (simplified — no quantity controls, only ExternalLink)
// ============================================

interface ProductRowProps {
  product: AdjustedCartProduct;
  onSwap?: (alternative: AlternativeProduct) => void;
  onFindAlternatives?: (query: string) => Promise<AlternativeProduct[]>;
}

function ProductRow({ product, onSwap, onFindAlternatives }: ProductRowProps) {
  const hasDiscount = product.listPrice && product.listPrice > product.price;
  const [replaceQuery, setReplaceQuery] = useState("");
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);
  const [isReplaceHelperVisible, setIsReplaceHelperVisible] = useState(true);
  const [isSearchingReplace, setIsSearchingReplace] = useState(false);
  const [replaceAlternatives, setReplaceAlternatives] = useState<AlternativeProduct[]>([]);
  const suggestedQuery = buildSuggestedReplaceQuery(product);

  const runScopedSearch = useCallback(async (query: string) => {
    if (!onFindAlternatives || query.trim().length < 2) return;
    setIsSearchingReplace(true);
    try {
      const matches = await onFindAlternatives(query.trim());
      setReplaceAlternatives(matches);
    } finally {
      setIsSearchingReplace(false);
    }
  }, [onFindAlternatives]);

  // Cheapest alternative for inline suggestion
  const cheaperAlt = product.alternatives.length > 0
    ? product.alternatives.reduce<AlternativeProduct | null>((best, alt) => {
        if (alt.price < product.price && (!best || alt.price < best.price)) return alt;
        return best;
      }, null)
    : null;

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/30">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <ProductThumbnail imageUrl={product.imageUrl} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{product.productName}</p>
            {product.unitInfo && (
              <p className="text-[11px] text-muted-foreground">
                {formatUnitLabel(product.unitInfo)}
              </p>
            )}
          </div>
        </div>
        <div className="ml-2 flex shrink-0 items-center gap-2">
          <div className="text-right">
            {product.quantity > 1 && (
              <div className="text-[10px] text-muted-foreground">x{product.quantity}</div>
            )}
            <span className={cn(
              "tabular-nums",
              product.isCheapest
                ? "text-sm font-bold text-green-700 dark:text-green-400"
                : "text-sm font-semibold text-foreground",
            )}>
              {formatPrice(product.lineTotal)}
            </span>
            {hasDiscount && (
              <span className="ml-1 text-xs text-muted-foreground line-through">
                {formatPrice(product.listPrice! * product.quantity)}
              </span>
            )}
          </div>
          <a
            href={product.link}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Ver en el super"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Cheaper alternative inline suggestion */}
      {cheaperAlt && onSwap && (
        <button
          type="button"
          onClick={() => onSwap(cheaperAlt)}
          className="mx-4 mb-1 flex w-[calc(100%-2rem)] items-center gap-1.5 rounded-xl bg-green-100/60 px-2.5 py-1.5 text-left transition-colors hover:bg-green-100 dark:bg-green-950/30 dark:hover:bg-green-950/50"
        >
          <ArrowDownRight className="h-3 w-3 shrink-0 text-green-700 dark:text-green-400" />
          <span className="min-w-0 flex-1 truncate text-[11px] text-green-800 dark:text-green-400">
            {cheaperAlt.productName}
          </span>
          <span className="shrink-0 text-[11px] font-semibold text-green-700 dark:text-green-400">
            {formatPrice(cheaperAlt.price)}
          </span>
        </button>
      )}

      {/* Guided replace flow */}
      {onFindAlternatives && (
        <div className="mx-4 mb-1">
          {!isReplaceHelperVisible ? (
            <button
              type="button"
              onClick={() => setIsReplaceHelperVisible(true)}
              className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Mostrar ayuda para reemplazar producto
            </button>
          ) : (
            <div className="rounded-xl border border-dashed border-border/50 bg-muted/20 px-2.5 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">
                  No encontraste lo que buscabas?
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsReplaceOpen(false);
                    setIsReplaceHelperVisible(false);
                  }}
                  className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Ocultar
                </button>
              </div>
              <button
                type="button"
                onClick={async () => {
                  setIsReplaceOpen(true);
                  setReplaceQuery(suggestedQuery);
                  await runScopedSearch(suggestedQuery);
                }}
                className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/15"
              >
                Proba con: {suggestedQuery}
              </button>
            </div>
          )}
          {isReplaceOpen && isReplaceHelperVisible && (
            <div className="mt-1.5 rounded-xl border border-border/40 bg-muted/20 p-2">
              <div className="flex gap-1.5">
                <input
                  value={replaceQuery}
                  onChange={(event) => setReplaceQuery(event.target.value)}
                  placeholder={product.searchTerm}
                  className="h-8 w-full rounded-lg border border-border/40 bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                />
                <button
                  type="button"
                  disabled={isSearchingReplace || replaceQuery.trim().length < 2}
                  onClick={() => void runScopedSearch(replaceQuery)}
                  className="rounded-lg bg-primary px-2.5 text-[11px] font-medium text-primary-foreground disabled:opacity-50"
                >
                  Buscar
                </button>
              </div>
              {replaceAlternatives.length > 0 && (
                <div className="mt-2 space-y-1">
                  {replaceAlternatives.slice(0, 4).map((alternative) => (
                    <button
                      key={alternative.link}
                      type="button"
                      onClick={() => onSwap?.(alternative)}
                      className="flex w-full items-center justify-between rounded-lg bg-background px-2 py-1.5 text-left text-[11px] transition-colors hover:bg-primary/10"
                    >
                      <span className="truncate pr-2 text-muted-foreground">{alternative.productName}</span>
                      <span className="shrink-0 font-semibold">{formatPrice(alternative.price)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* More alternatives */}
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
                  <ExternalLink className="h-2.5 w-2.5 text-muted-foreground" />
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
    const lines = products.map((p) => `- ${p.quantity} x ${p.productName}`);
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
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
        isCopied
          ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {isCopied ? (
        <>
          <Check className="h-3 w-3" />
          Copiado
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
      <div className={cn("flex shrink-0 items-center justify-center rounded-xl bg-muted/40", sizeClass)}>
        <Package className={cn(iconClass, "text-muted-foreground")} />
      </div>
    );
  }

  return (
    <div className={cn("shrink-0 overflow-hidden rounded-xl bg-white", sizeClass)}>
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

// ============================================
// Promo Banner
// ============================================

import { scorePromo, parseDaysOfWeek, getTodayDayName } from "@/lib/promos/scoring";

function formatDaysShort(daysOfWeek: string): string {
  const days = parseDaysOfWeek(daysOfWeek);
  if (days.length === 0 || days.length === 7) return "Todos";
  const SHORT: Record<string, string> = {
    Lunes: "Lun", Martes: "Mar", Miércoles: "Mié",
    Jueves: "Jue", Viernes: "Vie", Sábado: "Sáb", Domingo: "Dom",
  };
  return days.map((d) => SHORT[d] ?? d).join(", ");
}

function formatCapShort(capAmount: number | null): string | null {
  if (!capAmount) return null;
  return `$${capAmount.toLocaleString("es-AR")}`;
}

function getBankBestPromos(promos: BankPromo[], todayName: string) {
  const bankMap = new Map<string, BankPromo>();
  for (const promo of promos) {
    const existing = bankMap.get(promo.bankSlug);
    if (!existing || scorePromo(promo, todayName) > scorePromo(existing, todayName)) {
      bankMap.set(promo.bankSlug, promo);
    }
  }
  return Array.from(bankMap.values()).sort(
    (a, b) => scorePromo(b, todayName) - scorePromo(a, todayName),
  );
}

interface PromoBannerProps {
  promos: BankPromo[];
  selectedPromoId: string | null;
  onSelectPromo: (promoId: string | null) => void;
}

function PromoBanner({ promos, selectedPromoId, onSelectPromo }: PromoBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const todayName = getTodayDayName();
  const bestPerBank = getBankBestPromos(promos, todayName);
  const best = bestPerBank[0]!;
  const extraPromos = promos.length - bestPerBank.length;

  const allSorted = [...promos].sort(
    (a, b) => scorePromo(b, todayName) - scorePromo(a, todayName),
  );
  const visiblePromos = isExpanded ? allSorted : bestPerBank;

  const selectedBank = selectedPromoId ? promos.find((p) => p.id === selectedPromoId) : null;

  const summaryText = selectedBank
    ? `${selectedBank.discountPercent}% ${selectedBank.bankDisplayName}`
    : bestPerBank.length === 1
      ? `${best.discountPercent}% ${best.bankDisplayName} (${formatDaysShort(best.daysOfWeek)})`
      : `Hasta ${best.discountPercent}% dto · ${bestPerBank.length} bancos`;

  return (
    <div className="mx-4 mb-1">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-xl px-3 py-2 text-left transition-all duration-200 active:scale-[0.98]",
          selectedPromoId
            ? "bg-primary/10 hover:bg-primary/15 dark:bg-primary/20 dark:hover:bg-primary/25"
            : "bg-muted/50 hover:bg-muted/70 dark:bg-muted/20 dark:hover:bg-muted/30",
        )}
      >
        <Tag className={cn("h-3 w-3 shrink-0", selectedPromoId ? "text-primary" : "text-muted-foreground")} />
        <span className={cn("flex-1 text-[11px] font-medium", selectedPromoId ? "text-primary" : "text-foreground")}>
          {summaryText}
        </span>
        <ChevronDown className={cn(
          "h-3 w-3 transition-transform duration-200",
          selectedPromoId ? "text-primary" : "text-muted-foreground",
          isExpanded && "rotate-180",
        )} />
      </button>

      {isExpanded && (
        <div className="mt-1 space-y-0.5 rounded-xl bg-muted/20 p-1.5 dark:bg-muted/10">
          {visiblePromos.map((promo) => {
            const isSelected = promo.id === selectedPromoId;
            const cap = formatCapShort(promo.capAmount);
            const paymentMethods = parseJsonArray(promo.paymentMethods);
            return (
              <button
                key={promo.id}
                type="button"
                onClick={() => onSelectPromo(isSelected ? null : promo.id)}
                className={cn(
                  "flex w-full items-center gap-1.5 rounded-xl px-2.5 py-2 text-left transition-all duration-200 active:scale-[0.98]",
                  isSelected
                    ? "bg-primary/10 ring-1.5 ring-primary/40 dark:bg-primary/15"
                    : "hover:bg-muted/50 dark:hover:bg-muted/20",
                )}
              >
                <span className={cn(
                  "rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
                )}>
                  {promo.discountPercent}%
                </span>
                <span className={cn(
                  "text-[11px] font-medium",
                  isSelected ? "text-primary" : "text-foreground",
                )}>
                  {promo.bankDisplayName}
                </span>
                {paymentMethods[0] && (
                  <span className="text-[10px] text-muted-foreground">· {paymentMethods[0]}</span>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {formatDaysShort(promo.daysOfWeek)}
                </span>
                {cap && (
                  <span className="text-[10px] text-muted-foreground">· tope {cap}</span>
                )}
                {isSelected && (
                  <Check className="ml-auto h-3 w-3 shrink-0 text-primary" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {!isExpanded && extraPromos > 0 && (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="mt-1 px-2.5 pb-1 text-[10px] text-primary underline-offset-2 hover:underline active:opacity-70"
        >
          +{extraPromos} promo{extraPromos !== 1 ? "s" : ""} más de estos bancos
        </button>
      )}
    </div>
  );
}
