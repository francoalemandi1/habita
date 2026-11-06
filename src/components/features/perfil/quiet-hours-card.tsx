"use client";

import { useState } from "react";
import { ListRow } from "@/components/ds/list-row";
import { Toggle } from "@/components/ds/toggle";
import { useSnackbar } from "@/components/ds/snackbar";
import { useUpdateMemberSettings } from "@/hooks/use-member-settings";
import { HOUR_OPTIONS, isValidQuietHoursRange, quietHoursLabel, toggleQuietHours } from "@/lib/perfil-quiet-hours-logic";

export interface QuietHoursCardProps {
  initialStart: number | null;
  initialEnd: number | null;
}

/** §5.3 Perfil → Avisos — "No molestar" toggle + from/to hour selectors (optimistic, pattern A). */
export function QuietHoursCard({ initialStart, initialEnd }: QuietHoursCardProps): React.JSX.Element {
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const enabled = start !== null && end !== null;
  const update = useUpdateMemberSettings();
  const snackbar = useSnackbar();

  function rollbackAndNotify(previousStart: number | null, previousEnd: number | null): void {
    setStart(previousStart);
    setEnd(previousEnd);
    snackbar.show({ text: "No se pudo guardar · Reintentar", tone: "error" });
  }

  function save(nextStart: number | null, nextEnd: number | null): void {
    const previousStart = start;
    const previousEnd = end;
    setStart(nextStart);
    setEnd(nextEnd);
    update.mutate(
      { quietHoursStart: nextStart, quietHoursEnd: nextEnd },
      { onError: () => rollbackAndNotify(previousStart, previousEnd) },
    );
  }

  function handleToggle(checked: boolean): void {
    const next = toggleQuietHours(checked);
    save(next.start, next.end);
  }

  function handleHourChange(which: "start" | "end", value: number): void {
    const nextStart = which === "start" ? value : start;
    const nextEnd = which === "end" ? value : end;
    if (nextStart === null || nextEnd === null || !isValidQuietHoursRange(nextStart, nextEnd)) return;
    save(nextStart, nextEnd);
  }

  return (
    <div className="rounded-[16px] bg-surface px-1">
      <ListRow
        title="No molestar"
        meta={enabled ? quietHoursLabel(start ?? 0, end ?? 0) : "Desactivado"}
        trailing={<Toggle checked={enabled} onCheckedChange={handleToggle} label="No molestar" />}
      />
      {enabled && (
        <div className="flex items-center gap-3 px-2 py-3">
          <HourSelect label="Desde" value={start ?? 0} onChange={(value) => handleHourChange("start", value)} />
          <HourSelect label="Hasta" value={end ?? 0} onChange={(value) => handleHourChange("end", value)} />
        </div>
      )}
    </div>
  );
}

function HourSelect({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }): React.JSX.Element {
  return (
    <label className="flex flex-1 flex-col gap-1">
      <span className="text-[13px] text-ink-2">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 rounded-[12px] border border-line bg-paper px-3 text-[15px] text-ink outline-none"
      >
        {HOUR_OPTIONS.map((hour) => (
          <option key={hour} value={hour}>
            {hour} h
          </option>
        ))}
      </select>
    </label>
  );
}
