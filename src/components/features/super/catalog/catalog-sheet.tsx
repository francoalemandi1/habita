"use client";

import { useState, useMemo, useCallback } from "react";
import { useProductSelection } from "@/hooks/use-product-selection";
import { normalizeProductTerm } from "@habita/prices";
import { Sheet } from "@/components/ds/sheet";
import { Button } from "@/components/ds/button";
import { CATEGORY_ORDER } from "./category-config";
import { CatalogSearchControls } from "./catalog-search-controls";
import { CatalogPendingChips } from "./catalog-pending-chips";
import { CatalogCategoryList } from "./catalog-category-list";

import type { GroceryCategory } from "@prisma/client";
import type { ProductCatalogItem } from "@/hooks/use-product-selection";

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
    <Sheet open={open} onOpenChange={onOpenChange} title="Catálogo de productos" className="flex max-h-[85vh] flex-col overflow-hidden">
      <div className="flex flex-1 flex-col gap-3 overflow-hidden">
        <p className="text-sm text-ink-2">
          Seleccioná productos y confirmá para agregarlos a tu búsqueda.
        </p>

        <CatalogSearchControls
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          customTerm={customTerm}
          onCustomTermChange={setCustomTerm}
          onAddCustomTerm={() => {
            addPendingTerm(customTerm);
            setCustomTerm("");
          }}
        />

        <CatalogPendingChips pendingTerms={pendingTerms} onRemoveTerm={removePendingTerm} />

        <div className="-mx-6 flex-1 space-y-1 overflow-y-auto px-6">
          <CatalogCategoryList
            isLoading={isLoading}
            filteredByCategory={filteredByCategory}
            expandedCategories={expandedCategories}
            onToggleExpanded={toggleExpanded}
            selectedSet={selectedSet}
            onAddTerm={addPendingTerm}
            onRemoveTerm={removePendingTerm}
          />
        </div>

        <div className="border-t border-line pt-3">
          <Button
            type="button"
            className="w-full"
            onClick={() => {
              onConfirmTerms(pendingTerms);
              onOpenChange(false);
            }}
          >
            Confirmar productos
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
