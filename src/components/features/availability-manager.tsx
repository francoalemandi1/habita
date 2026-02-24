"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";

import type { OccupationLevel } from "@/lib/validations/member";

const LEVELS: Array<{ value: OccupationLevel; label: string; description: string }> = [
  { value: "BUSY", label: "Muy ocupado/a", description: "Poco tiempo en casa, preferís pocas tareas" },
  { value: "MODERATE", label: "Ocupado/a", description: "Disponibilidad moderada para tareas" },
  { value: "AVAILABLE", label: "Disponible", description: "Más tiempo en casa, podés asumir más tareas" },
];

interface OccupationLevelSelectorProps {
  memberId: string;
  initialLevel: OccupationLevel;
}

export function OccupationLevelSelector({ memberId, initialLevel }: OccupationLevelSelectorProps) {
  const router = useRouter();
  const toast = useToast();

  const [selected, setSelected] = useState<OccupationLevel>(initialLevel);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = selected !== initialLevel;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiFetch(`/api/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occupationLevel: selected }),
      });

      toast.success("Nivel de ocupación guardado");
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
        <div className="flex flex-col gap-3">
          {LEVELS.map((level) => {
            const isActive = selected === level.value;
            return (
              <button
                key={level.value}
                type="button"
                onClick={() => setSelected(level.value)}
                className={cn(
                  "rounded-lg border px-4 py-3 text-left text-sm transition-colors touch-manipulation",
                  isActive
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border bg-background text-muted-foreground hover:border-primary/50"
                )}
              >
                <span className="block font-medium">{level.label}</span>
                <span className="text-xs opacity-70">{level.description}</span>
              </button>
            );
          })}
        </div>

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
