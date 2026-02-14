"use client";

import { useState, useMemo, useCallback } from "react";
import {
  useProductSelection,
  useSaveProductExclusions,
} from "@/hooks/use-product-selection";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { Search, X, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

import type { GroceryCategory } from "@prisma/client";
import type { ProductCatalogItem } from "@/hooks/use-product-selection";

// ============================================
// Category labels
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

interface ProductSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after save succeeds — parent can trigger search */
  onSaved?: () => void;
  /** Label for the save button (default: "Guardar") */
  saveLabel?: string;
}

// ============================================
// Helpers
// ============================================

/**
 * Build the initial exclusion set when the dialog opens.
 * - If the user already has saved exclusions → use those
 * - If no exclusions exist (first time) → exclude non-essential products
 */
function buildInitialExclusions(
  products: ProductCatalogItem[],
  savedExclusions: string[],
): Set<string> {
  // User has customized before — respect their saved exclusions
  if (savedExclusions.length > 0) {
    return new Set(savedExclusions);
  }

  // First time — default to essentials only
  const nonEssentials = products
    .filter((p) => !p.isEssential)
    .map((p) => p.name);
  return new Set(nonEssentials);
}

// ============================================
// Component
// ============================================

export function ProductSelectorDialog({
  open,
  onOpenChange,
  onSaved,
  saveLabel = "Guardar",
}: ProductSelectorDialogProps) {
  const { data, isLoading } = useProductSelection();
  const saveExclusions = useSaveProductExclusions();
  const toast = useToast();

  const [localExclusions, setLocalExclusions] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<GroceryCategory>>(new Set());
  const [initialized, setInitialized] = useState(false);

  // Initialize local state from server data when dialog opens
  if (open && data && !initialized) {
    setLocalExclusions(
      buildInitialExclusions(data.products, data.excludedProductNames),
    );
    setInitialized(true);
  }

  // Reset when dialog closes
  if (!open && initialized) {
    setInitialized(false);
    setSearchQuery("");
    setExpandedCategories(new Set());
  }

  // Group products by category
  const productsByCategory = useMemo(() => {
    if (!data) return new Map<GroceryCategory, ProductCatalogItem[]>();

    const map = new Map<GroceryCategory, ProductCatalogItem[]>();
    for (const product of data.products) {
      const existing = map.get(product.category) ?? [];
      existing.push(product);
      map.set(product.category, existing);
    }
    return map;
  }, [data]);

  // Filter products by search query
  const filteredByCategory = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const result = new Map<GroceryCategory, ProductCatalogItem[]>();

    for (const category of CATEGORY_ORDER) {
      const products = productsByCategory.get(category) ?? [];
      const filtered = query
        ? products.filter((p) => p.name.toLowerCase().includes(query))
        : products;
      if (filtered.length > 0) {
        result.set(category, filtered);
      }
    }
    return result;
  }, [productsByCategory, searchQuery]);

  const totalProducts = data?.products.length ?? 0;
  const selectedCount = totalProducts - localExclusions.size;

  const toggleProduct = useCallback((productName: string) => {
    setLocalExclusions((prev) => {
      const next = new Set(prev);
      if (next.has(productName)) {
        next.delete(productName);
      } else {
        next.add(productName);
      }
      return next;
    });
  }, []);

  const toggleCategory = useCallback(
    (category: GroceryCategory) => {
      const products = productsByCategory.get(category) ?? [];

      setLocalExclusions((prev) => {
        const allSelected = products.every((p) => !prev.has(p.name));
        const next = new Set(prev);
        if (allSelected) {
          for (const product of products) {
            next.add(product.name);
          }
        } else {
          for (const product of products) {
            next.delete(product.name);
          }
        }
        return next;
      });
    },
    [productsByCategory],
  );

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

  const handleSave = useCallback(() => {
    saveExclusions.mutate(Array.from(localExclusions), {
      onSuccess: () => {
        toast.success("Guardado", "Tu seleccion de productos fue actualizada");
        onOpenChange(false);
        onSaved?.();
      },
      onError: () => {
        toast.error("Error", "No se pudo guardar la seleccion");
      },
    });
  }, [localExclusions, saveExclusions, toast, onOpenChange, onSaved]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-lg flex flex-col">
        <DialogHeader>
          <DialogTitle>Personalizar productos</DialogTitle>
          <DialogDescription>
            Selecciona los productos que queres buscar en tu plan de compras.
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
        <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            CATEGORY_ORDER.map((category) => {
              const products = filteredByCategory.get(category);
              if (!products) return null;

              const allProducts = productsByCategory.get(category) ?? [];
              const selectedInCategory = allProducts.filter(
                (p) => !localExclusions.has(p.name),
              ).length;
              const isExpanded = expandedCategories.has(category);
              const allSelected = selectedInCategory === allProducts.length;
              const someSelected = selectedInCategory > 0 && !allSelected;

              return (
                <div key={category} className="rounded-lg border">
                  {/* Category header */}
                  <div className="flex w-full items-center gap-2 px-3 py-2.5">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={() => toggleCategory(category)}
                      className={cn(
                        "shrink-0",
                        someSelected && "border-primary bg-primary/30",
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => toggleExpanded(category)}
                      className="flex flex-1 items-center gap-2 text-left"
                    >
                      <span className="flex-1 text-sm font-medium">
                        {CATEGORY_LABELS[category]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {selectedInCategory}/{allProducts.length}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>

                  {/* Products */}
                  {isExpanded && (
                    <div className="border-t px-3 py-1.5">
                      {products.map((product) => (
                        <label
                          key={product.id}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={!localExclusions.has(product.name)}
                            onCheckedChange={() => toggleProduct(product.name)}
                          />
                          <span className="text-sm">{product.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="flex-row items-center justify-between gap-2 border-t pt-3 sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {selectedCount} de {totalProducts} productos
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveExclusions.isPending}
            >
              {saveExclusions.isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : null}
              {saveLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
