"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

import type { TaskFrequency } from "@prisma/client";

interface RotationToggleProps {
  taskId: string;
  taskName: string;
  currentRotation?: {
    id: string;
    frequency: TaskFrequency;
    isActive: boolean;
    nextDueDate: Date | null;
  } | null;
}

const FREQUENCY_OPTIONS = [
  { value: "DAILY", label: "Diaria" },
  { value: "WEEKLY", label: "Semanal" },
  { value: "BIWEEKLY", label: "Quincenal" },
  { value: "MONTHLY", label: "Mensual" },
];

export function RotationToggle({ taskId, taskName, currentRotation }: RotationToggleProps) {
  const [open, setOpen] = useState(false);
  const [frequency, setFrequency] = useState<string>(currentRotation?.frequency ?? "WEEKLY");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const hasRotation = !!currentRotation;

  const handleCreate = async () => {
    setError("");
    setIsLoading(true);

    try {
      await apiFetch("/api/rotations", {
        method: "POST",
        body: { taskId, frequency },
      });

      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!currentRotation) return;

    setError("");
    setIsLoading(true);

    try {
      await apiFetch(`/api/rotations/${currentRotation.id}`, {
        method: "PATCH",
        body: { frequency },
      });

      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentRotation) return;

    setError("");
    setIsLoading(true);

    try {
      await apiFetch(`/api/rotations/${currentRotation.id}`, {
        method: "DELETE",
      });

      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={hasRotation ? "default" : "outline"}
          size="sm"
          className={hasRotation ? "bg-green-600 hover:bg-green-700" : ""}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {hasRotation ? "Rotación activa" : "Activar rotación"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {hasRotation ? "Configurar rotación" : "Activar rotación automática"}
          </DialogTitle>
          <DialogDescription>
            {hasRotation
              ? `Modifica la rotación de "${taskName}"`
              : `Activa la asignación automática de "${taskName}"`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Frecuencia</label>
            <Select value={frequency} onValueChange={setFrequency} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {currentRotation?.nextDueDate && (
            <p className="text-sm text-muted-foreground">
              Próxima asignación:{" "}
              {new Date(currentRotation.nextDueDate).toLocaleDateString("es", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-between">
            {hasRotation && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isLoading}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </Button>
            )}
            <div className="ml-auto flex gap-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                onClick={hasRotation ? handleUpdate : handleCreate}
                disabled={isLoading}
              >
                {isLoading ? "Guardando..." : hasRotation ? "Guardar" : "Activar"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
