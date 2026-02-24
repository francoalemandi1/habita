"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";

import type { OccupationLevel } from "@/lib/validations/member";

const LEVELS: Array<{ value: OccupationLevel; label: string; description: string }> = [
  { value: "BUSY", label: "Muy ocupado/a", description: "Poco tiempo en casa" },
  { value: "MODERATE", label: "Ocupado/a", description: "Disponibilidad moderada" },
  { value: "AVAILABLE", label: "Disponible", description: "Más tiempo en casa" },
];

interface SetupFormProps {
  householdName: string;
  memberId: string;
}

export function SetupForm({ householdName, memberId }: SetupFormProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<OccupationLevel>("MODERATE");
  const [isSaving, setIsSaving] = useState(false);

  async function handleContinue() {
    setIsSaving(true);
    try {
      await apiFetch(`/api/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occupationLevel: selected }),
      });
      router.push("/dashboard");
    } catch {
      // If save fails, still redirect — occupation level is not critical for first access
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
          Contanos qué tan ocupado/a estás para que Habita reparta mejor las tareas
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {LEVELS.map((level) => {
          const isActive = selected === level.value;
          return (
            <button
              key={level.value}
              type="button"
              onClick={() => setSelected(level.value)}
              disabled={isSaving}
              className={cn(
                "rounded-lg border px-4 py-3 text-left text-sm transition-colors touch-manipulation",
                isActive
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border bg-background text-muted-foreground hover:border-primary/50",
              )}
            >
              <span className="block font-medium">{level.label}</span>
              <span className="text-xs opacity-70">{level.description}</span>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="mt-6 space-y-3">
        <Button
          onClick={handleContinue}
          disabled={isSaving}
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
