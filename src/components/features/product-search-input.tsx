"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Plus, Minus } from "lucide-react";

import type { SearchItem } from "@/lib/supermarket-search";

// ============================================
// Types
// ============================================

interface ProductSearchInputProps {
  searchItems: SearchItem[];
  onAdd: (term: string) => void;
  onRemove: (term: string) => void;
  onSetQuantity: (term: string, quantity: number) => void;
  disabled?: boolean;
}

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
}: ProductSearchInputProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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
      return;
    }

    onAdd(trimmed);
    setInputValue("");
    inputRef.current?.focus();
  }, [inputValue, searchItems, onAdd]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addTerm();
      }
      // Backspace on empty input removes last chip
      if (e.key === "Backspace" && inputValue === "" && searchItems.length > 0) {
        const lastItem = searchItems[searchItems.length - 1];
        if (lastItem) onRemove(lastItem.term);
      }
    },
    [addTerm, inputValue, searchItems, onRemove],
  );

  return (
    <div className="space-y-3">
      {/* Input row */}
      <div className="flex gap-2.5">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Agrega un producto..."
          disabled={disabled}
          maxLength={100}
          className="flex h-11 flex-1 rounded-xl border border-border/40 bg-card px-3.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
        />
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
        <div className="flex flex-wrap gap-2">
          {searchItems.map((item) => (
            <span
              key={item.term}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary"
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
      )}
    </div>
  );
}
