import { Search, X, Plus } from "lucide-react";
import { Button } from "@/components/ds/button";

interface CatalogSearchControlsProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  customTerm: string;
  onCustomTermChange: (value: string) => void;
  onAddCustomTerm: () => void;
}

export function CatalogSearchControls({
  searchQuery,
  onSearchQueryChange,
  customTerm,
  onCustomTermChange,
  onAddCustomTerm,
}: CatalogSearchControlsProps) {
  return (
    <>
      <div className="relative">
        <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2" />
        <input
          type="text"
          placeholder="Buscar producto…"
          aria-label="Buscar producto"
          autoFocus
          autoComplete="off"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="h-9 w-full rounded-lg border border-line bg-surface pl-9 pr-8 text-sm placeholder:text-ink-3 outline-none focus-visible:ring-2 focus-visible:ring-monte"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchQueryChange("")}
            aria-label="Limpiar búsqueda"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-ink-2 outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-monte"
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Producto personalizado..."
          value={customTerm}
          onChange={(event) => onCustomTermChange(event.target.value)}
          maxLength={100}
          className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm placeholder:text-ink-3 outline-none focus-visible:ring-2 focus-visible:ring-monte"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onAddCustomTerm}
          disabled={customTerm.trim().length < 2}
          className="h-9 gap-1.5"
        >
          <Plus aria-hidden="true" className="h-3.5 w-3.5" />
          Agregar
        </Button>
      </div>
    </>
  );
}
