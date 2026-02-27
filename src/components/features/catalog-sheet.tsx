"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useProductSelection } from "@/hooks/use-product-selection";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Search, X, ChevronDown, ChevronUp, Loader2, Check } from "lucide-react";

import type { GroceryCategory } from "@prisma/client";
import type { ProductCatalogItem } from "@/hooks/use-product-selection";

// ============================================
// Category config
// ============================================

const CATEGORY_LABELS: Record<GroceryCategory, string> = {
  ALMACEN: "Almacen",
  PANADERIA_DULCES: "Panaderia y Dulces",
  LACTEOS: "Lacteos",
  CARNES: "Carnes",
  FRUTAS_VERDURAS: "Frutas y Verduras",
  BEBIDAS: "Bebidas",
  LIMPIEZA: "Limpieza",
  PERFUMERIA: "Perfumeria",
};

const CATEGORY_ORDER: GroceryCategory[] = [
  "ALMACEN",
  "PANADERIA_DULCES",
  "LACTEOS",
  "CARNES",
  "FRUTAS_VERDURAS",
  "BEBIDAS",
  "LIMPIEZA",
  "PERFUMERIA",
];

// ============================================
// Props
// ============================================

interface CatalogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Currently selected search terms (to show as "already added") */
  selectedTerms: string[];
  /** Called when the user taps a product to add it */
  onAddTerm: (term: string) => void;
  /** Open pre-filtered to a specific category */
  initialCategory?: GroceryCategory | null;
}

// ============================================
// Component
// ============================================

export function CatalogSheet({
  open,
  onOpenChange,
  selectedTerms,
  onAddTerm,
  initialCategory,
}: CatalogSheetProps) {
  const { data, isLoading } = useProductSelection();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<GroceryCategory>>(
    new Set(CATEGORY_ORDER),
  );

  // Reset search when dialog closes
  if (!open && searchQuery) {
    setSearchQuery("");
  }

  // When opening with a category filter, collapse all others
  useEffect(() => {
    if (open && initialCategory) {
      setExpandedCategories(new Set([initialCategory]));
    } else if (open && !initialCategory) {
      setExpandedCategories(new Set(CATEGORY_ORDER));
    }
  }, [open, initialCategory]);

  const selectedSet = useMemo(
    () => new Set(selectedTerms.map((t) => t.toLowerCase())),
    [selectedTerms],
  );

  // Group & filter products
  const filteredByCategory = useMemo(() => {
    if (!data) return new Map<GroceryCategory, ProductCatalogItem[]>();

    const query = searchQuery.toLowerCase().trim();
    const result = new Map<GroceryCategory, ProductCatalogItem[]>();

    for (const category of CATEGORY_ORDER) {
      const products = data.products.filter((p) => p.category === category);
      const filtered = query
        ? products.filter((p) => p.name.toLowerCase().includes(query))
        : products;
      if (filtered.length > 0) {
        result.set(category, filtered);
      }
    }
    return result;
  }, [data, searchQuery]);

  const toggleExpanded = useCallback((category: GroceryCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Catalogo de productos</DialogTitle>
          <DialogDescription>
            Toca un producto para agregarlo a tu busqueda.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg border bg-background pl-9 pr-8 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Category list */}
        <div className="-mx-6 flex-1 space-y-1 overflow-y-auto px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            CATEGORY_ORDER.map((category) => {
              const products = filteredByCategory.get(category);
              if (!products) return null;

              const isExpanded = expandedCategories.has(category);

              return (
                <div key={category} className="rounded-lg border">
                  {/* Category header */}
                  <button
                    type="button"
                    onClick={() => toggleExpanded(category)}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
                  >
                    <span className="flex-1 text-sm font-medium">
                      {CATEGORY_LABELS[category]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {products.length}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>

                  {/* Products */}
                  {isExpanded && (
                    <div className="border-t px-3 py-1.5">
                      {products.map((product) => {
                        const isAdded = selectedSet.has(product.name.toLowerCase());
                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => {
                              if (!isAdded) onAddTerm(product.name);
                            }}
                            disabled={isAdded}
                            className={cn(
                              "flex w-full items-center justify-between rounded-md px-1 py-1.5 text-left transition-colors",
                              isAdded
                                ? "opacity-50"
                                : "hover:bg-muted/50",
                            )}
                          >
                            <span className="text-sm">{product.name}</span>
                            {isAdded && (
                              <Check className="h-3.5 w-3.5 text-primary" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
