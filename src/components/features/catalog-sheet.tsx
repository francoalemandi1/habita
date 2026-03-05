"use client";

import { useState, useMemo, useCallback } from "react";
import { useProductSelection } from "@/hooks/use-product-selection";
import { normalizeProductTerm } from "@/components/features/product-search-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Search, X, ChevronDown, ChevronUp, Loader2, Check, Plus } from "lucide-react";

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
  /** Called when the user confirms current modal selection */
  onConfirmTerms: (terms: string[]) => void;
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
  onConfirmTerms,
  initialCategory,
}: CatalogSheetProps) {
  const { data, isLoading } = useProductSelection();
  const [searchQuery, setSearchQuery] = useState("");
  const [customTerm, setCustomTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<GroceryCategory>>(
    new Set(CATEGORY_ORDER),
  );
  const [pendingTerms, setPendingTerms] = useState<string[]>([]);

  // Track previous prop values to reset when dialog opens/closes
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevSelectedTerms, setPrevSelectedTerms] = useState(selectedTerms);
  const [prevInitialCategory, setPrevInitialCategory] = useState(initialCategory);

  if (prevOpen !== open) {
    setPrevOpen(open);
    setPrevSelectedTerms(selectedTerms);
    setPrevInitialCategory(initialCategory);
    if (!open) {
      setSearchQuery("");
      setCustomTerm("");
    } else {
      setPendingTerms(selectedTerms);
      if (initialCategory) {
        setExpandedCategories(new Set([initialCategory]));
      } else {
        setExpandedCategories(new Set(CATEGORY_ORDER));
      }
    }
  } else if (open) {
    // Sync pendingTerms if selectedTerms changed while open
    if (prevSelectedTerms !== selectedTerms) {
      setPrevSelectedTerms(selectedTerms);
      setPendingTerms(selectedTerms);
    }
    // Sync expandedCategories if initialCategory changed while open
    if (prevInitialCategory !== initialCategory) {
      setPrevInitialCategory(initialCategory);
      if (initialCategory) {
        setExpandedCategories(new Set([initialCategory]));
      } else {
        setExpandedCategories(new Set(CATEGORY_ORDER));
      }
    }
  }

  const selectedSet = useMemo(() => {
    return new Set(pendingTerms.map((term) => normalizeProductTerm(term)));
  }, [pendingTerms]);

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

  const addPendingTerm = useCallback((term: string) => {
    const trimmed = term.trim();
    if (trimmed.length < 2) return;
    setPendingTerms((prev) => {
      const normalized = normalizeProductTerm(trimmed);
      if (prev.some((item) => normalizeProductTerm(item) === normalized)) return prev;
      return [...prev, trimmed];
    });
  }, []);

  const removePendingTerm = useCallback((term: string) => {
    const normalized = normalizeProductTerm(term);
    setPendingTerms((prev) => prev.filter((item) => normalizeProductTerm(item) !== normalized));
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Catalogo de productos</DialogTitle>
          <DialogDescription>
            Seleccioná productos y confirmá para agregarlos a tu búsqueda.
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

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Producto personalizado..."
            value={customTerm}
            onChange={(event) => setCustomTerm(event.target.value)}
            maxLength={100}
            className="h-9 w-full rounded-lg border bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              addPendingTerm(customTerm);
              setCustomTerm("");
            }}
            disabled={customTerm.trim().length < 2}
            className="h-9 gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar
          </Button>
        </div>

        {pendingTerms.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {pendingTerms.map((term) => (
              <span
                key={term}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary"
              >
                {term}
                <button
                  type="button"
                  onClick={() => removePendingTerm(term)}
                  className="rounded-full p-0.5 transition-colors hover:bg-primary/20"
                  aria-label={`Quitar ${term}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

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
                              if (isAdded) {
                                removePendingTerm(product.name);
                              } else {
                                addPendingTerm(product.name);
                              }
                            }}
                            className={cn(
                              "flex w-full items-center justify-between rounded-md px-1 py-1.5 text-left transition-colors",
                              isAdded
                                ? "bg-primary/5 text-primary"
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

        <div className="flex items-center justify-end gap-2 border-t pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onConfirmTerms(pendingTerms);
              onOpenChange(false);
            }}
          >
            Confirmar productos
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
