import { FilterChip } from "@/components/ds/chip";
import { PLANES_CATEGORY_LABELS } from "@/lib/planes-logic";

import type { EventCategory } from "@habita/contracts";

export interface PlanesFiltersProps {
  categories: EventCategory[];
  activeCategory: EventCategory | null;
  onSelect: (category: EventCategory | null) => void;
}

/** Category filter chips (handoff §6.8) — labels only, no per-category colors. */
export function PlanesFilters({ categories, activeCategory, onSelect }: PlanesFiltersProps): React.JSX.Element | null {
  if (categories.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      <FilterChip className="shrink-0" active={activeCategory === null} onClick={() => onSelect(null)}>
        Todos
      </FilterChip>
      {categories.map((category) => (
        <FilterChip
          key={category}
          className="shrink-0"
          active={activeCategory === category}
          onClick={() => onSelect(activeCategory === category ? null : category)}
        >
          {PLANES_CATEGORY_LABELS[category]}
        </FilterChip>
      ))}
    </div>
  );
}
