"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";

import type { AvailabilitySlots, TimeSlot } from "@/lib/validations/member";

const SLOTS: Array<{ value: TimeSlot; label: string; hours: string }> = [
  { value: "MORNING", label: "Mañana", hours: "7–12" },
  { value: "AFTERNOON", label: "Tarde", hours: "12–18" },
  { value: "NIGHT", label: "Noche", hours: "18–22" },
];

interface AvailabilityManagerProps {
  initialAvailability: AvailabilitySlots | null;
}

export function AvailabilityManager({ initialAvailability }: AvailabilityManagerProps) {
  const router = useRouter();
  const toast = useToast();

  const [weekday, setWeekday] = useState<TimeSlot[]>(initialAvailability?.weekday ?? []);
  const [weekend, setWeekend] = useState<TimeSlot[]>(initialAvailability?.weekend ?? []);
  const [notes, setNotes] = useState(initialAvailability?.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const toggleSlot = (list: TimeSlot[], setList: (v: TimeSlot[]) => void, slot: TimeSlot) => {
    setList(list.includes(slot) ? list.filter((s) => s !== slot) : [...list, slot]);
  };

  const hasChanges =
    JSON.stringify({ weekday, weekend, notes: notes || undefined }) !==
    JSON.stringify({
      weekday: initialAvailability?.weekday ?? [],
      weekend: initialAvailability?.weekend ?? [],
      notes: initialAvailability?.notes || undefined,
    });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const isEmpty = weekday.length === 0 && weekend.length === 0 && !notes.trim();
      const body = isEmpty ? null : { weekday, weekend, notes: notes.trim() || undefined };

      await apiFetch("/api/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      toast.success("Disponibilidad guardada");
      router.refresh();
    } catch {
      toast.error("Error al guardar");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Weekday column */}
          <div>
            <p className="mb-3 text-sm font-medium text-foreground">Entre semana (L-V)</p>
            <div className="flex flex-col gap-2">
              {SLOTS.map((slot) => {
                const isActive = weekday.includes(slot.value);
                return (
                  <button
                    key={`wd-${slot.value}`}
                    type="button"
                    onClick={() => toggleSlot(weekday, setWeekday, slot.value)}
                    className={cn(
                      "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors touch-manipulation",
                      isActive
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border bg-background text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    <span className="block">{slot.label}</span>
                    <span className="text-xs opacity-70">{slot.hours}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Weekend column */}
          <div>
            <p className="mb-3 text-sm font-medium text-foreground">Fin de semana (S-D)</p>
            <div className="flex flex-col gap-2">
              {SLOTS.map((slot) => {
                const isActive = weekend.includes(slot.value);
                return (
                  <button
                    key={`we-${slot.value}`}
                    type="button"
                    onClick={() => toggleSlot(weekend, setWeekend, slot.value)}
                    className={cn(
                      "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors touch-manipulation",
                      isActive
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border bg-background text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    <span className="block">{slot.label}</span>
                    <span className="text-xs opacity-70">{slot.hours}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-6">
          <label htmlFor="availability-notes" className="mb-2 block text-sm font-medium text-foreground">
            Algo más que debamos saber?
          </label>
          <textarea
            id="availability-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: Los miércoles trabajo desde casa y puedo al mediodía"
            className="w-full resize-none rounded-xl border bg-muted/30 p-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            rows={2}
            maxLength={300}
          />
          <p className="mt-1 text-right text-[11px] text-muted-foreground">
            {notes.length}/300
          </p>
        </div>

        {/* Save button */}
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="mt-4 w-full"
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Guardar
        </Button>
      </CardContent>
    </Card>
  );
}
