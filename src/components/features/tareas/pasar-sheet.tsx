"use client";

import { useState } from "react";
import { Sheet } from "@/components/ds/sheet";
import { RadioGroup } from "@/components/ds/radio";
import { computeMemberDayLoadMinutes } from "@/lib/tareas-week";

import type { WeekAssignment } from "@/hooks/use-week-assignments";

interface PasarSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskName: string;
  dueDate: Date;
  members: Array<{ id: string; name: string }>;
  weekAssignments: readonly WeekAssignment[];
  isSubmitting: boolean;
  onSubmit: (toMemberId: string, reason: string) => void;
}

/** "Pasar a alguien" — pattern C: pick a person, see their load, confirm with a consequence line. */
export function PasarSheet({
  open,
  onOpenChange,
  taskName,
  dueDate,
  members,
  weekAssignments,
  isSubmitting,
  onSubmit,
}: PasarSheetProps): React.JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const options = members.map((member) => {
    const minutes = computeMemberDayLoadMinutes(weekAssignments, member.id, dueDate);
    return { value: member.id, label: member.name, meta: minutes > 0 ? `${minutes} min ese día` : "Sin tareas ese día" };
  });

  const selectedMember = members.find((m) => m.id === selectedId);

  function handleClose(next: boolean): void {
    if (!next) {
      setSelectedId(null);
      setReason("");
    }
    onOpenChange(next);
  }

  return (
    <Sheet open={open} onOpenChange={handleClose} title={`Pasar «${taskName}»`}>
      <div className="flex flex-col gap-4">
        <RadioGroup name="pasar-a" options={options} value={selectedId} onChange={setSelectedId} />
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Mensaje opcional"
          maxLength={500}
          rows={2}
          className="w-full rounded-[12px] border border-line bg-paper px-3 py-2 text-[14px] text-ink outline-none"
        />
        {selectedMember && (
          <p className="text-[13px] text-ink-2">
            {selectedMember.name} tiene que aceptar. Hasta entonces sigue siendo tuya.
          </p>
        )}
        <button
          type="button"
          disabled={!selectedId || isSubmitting}
          onClick={() => selectedId && onSubmit(selectedId, reason)}
          className="h-11 rounded-[12px] bg-monte px-4 text-[15px] font-semibold text-paper disabled:bg-line disabled:text-ink-3"
        >
          {selectedMember ? `Pedirle a ${selectedMember.name}` : "Pedirle"}
        </button>
      </div>
    </Sheet>
  );
}
