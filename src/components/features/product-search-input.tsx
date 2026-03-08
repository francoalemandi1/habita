"use client";

import { useState, useCallback, useRef, useMemo, useEffect, useLayoutEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Plus, Minus } from "lucide-react";

import type { SearchItem } from "@/lib/supermarket-search";
import type { GroceryCategory } from "@prisma/client";

// ============================================
// Types
// ============================================

interface AutocompleteProduct {
  id: string;
  name: string;
  category: string;
  isEssential: boolean;
}

interface ProductSearchInputProps {
  searchItems: SearchItem[];
  onAdd: (term: string) => void;
  onRemove: (term: string) => void;
  onSetQuantity: (term: string, quantity: number) => void;
  disabled?: boolean;
  products?: AutocompleteProduct[];
  collapsible?: boolean;
}

// ============================================
// Constants
// ============================================

const CATEGORY_LABELS: Record<GroceryCategory, string> = {
  ALMACEN: "Almacén",
  FRUTAS_VERDURAS: "Frutas y verduras",
  CARNES: "Carnes",
  LACTEOS: "Lácteos",
  PANADERIA_DULCES: "Panadería",
  BEBIDAS: "Bebidas",
  LIMPIEZA: "Limpieza",
  PERFUMERIA: "Perfumería",
};

const MAX_SUGGESTIONS = 6;
const MIN_CHARS_FOR_AUTOCOMPLETE = 2;
const BLUR_DELAY_MS = 150;

