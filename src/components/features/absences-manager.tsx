"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, Trash2, Plus } from "lucide-react";

import type { MemberAbsence } from "@prisma/client";

interface AbsencesManagerProps {
  absences: MemberAbsence[];
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateForInput(date: Date): string {
  return new Date(date).toISOString().split("T")[0] ?? "";
}

export function AbsencesManager({ absences }: AbsencesManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleAddAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return;

    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/absences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          reason: reason || undefined,
        }),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        const errorData = data as { error?: string };
        throw new Error(errorData.error ?? "Error al crear ausencia");
      }

      setIsAdding(false);
      setStartDate("");
      setEndDate("");
      setReason("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAbsence = async (absenceId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/absences/${absenceId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.refresh();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const now = new Date();
  const upcomingAbsences = absences.filter((a) => new Date(a.endDate) >= now);
  const pastAbsences = absences.filter((a) => new Date(a.endDate) < now);

  return (
    <div className="space-y-6">
      {/* Add new absence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Programar ausencia
          </CardTitle>
          <CardDescription>
            Registra los días que no estarás disponible para tareas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isAdding ? (
            <Button onClick={() => setIsAdding(true)} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Nueva ausencia
            </Button>
          ) : (
            <form onSubmit={handleAddAbsence} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Fecha inicio
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={formatDateForInput(new Date())}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Fecha fin
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || formatDateForInput(new Date())}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Motivo (opcional)
                </label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ej: Vacaciones, viaje de trabajo..."
                  disabled={isLoading}
                  maxLength={200}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Guardando..." : "Guardar"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAdding(false);
                    setError("");
                  }}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Upcoming absences */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Ausencias programadas</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingAbsences.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tienes ausencias programadas
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingAbsences.map((absence) => (
                <div
                  key={absence.id}
                  className="flex flex-col gap-3 rounded-2xl border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">
                      {formatDate(absence.startDate)} - {formatDate(absence.endDate)}
                    </div>
                    {absence.reason && (
                      <p className="text-sm text-muted-foreground">{absence.reason}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {new Date(absence.startDate) <= now && new Date(absence.endDate) >= now && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        Activa
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAbsence(absence.id)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past absences */}
      {pastAbsences.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-muted-foreground">
              Ausencias pasadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pastAbsences.slice(0, 5).map((absence) => (
                <div
                  key={absence.id}
                  className="flex items-center justify-between text-sm text-muted-foreground"
                >
                  <span>
                    {formatDate(absence.startDate)} - {formatDate(absence.endDate)}
                  </span>
                  {absence.reason && <span>{absence.reason}</span>}
                </div>
              ))}
              {pastAbsences.length > 5 && (
                <p className="text-xs text-muted-foreground">
                  Y {pastAbsences.length - 5} más...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
