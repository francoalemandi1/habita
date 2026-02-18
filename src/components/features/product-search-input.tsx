"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";

// ============================================
// Types
// ============================================

interface ProductSearchInputProps {
  searchTerms: string[];
  onAdd: (term: string) => void;
  onRemove: (term: string) => void;
  disabled?: boolean;
}

// ============================================
// Component
// ============================================

export function ProductSearchInput({
  searchTerms,
  onAdd,
  onRemove,
  disabled,
}: ProductSearchInputProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addTerm = useCallback(() => {
    const trimmed = inputValue.trim();
    if (trimmed.length === 0) return;

    // Avoid duplicates (case-insensitive)
    const isDuplicate = searchTerms.some(
      (t) => t.toLowerCase() === trimmed.toLowerCase(),
    );
    if (isDuplicate) {
      setInputValue("");
      return;
    }

    onAdd(trimmed);
    setInputValue("");
    inputRef.current?.focus();
  }, [inputValue, searchTerms, onAdd]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addTerm();
      }
      // Backspace on empty input removes last chip
      if (e.key === "Backspace" && inputValue === "" && searchTerms.length > 0) {
        const lastTerm = searchTerms[searchTerms.length - 1];
        if (lastTerm) onRemove(lastTerm);
      }
    },
    [addTerm, inputValue, searchTerms, onRemove],
  );

  return (
    <div className="space-y-3">
      {/* Input row */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Agrega un producto..."
          disabled={disabled}
          maxLength={100}
          className="flex h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addTerm}
          disabled={disabled || inputValue.trim().length === 0}
          className="h-10 shrink-0 px-3"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Chips */}
      {searchTerms.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {searchTerms.map((term) => (
            <span
              key={term}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
            >
              {term}
              <button
                type="button"
                onClick={() => onRemove(term)}
                disabled={disabled}
                className="rounded-full p-0.5 transition-colors hover:bg-primary/20 disabled:opacity-50"
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
