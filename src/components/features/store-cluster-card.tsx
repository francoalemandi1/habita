"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Store, ChevronDown, ChevronUp, MapPin, Trophy } from "lucide-react";
import { CATEGORY_LABELS } from "@/lib/llm/core/shopping-plan/build-shopping-plan";

import type { GroceryCategory } from "@prisma/client";
import type {
  UnifiedStoreCluster,
  ProductPrice,
} from "@/lib/llm/core/shopping-plan/types";

// ============================================
// Unified store card
// ============================================

interface UnifiedStoreCardProps {
  store: UnifiedStoreCluster;
  rank: number;
}

export function UnifiedStoreCard({ store, rank }: UnifiedStoreCardProps) {
  return (
    <div className={cn(
      "rounded-xl border transition-colors",
      rank === 0 && "border-primary/30 bg-primary/[0.02]",
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            rank === 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}>
            <Store className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{store.storeName}</h3>
              {rank === 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  Mejor opcion
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {store.totalProductCount} producto{store.totalProductCount !== 1 ? "s" : ""}
              {" · "}
              {store.categoryCoverage} categoria{store.categoryCoverage !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-0.5">
          <span className="text-sm font-semibold">
            ${store.estimatedBasketCost.toLocaleString("es-AR")}
          </span>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {store.distanceKm !== null && (
              <span className="flex items-center gap-0.5">
                <MapPin className="h-2.5 w-2.5" />
                {store.distanceKm}km
              </span>
            )}
            {store.cheapestProductCount > 0 && (
              <span className="flex items-center gap-0.5">
                <Trophy className="h-2.5 w-2.5" />
                {store.cheapestProductCount} mejor precio
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Category groups */}
      <div className="border-t">
        {Object.entries(store.productsByCategory).map(([category, products]) => {
          if (!products || products.length === 0) return null;
          return (
            <CategoryGroup
              key={category}
              category={category as GroceryCategory}
              products={products}
            />
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// Category Group (collapsible)
// ============================================

interface CategoryGroupProps {
  category: GroceryCategory;
  products: ProductPrice[];
}

function CategoryGroup({ category, products }: CategoryGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const label = CATEGORY_LABELS[category];
  const visibleProducts = isExpanded
    ? products
    : products.slice(0, 2);
  const hasMore = products.length > 2;

  return (
    <div className="border-b last:border-b-0">
      {/* Category header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-2 transition-colors hover:bg-muted/30"
      >
        <span className="text-xs font-medium text-muted-foreground">
          {label} ({products.length})
        </span>
        {hasMore && (
          isExpanded
            ? <ChevronUp className="h-3 w-3 text-muted-foreground" />
            : <ChevronDown className="h-3 w-3 text-muted-foreground" />
        )}
      </button>

      {/* Products */}
      {visibleProducts.map((product, idx) => (
        <ProductRow key={`${product.catalogProductName}-${idx}`} product={product} />
      ))}

      {!isExpanded && hasMore && (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="w-full px-4 py-1.5 text-left text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          + {products.length - 2} mas
        </button>
      )}
    </div>
  );
}

// ============================================
// Product Row
// ============================================

function ProductRow({ product }: { product: ProductPrice }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-muted/20">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{product.catalogProductName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {product.brand} · {product.productDescription}
        </p>
      </div>
      <span className="ml-2 shrink-0 text-sm font-semibold text-primary">
        ${product.price.toLocaleString("es-AR")}
      </span>
    </div>
  );
}
