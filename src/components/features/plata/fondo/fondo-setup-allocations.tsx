"use client";

import { TextField } from "@/components/ds/text-field";

import type { MemberOption } from "@/types/expense";

interface FondoSetupAllocationsProps {
  members: MemberOption[];
  allocations: Record<string, string>;
  onChange: (memberId: string, value: string) => void;
}

/** Per-member monthly quota inputs, split out so the setup Sheet stays under 200 lines. */
export function FondoSetupAllocations({ members, allocations, onChange }: FondoSetupAllocationsProps): React.JSX.Element | null {
  if (members.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold text-ink">Cuota mensual por miembro</span>
      <p className="text-[13px] text-ink-2">Cuánto aporta cada miembro al fondo por mes</p>
      <div className="flex flex-col gap-2">
        {members.map((member) => (
          <TextField
            key={member.id}
            label={member.name}
            type="number"
            min={0}
            step="100"
            value={allocations[member.id] ?? ""}
            onChange={(e) => onChange(member.id, e.target.value)}
          />
        ))}
      </div>
    </div>
  );
}
