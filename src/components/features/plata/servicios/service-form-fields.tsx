"use client";

import { TextField } from "@/components/ds/text-field";
import { FilterChip } from "@/components/ds/chip";
import { Toggle } from "@/components/ds/toggle";
import { CATEGORY_OPTIONS, CATEGORY_LABELS } from "@/lib/expense-constants";
import { frequencyLabel } from "@/lib/service-utils";

import type { ExpenseCategory, RecurringFrequency } from "@prisma/client";
import type { MemberOption } from "@/types/expense";

const FREQUENCY_OPTIONS: RecurringFrequency[] = ["WEEKLY", "MONTHLY", "BIMONTHLY", "QUARTERLY", "YEARLY"];

export interface ServiceFormState {
  title: string;
  provider: string;
  accountNumber: string;
  amount: string;
  category: ExpenseCategory;
  frequency: RecurringFrequency;
  dayOfMonth: string;
  paidById: string;
  autoGenerate: boolean;
  notes: string;
}

interface ServiceFormFieldsProps {
  state: ServiceFormState;
  onChange: (patch: Partial<ServiceFormState>) => void;
  members: MemberOption[];
}

/** Service create/edit form fields, split out so the Sheet shell stays under 200 lines. */
export function ServiceFormFields({ state, onChange, members }: ServiceFormFieldsProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <TextField
        label="Nombre"
        placeholder="Edenor, Netflix, Alquiler"
        value={state.title}
        onChange={(e) => onChange({ title: e.target.value })}
        maxLength={100}
        autoFocus
      />

      <TextField
        label="Proveedor (opcional)"
        value={state.provider}
        onChange={(e) => onChange({ provider: e.target.value })}
        maxLength={100}
      />

      <TextField
        label="Nro de cliente (opcional)"
        value={state.accountNumber}
        onChange={(e) => onChange({ accountNumber: e.target.value })}
        maxLength={100}
      />

      <TextField
        label="Último monto (opcional)"
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        value={state.amount}
        onChange={(e) => onChange({ amount: e.target.value })}
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-ink">Categoría</span>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_OPTIONS.map((opt) => (
            <FilterChip key={opt.value} active={state.category === opt.value} onClick={() => onChange({ category: opt.value })}>
              {CATEGORY_LABELS[opt.value]}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-ink">Frecuencia</span>
        <div className="flex flex-wrap gap-1.5">
          {FREQUENCY_OPTIONS.map((freq) => (
            <FilterChip key={freq} active={state.frequency === freq} onClick={() => onChange({ frequency: freq })}>
              {frequencyLabel(freq)}
            </FilterChip>
          ))}
        </div>
      </div>

      {state.frequency !== "WEEKLY" && (
        <TextField
          label="Día del mes (1-28)"
          type="number"
          min={1}
          max={28}
          value={state.dayOfMonth}
          onChange={(e) => onChange({ dayOfMonth: e.target.value })}
        />
      )}

      {members.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-ink">¿Quién paga?</span>
          <div className="flex flex-wrap gap-1.5">
            {members.map((member) => (
              <FilterChip key={member.id} active={state.paidById === member.id} onClick={() => onChange({ paidById: member.id })}>
                {member.name}
              </FilterChip>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 rounded-[12px] bg-surface p-3">
        <div>
          <p className="text-[15px] font-medium text-ink">Registrar automáticamente</p>
          <p className="text-[13px] text-ink-2">Genera el gasto cada {frequencyLabel(state.frequency).toLowerCase()}</p>
        </div>
        <Toggle checked={state.autoGenerate} onCheckedChange={(checked) => onChange({ autoGenerate: checked })} />
      </div>

      <TextField
        label="Notas (opcional)"
        value={state.notes}
        onChange={(e) => onChange({ notes: e.target.value })}
        maxLength={500}
      />
    </div>
  );
}
