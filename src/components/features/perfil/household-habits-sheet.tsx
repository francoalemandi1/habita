"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Sheet } from "@/components/ds/sheet";
import { ListRow } from "@/components/ds/list-row";
import { RadioGroup } from "@/components/ds/radio";
import { useSnackbar } from "@/components/ds/snackbar";
import { apiFetch } from "@/lib/api-client";
import { OCCUPATION_LEVELS, isOccupationLevel } from "@/lib/perfil-household-logic";

import type { OccupationLevel } from "@/lib/validations/member";
import type { ParsedOnboardingProfile } from "@/lib/onboarding-profile";

export interface HouseholdHabitsRowProps {
  memberId: string;
  initialOccupationLevel: OccupationLevel;
  initialOnboardingProfile: ParsedOnboardingProfile;
}

/** §5.3 Perfil → Mi hogar — "Hábitos de la casa" row + sheet: occupation level + dietary hints, pattern B. */
export function HouseholdHabitsRow({
  memberId,
  initialOccupationLevel,
  initialOnboardingProfile,
}: HouseholdHabitsRowProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [occupationLevel, setOccupationLevel] = useState(initialOccupationLevel);
  const [dietaryHints, setDietaryHints] = useState(initialOnboardingProfile.dietaryHints);
  const [newHint, setNewHint] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const snackbar = useSnackbar();

  function addHint(): void {
    const trimmed = newHint.trim();
    if (!trimmed) return;
    setDietaryHints((prev) => [...prev, trimmed]);
    setNewHint("");
  }

  function removeHint(index: number): void {
    setDietaryHints((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave(): Promise<void> {
    setIsSaving(true);
    setError(null);
    try {
      await Promise.all([
        apiFetch(`/api/members/${memberId}`, { method: "PATCH", body: { occupationLevel } }),
        apiFetch("/api/households", {
          method: "PATCH",
          body: {
            onboardingProfile: {
              dietaryHints,
              shoppingContext: initialOnboardingProfile.shoppingContext,
              insights: initialOnboardingProfile.insights,
              rawDescription: initialOnboardingProfile.rawDescription,
              taskReasons: initialOnboardingProfile.taskReasons,
            },
          },
        }),
      ]);
      setOpen(false);
      snackbar.show({ text: "Guardado" });
    } catch (err) {
      console.warn("No se pudieron guardar los hábitos de la casa", err);
      setError("No se pudo guardar. Probá de nuevo.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <ListRow leadingIcon={Sparkles} title="Hábitos de la casa" meta="Ocupación y alimentación" onClick={() => setOpen(true)} />
      <Sheet
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setError(null);
        }}
        title="Hábitos de la casa"
      >
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-[13px] font-semibold text-ink-2">Nivel de ocupación</p>
            <RadioGroup
              name="occupation-level"
              options={OCCUPATION_LEVELS.map((level) => ({ value: level.value, label: level.label, meta: level.description }))}
              value={occupationLevel}
              onChange={(value) => {
                if (isOccupationLevel(value)) setOccupationLevel(value);
              }}
            />
          </div>
          <div>
            <p className="mb-2 text-[13px] font-semibold text-ink-2">Preferencias alimentarias</p>
            {dietaryHints.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {dietaryHints.map((hint, index) => (
                  <span key={`${hint}-${index}`} className="flex items-center gap-1 rounded-full bg-sand px-3 py-1 text-[13px] text-ink">
                    {hint}
                    <button type="button" aria-label={`Quitar ${hint}`} onClick={() => removeHint(index)}>
                      <X className="size-3" strokeWidth={2} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={newHint}
                onChange={(event) => setNewHint(event.target.value)}
                placeholder="Ej: vegetariano, sin TACC..."
                maxLength={100}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addHint();
                  }
                }}
                className="h-11 flex-1 rounded-[12px] border border-line bg-paper px-3 text-[15px] text-ink outline-none"
              />
              <button type="button" onClick={addHint} className="h-11 rounded-[12px] bg-sand px-4 text-[15px] font-semibold text-ink">
                Agregar
              </button>
            </div>
          </div>
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
