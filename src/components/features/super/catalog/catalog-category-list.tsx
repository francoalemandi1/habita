import { ChevronDown, ChevronUp, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "./category-config";

import type { GroceryCategory } from "@prisma/client";
import type { ProductCatalogItem } from "@/hooks/use-product-selection";

interface CatalogCategoryListProps {
  isLoading: boolean;
  filteredByCategory: Map<GroceryCategory, ProductCatalogItem[]>;
  expandedCategories: Set<GroceryCategory>;
  onToggleExpanded: (category: GroceryCategory) => void;
  selectedSet: Set<string>;
  onAddTerm: (term: string) => void;
  onRemoveTerm: (term: string) => void;
}

export function CatalogCategoryList({
  isLoading,
  filteredByCategory,
  expandedCategories,
  onToggleExpanded,
  selectedSet,
  onAddTerm,
  onRemoveTerm,
}: CatalogCategoryListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-ink-2" />
      </div>
    );
  }

  return (
    <>
      {CATEGORY_ORDER.map((category) => {
        const products = filteredByCategory.get(category);
        if (!products) return null;

        const isExpanded = expandedCategories.has(category);

        return (
          <div key={category} className="rounded-lg border border-line">
            <button
              type="button"
              onClick={() => onToggleExpanded(category)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-monte"
            >
              <span className="flex-1 text-sm font-medium">
                {CATEGORY_LABELS[category]}
              </span>
              <span className="text-xs text-ink-2">{products.length}</span>
              {isExpanded ? (
                <ChevronUp aria-hidden="true" className="h-4 w-4 text-ink-2" />
              ) : (
                <ChevronDown aria-hidden="true" className="h-4 w-4 text-ink-2" />
              )}
            </button>

            {isExpanded && (
              <div className="border-t border-line-soft px-3 py-1.5">
                {products.map((product) => {
                  const isAdded = selectedSet.has(product.name.toLowerCase());
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        if (isAdded) {
                          onRemoveTerm(product.name);
                        } else {
                          onAddTerm(product.name);
                        }
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-1 py-1.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-monte",
                        isAdded ? "bg-monte/5 text-monte" : "hover:bg-sand/50",
                      )}
                    >
                      <span className="text-sm">{product.name}</span>
                      {isAdded && <Check aria-hidden="true" className="h-3.5 w-3.5 text-monte" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
