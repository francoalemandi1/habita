import { ExternalLink, SearchX } from "lucide-react";
import { groupNotFoundSuggestions } from "@habita/domain";
import { StoreChip } from "@/components/ds/store-chip";

import type { NotFoundSuggestion } from "@/lib/supermarket-search";

interface NotFoundRowProps {
  notFound: string[];
  suggestions: NotFoundSuggestion[] | undefined;
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

function SuggestionLink({ suggestion }: { suggestion: NotFoundSuggestion }): React.JSX.Element {
  return (
    <a
      href={suggestion.link}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-[8px] bg-paper px-2.5 py-2 transition-colors hover:bg-surface active:scale-[0.99]"
    >
      <StoreChip store={suggestion.storeName} />
      <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{suggestion.productName}</span>
      <span className="shrink-0 text-[13px] font-semibold text-ink">{formatCurrency(suggestion.price)}</span>
      <ExternalLink className="size-3.5 shrink-0 text-ink-3" strokeWidth={1.75} />
    </a>
  );
}

/**
 * Terms no store matched. Without this row they vanished from the comparison;
 * near-miss products are a hint to rephrase the item, not part of any cart.
 */
export function NotFoundRow({ notFound, suggestions }: NotFoundRowProps): React.JSX.Element | null {
  if (notFound.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-[12px] bg-sand px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-[13px] text-ink-2">
        <SearchX className="size-3.5" strokeWidth={1.75} />
        No encontramos
      </div>
      {groupNotFoundSuggestions(notFound, suggestions).map((group) => (
        <div key={group.term} className="flex flex-col gap-1.5">
          <p className="text-sm font-medium text-ink">{group.term}</p>
          {group.suggestions.length === 0 ? (
            <p className="text-xs text-ink-3">Sin productos parecidos. Probá con otro nombre.</p>
          ) : (
            <>
              <p className="text-xs text-ink-3">¿Era alguno de estos?</p>
              {group.suggestions.map((suggestion) => (
                <SuggestionLink key={suggestion.link} suggestion={suggestion} />
              ))}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