export function normalizeProductTerm(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// ============================================
// Component
// ============================================

export function ProductSearchInput({
  searchItems,
  onAdd,
  onRemove,
  onSetQuantity,
  disabled,
  products,
  collapsible,
}: ProductSearchInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [pendingDeleteTerm, setPendingDeleteTerm] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Collapsible chip list
  const chipsContainerRef = useRef<HTMLDivElement>(null);
  const [isChipsExpanded, setIsChipsExpanded] = useState(false);
  const [needsCollapse, setNeedsCollapse] = useState(false);
  const [hiddenChipCount, setHiddenChipCount] = useState(0);
  const [chipRowHeight, setChipRowHeight] = useState(28);

  const itemsKey = searchItems.map((i) => i.term).join(",");
  useEffect(() => { setIsChipsExpanded(false); }, [itemsKey]);

  useLayoutEffect(() => {
    if (!collapsible || !chipsContainerRef.current || searchItems.length === 0) {
      setNeedsCollapse(false);
      setHiddenChipCount(0);
      return;
    }
    const container = chipsContainerRef.current;
    const chips = Array.from(container.querySelectorAll("[data-chip]")) as HTMLElement[];
    if (chips.length === 0) return;
    const firstChip = chips[0]!;
    const rh = firstChip.offsetHeight;
    setChipRowHeight(rh);
    const gap = 8;
    const row3Top = (rh + gap) * 2;
    const hidden = chips.filter((c) => c.offsetTop >= row3Top - 2).length;
    setNeedsCollapse(hidden > 0);
    setHiddenChipCount(hidden);
  }, [searchItems, collapsible]);

  const suggestions = useMemo(() => {
    if (!products || inputValue.trim().length < MIN_CHARS_FOR_AUTOCOMPLETE) {
      return [];
    }

    const normalizedInput = normalizeProductTerm(inputValue);
    const alreadyAdded = new Set(
      searchItems.map((item) => normalizeProductTerm(item.term)),
    );

    return products
      .filter((product) => {
        const normalizedName = normalizeProductTerm(product.name);
        if (alreadyAdded.has(normalizedName)) return false;
        return normalizedName.includes(normalizedInput);
      })
      .slice(0, MAX_SUGGESTIONS);
  }, [products, inputValue, searchItems]);

  const showDropdown = isDropdownOpen && suggestions.length > 0;

  // Cleanup blur timeout on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  const selectSuggestion = useCallback(
    (productName: string) => {
      const normalized = normalizeProductTerm(productName);
      const isDuplicate = searchItems.some(
        (item) => normalizeProductTerm(item.term) === normalized,
      );
      if (!isDuplicate) {
        onAdd(productName);
      }
      setInputValue("");
      setIsDropdownOpen(false);
      setHighlightedIndex(-1);
      inputRef.current?.focus();
    },
    [searchItems, onAdd],
  );

  const addTerm = useCallback(() => {
    const trimmed = inputValue.trim();
    if (trimmed.length === 0) return;

    // Avoid duplicates (case-insensitive)
    const normalized = normalizeProductTerm(trimmed);
    const isDuplicate = searchItems.some(
      (item) => normalizeProductTerm(item.term) === normalized,
    );
    if (isDuplicate) {
      setInputValue("");
      setIsDropdownOpen(false);
      return;
    }

    onAdd(trimmed);
    setInputValue("");
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  }, [inputValue, searchItems, onAdd]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape" && showDropdown) {
        e.preventDefault();
        setIsDropdownOpen(false);
        setHighlightedIndex(-1);
        return;
      }

      if (showDropdown && e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0,
        );
        return;
      }

      if (showDropdown && e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1,
        );
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        const highlighted = suggestions[highlightedIndex];
        if (showDropdown && highlighted) {
          selectSuggestion(highlighted.name);
        } else {
          addTerm();
        }
        return;
      }

      // Backspace on empty input: first press marks last chip, second press removes it
      if (e.key === "Backspace" && inputValue === "" && searchItems.length > 0) {
        const lastItem = searchItems[searchItems.length - 1];
        if (!lastItem) return;
        if (pendingDeleteTerm === lastItem.term) {
          onRemove(lastItem.term);
          setPendingDeleteTerm(null);
        } else {
          setPendingDeleteTerm(lastItem.term);
        }
        return;
      }

      // Any other key clears the pending delete mark
      if (pendingDeleteTerm) {
        setPendingDeleteTerm(null);
      }
    },
    [addTerm, inputValue, searchItems, onRemove, showDropdown, suggestions, highlightedIndex, selectSuggestion, pendingDeleteTerm],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPendingDeleteTerm(null);
      setInputValue(e.target.value);
      setIsDropdownOpen(true);
      setHighlightedIndex(-1);
    },
    [],
  );

  const handleInputFocus = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setIsDropdownOpen(true);
  }, []);

  const handleInputBlur = useCallback(() => {
    blurTimeoutRef.current = setTimeout(() => {
      setIsDropdownOpen(false);
      setHighlightedIndex(-1);
    }, BLUR_DELAY_MS);
  }, []);

  const getCategoryLabel = useCallback((category: string): string => {
    return CATEGORY_LABELS[category as GroceryCategory] ?? category;
  }, []);

  return (
    <div className="space-y-3">
      {/* Input row */}
      <div className="flex gap-2.5">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder="Agrega un producto..."
            disabled={disabled}
            maxLength={100}
            className="flex h-11 w-full rounded-xl border border-border/40 bg-card px-3.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
            role="combobox"
            aria-expanded={showDropdown}
            aria-autocomplete="list"
            aria-controls={showDropdown ? "product-autocomplete-list" : undefined}
            aria-activedescendant={
              showDropdown && highlightedIndex >= 0
                ? `product-suggestion-${highlightedIndex}`
                : undefined
            }
          />

          {/* Autocomplete dropdown */}
          {showDropdown && (
            <ul
              id="product-autocomplete-list"
              role="listbox"
              className="absolute z-10 top-full left-0 right-0 mt-1 bg-card border border-border/40 rounded-xl shadow-lg max-h-60 overflow-y-auto"
            >
              {suggestions.map((product, index) => (
                <li
                  key={product.id}
                  id={`product-suggestion-${index}`}
                  role="option"
                  aria-selected={index === highlightedIndex}
                  className={`px-3.5 py-2.5 flex justify-between items-center text-sm cursor-pointer ${
                    index === highlightedIndex
                      ? "bg-muted/50"
                      : "hover:bg-muted/50"
                  }`}
                  onMouseDown={(e) => {
                    // Prevent blur from firing before click registers
                    e.preventDefault();
                  }}
                  onClick={() => selectSuggestion(product.name)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <span className="text-sm text-foreground">{product.name}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {getCategoryLabel(product.category)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addTerm}
          disabled={disabled || inputValue.trim().length === 0}
          className="h-11 shrink-0 rounded-xl px-3"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Chips */}
      {searchItems.length > 0 && (
        <div>
          <div
            ref={chipsContainerRef}
            className="flex flex-wrap gap-2"
            style={
              collapsible && !isChipsExpanded && needsCollapse
                ? { maxHeight: `${chipRowHeight * 2 + 8}px`, overflow: "hidden" }
                : undefined
            }
          >
            {searchItems.map((item) => (
              <span
                key={item.term}
                data-chip
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  pendingDeleteTerm === item.term
                    ? "bg-destructive/15 text-destructive ring-1 ring-destructive/40"
                    : "bg-primary/10 text-primary"
                }`}
              >
                <span>{item.term}</span>
                <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold">
                  x{item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onSetQuantity(item.term, Math.max(1, item.quantity - 1))}
                  disabled={disabled || item.quantity <= 1}
                  className="rounded-full p-0.5 transition-colors hover:bg-primary/20 active:scale-[0.95] disabled:opacity-40"
                  aria-label={`Disminuir cantidad de ${item.term}`}
                >
                  <Minus className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onSetQuantity(item.term, item.quantity + 1)}
                  disabled={disabled}
                  className="rounded-full p-0.5 transition-colors hover:bg-primary/20 active:scale-[0.95] disabled:opacity-40"
                  aria-label={`Aumentar cantidad de ${item.term}`}
                >
                  <Plus className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(item.term)}
                  disabled={disabled}
                  className="rounded-full p-0.5 transition-colors hover:bg-primary/20 active:scale-[0.95] disabled:opacity-50"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          {collapsible && needsCollapse && !isChipsExpanded && (
            <button
              type="button"
              onClick={() => setIsChipsExpanded(true)}
              className="mt-1.5 flex items-center gap-1 text-xs font-medium text-primary hover:opacity-80"
            >
              <Plus className="h-3 w-3" />
              {hiddenChipCount} producto{hiddenChipCount !== 1 ? "s" : ""} más
            </button>
          )}
        </div>
      )}
    </div>
  );
}
