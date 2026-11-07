"use client";

import { FilterChip } from "@/components/ds/chip";

interface RubroChipsProps {
  rubros: string[];
  active: string | null;
  onChange: (rubro: string | null) => void;
}

export function RubroChips({ rubros, active, onChange }: RubroChipsProps): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-1.5">
      <FilterChip active={active === null} onClick={() => onChange(null)}>
        Todos
      </FilterChip>
      {rubros.map((rubro) => (
        <FilterChip key={rubro} active={active === rubro} onClick={() => onChange(active === rubro ? null : rubro)}>
          {rubro}
        </FilterChip>
      ))}
    </div>
  );
}
