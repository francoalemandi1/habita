import { X } from "lucide-react";

interface CatalogPendingChipsProps {
  pendingTerms: string[];
  onRemoveTerm: (term: string) => void;
}

export function CatalogPendingChips({ pendingTerms, onRemoveTerm }: CatalogPendingChipsProps) {
  if (pendingTerms.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {pendingTerms.map((term) => (
        <span
          key={term}
          className="inline-flex items-center gap-1 rounded-full bg-monte/10 px-2 py-1 text-[11px] font-medium text-monte"
        >
          {term}
          <button
            type="button"
            onClick={() => onRemoveTerm(term)}
            className="rounded-full p-0.5 outline-none transition-colors hover:bg-monte/20 focus-visible:ring-2 focus-visible:ring-monte"
            aria-label={`Quitar ${term}`}
          >
            <X aria-hidden="true" className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
}
