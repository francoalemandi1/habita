"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { ListRow } from "@/components/ds/list-row";
import { EmptyState } from "@/components/ds/empty-state";
import { TextField } from "@/components/ds/text-field";
import { useSnackbar } from "@/components/ds/snackbar";
import { useCreateAbsence, useDeleteAbsence } from "@/hooks/use-absences";

export interface AbsenceItem {
  id: string;
  startDate: string;
  endDate: string;
  reason: string | null;
}

export interface AbsencesListProps {
  absences: AbsenceItem[];
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("es", { day: "numeric", month: "short" });
}

/** §5.3 Disponibilidad → ausencias — list + add/remove. */
export function AbsencesList({ absences: initialAbsences }: AbsencesListProps): React.JSX.Element {
  const [absences, setAbsences] = useState(initialAbsences);
  const [isAdding, setIsAdding] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const createAbsence = useCreateAbsence();
  const deleteAbsence = useDeleteAbsence();
  const snackbar = useSnackbar();

  function handleAdd(): void {
    if (!startDate || !endDate) return;
    createAbsence.mutate(
      { startDate: new Date(startDate).toISOString(), endDate: new Date(endDate).toISOString() },
      {
        onSuccess: (result) => {
          setAbsences((prev) => [...prev, result.absence]);
          setIsAdding(false);
          setStartDate("");
          setEndDate("");
        },
        onError: () => snackbar.show({ text: "No se pudo guardar · Reintentar", tone: "error" }),
      },
    );
  }

  function handleDelete(id: string): void {
    const previous = absences;
    setAbsences((prev) => prev.filter((a) => a.id !== id));
    deleteAbsence.mutate(id, {
      onError: () => {
        setAbsences(previous);
        snackbar.show({ text: "No se pudo borrar · Reintentar", tone: "error" });
      },
    });
  }

  return (
    <div className="space-y-3">
      {absences.length === 0 && !isAdding ? (
        <EmptyState title="Sin ausencias" description="No se te asignan tareas durante tus ausencias." />
      ) : (
        <div className="rounded-[16px] bg-surface px-1">
          {absences.map((absence) => (
            <ListRow
              key={absence.id}
              title={`${formatDate(absence.startDate)} – ${formatDate(absence.endDate)}`}
              meta={absence.reason ?? undefined}
              trailing={
                <button type="button" aria-label="Borrar ausencia" onClick={() => handleDelete(absence.id)} className="p-2 text-ink-2">
                  <X className="size-4" strokeWidth={1.75} />
                </button>
              }
            />
          ))}
        </div>
      )}

      {isAdding ? (
        <div className="space-y-3 rounded-[16px] bg-surface p-4">
          <TextField label="Desde" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <TextField label="Hasta" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} />
          <div className="flex gap-2">
            <button type="button" onClick={handleAdd} className="h-11 flex-1 rounded-[12px] bg-monte text-[15px] font-semibold text-paper">
              Guardar
            </button>
            <button type="button" onClick={() => setIsAdding(false)} className="h-11 rounded-[12px] bg-sand px-4 text-[15px] font-semibold text-ink">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setIsAdding(true)} className="flex items-center gap-2 text-[15px] font-medium text-monte">
          <Plus className="size-4" strokeWidth={1.75} />
          Nueva ausencia
        </button>
      )}
    </div>
  );
}
