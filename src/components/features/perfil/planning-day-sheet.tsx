"use client";

import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { Sheet } from "@/components/ds/sheet";
import { ListRow } from "@/components/ds/list-row";
import { RadioGroup } from "@/components/ds/radio";
import { useSnackbar } from "@/components/ds/snackbar";
import { apiFetch } from "@/lib/api-client";
import { PLANNING_DAY_LABELS, formatPlanningDayLabel } from "@/lib/perfil-household-logic";

const NO_DAY = "none";

export interface PlanningDayRowProps {
  initialPlanningDay: number | null;
}

/** §5.3 Perfil → Mi hogar — "Día del plan" row + sheet, pattern B. */
export function PlanningDayRow({ initialPlanningDay }: PlanningDayRowProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [planningDay, setPlanningDay] = useState(initialPlanningDay);
  const [selected, setSelected] = useState(initialPlanningDay === null ? NO_DAY : String(initialPlanningDay));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const snackbar = useSnackbar();

  const options = [
    { value: NO_DAY, label: "Sin día fijo" },
    ...Object.entries(PLANNING_DAY_LABELS).map(([value, label]) => ({ value, label })),
  ];

  async function handleSave(): Promise<void> {
    const nextPlanningDay = selected === NO_DAY ? null : Number(selected);
    setIsSaving(true);
    setError(null);
    try {
      await apiFetch("/api/households", { method: "PATCH", body: { planningDay: nextPlanningDay } });
      setPlanningDay(nextPlanningDay);
      setOpen(false);
      snackbar.show({ text: "Guardado" });
    } catch (err) {
      console.warn("No se pudo guardar el día del plan", err);
      setError("No se pudo guardar. Probá de nuevo.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <ListRow leadingIcon={CalendarClock} title="Día del plan" meta={formatPlanningDayLabel(planningDay)} onClick={() => setOpen(true)} />
      <Sheet
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setError(null);
        }}
        title="Día del plan"
      >
        <div className="space-y-4">
          <RadioGroup name="planning-day" options={options} value={selected} onChange={setSelected} />
          {error && <p className="text-[13px] text-ladrillo-text">{error}</p>}
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void handleSave()}
            className="h-11 w-full rounded-[12px] bg-monte text-[15px] font-semibold text-paper disabled:bg-line disabled:text-ink-3"
          >
            Guardar
          </button>
        </div>
      </Sheet>
    </>
  );
}
