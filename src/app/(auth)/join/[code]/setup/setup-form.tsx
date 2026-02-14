"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";

import type { TimeSlot } from "@/lib/validations/member";

const SLOTS: Array<{ value: TimeSlot; label: string; hours: string }> = [
  { value: "MORNING", label: "Mañana", hours: "7–12" },
  { value: "AFTERNOON", label: "Tarde", hours: "12–18" },
  { value: "NIGHT", label: "Noche", hours: "18–22" },
];

interface SetupFormProps {
  householdName: string;
}

export function SetupForm({ householdName }: SetupFormProps) {
  const router = useRouter();
  const [weekday, setWeekday] = useState<TimeSlot[]>([]);
  const [weekend, setWeekend] = useState<TimeSlot[]>([]);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const hasSlots = weekday.length > 0 || weekend.length > 0;

  function toggleSlot(list: TimeSlot[], setList: (v: TimeSlot[]) => void, slot: TimeSlot) {
    setList(list.includes(slot) ? list.filter((s) => s !== slot) : [...list, slot]);
  }

  async function handleContinue() {
    setIsSaving(true);
    try {
      await apiFetch("/api/availability", {
        method: "PUT",
        body: { weekday, weekend, notes: notes.trim() || undefined },
      });
      router.push("/dashboard");
    } catch {
      // If save fails, still redirect — availability is not critical for first access
      router.push("/dashboard");
    }
  }

  function handleSkip() {
    router.push("/dashboard");
  }

  return (
    <>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-4xl">
          🏠
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          Bienvenido a {householdName}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Contanos cuándo podés hacer tareas del hogar para que Habita reparta mejor
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Weekday column */}
        <div>
          <p className="mb-3 text-sm font-medium">Entre semana (L-V)</p>
          <div className="flex flex-col gap-2">
            {SLOTS.map((slot) => {
              const isActive = weekday.includes(slot.value);
              return (
                <button
                  key={`wd-${slot.value}`}
                  type="button"
                  onClick={() => toggleSlot(weekday, setWeekday, slot.value)}
                  disabled={isSaving}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors touch-manipulation",
                    isActive
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border bg-background text-muted-foreground hover:border-primary/50",
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
          <p className="mb-3 text-sm font-medium">Fin de semana (S-D)</p>
          <div className="flex flex-col gap-2">
            {SLOTS.map((slot) => {
              const isActive = weekend.includes(slot.value);
              return (
                <button
                  key={`we-${slot.value}`}
                  type="button"
                  onClick={() => toggleSlot(weekend, setWeekend, slot.value)}
                  disabled={isSaving}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors touch-manipulation",
                    isActive
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border bg-background text-muted-foreground hover:border-primary/50",
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
      <div className="mt-5">
        <label htmlFor="setup-notes" className="mb-2 block text-sm font-medium">
          Algo más que debamos saber?
        </label>
        <textarea
          id="setup-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ej: Los miércoles trabajo desde casa y puedo al mediodía"
          disabled={isSaving}
          className="w-full resize-none rounded-xl border bg-muted/30 p-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          rows={2}
          maxLength={300}
        />
        <p className="mt-1 text-right text-[11px] text-muted-foreground">
          {notes.length}/300
        </p>
      </div>

      {/* Actions */}
      <div className="mt-4 space-y-3">
        <Button
          onClick={handleContinue}
          disabled={isSaving || !hasSlots}
          className="w-full gap-1.5"
          size="lg"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              Continuar
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>

        <button
          type="button"
          onClick={handleSkip}
          disabled={isSaving}
          className="w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Omitir por ahora
        </button>
      </div>
    </>
  );
}
