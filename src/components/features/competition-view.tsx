"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Trophy, Medal, Plus, Calendar, Gift, Users, Crown, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

import type { Competition, CompetitionScore, Member, MemberType } from "@prisma/client";

type ScoreWithMember = CompetitionScore & {
  member: Pick<Member, "id" | "name" | "avatarUrl"> & { memberType?: MemberType };
};

type CompetitionWithScores = Competition & {
  scores: ScoreWithMember[];
};

interface CompetitionViewProps {
  activeCompetition: CompetitionWithScores | null;
  pastCompetitions: CompetitionWithScores[];
  currentMemberId: string;
  isAdult: boolean;
}

const MEDAL_ICONS = ["🥇", "🥈", "🥉"];

export function CompetitionView({
  activeCompetition,
  pastCompetitions,
  currentMemberId,
  isAdult,
}: CompetitionViewProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const handleCreateCompetition = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreating(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string || undefined,
      duration: formData.get("duration") as string,
      prize: formData.get("prize") as string || undefined,
    };

    try {
      const response = await fetch("/api/competitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success("Competencia creada");
        setIsCreateOpen(false);
        router.refresh();
      } else {
        const err = await response.json();
        toast.error(err.error ?? "Error al crear competencia");
      }
    } catch {
      toast.error("Error al crear competencia");
    } finally {
      setIsCreating(false);
    }
  };

  const handleEndCompetition = async () => {
    if (!activeCompetition) return;
    setIsEnding(true);

    try {
      const response = await fetch(`/api/competitions/${activeCompetition.id}`, {
        method: "PATCH",
      });

      if (response.ok) {
        toast.success("Competencia finalizada");
        router.refresh();
      } else {
        const err = await response.json();
        toast.error(err.error ?? "Error al finalizar");
      }
    } catch {
      toast.error("Error al finalizar competencia");
    } finally {
      setIsEnding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Trophy className="h-6 w-6 shrink-0 text-yellow-500" />
            Competencias
          </h1>
          <p className="text-muted-foreground">
            Compite con tu familia y gana premios
          </p>
        </div>

        {isAdult && !activeCompetition && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Competencia
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateCompetition}>
                <DialogHeader>
                  <DialogTitle>Crear Competencia</DialogTitle>
                  <DialogDescription>
                    Inicia una competencia para motivar a toda la familia
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Ej: Semana del orden"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción (opcional)</Label>
                    <Input
                      id="description"
                      name="description"
                      placeholder="Ej: Quién mantiene su cuarto más limpio"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Duración</Label>
                    <Select name="duration" defaultValue="WEEK">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WEEK">1 Semana</SelectItem>
                        <SelectItem value="MONTH">1 Mes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prize">Premio (opcional)</Label>
                    <Input
                      id="prize"
                      name="prize"
                      placeholder="Ej: Elegir película del viernes"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? "Creando..." : "Crear"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Active Competition */}
      {activeCompetition ? (
        <Card className="border-2 border-yellow-400/50 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  {activeCompetition.name}
                </CardTitle>
                {activeCompetition.description && (
                  <CardDescription>{activeCompetition.description}</CardDescription>
                )}
              </div>
              <div className="text-right text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Termina {formatDistanceToNow(new Date(activeCompetition.endDate), {
                    addSuffix: true,
                    locale: es,
                  })}
                </div>
                {activeCompetition.prize && (
                  <div className="mt-1 flex items-center gap-1 text-yellow-600">
                    <Gift className="h-4 w-4" />
                    {activeCompetition.prize}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeCompetition.scores.map((score, index) => {
                const isCurrentUser = score.memberId === currentMemberId;
                const medal = MEDAL_ICONS[index];

                return (
                  <div
                    key={score.id}
                    className={`flex items-center gap-4 rounded-2xl p-3 ${
                      isCurrentUser
                        ? "bg-primary/10 ring-2 ring-primary/30"
                        : "bg-background/50"
                    }`}
                  >
                    <div className="flex h-8 w-8 items-center justify-center text-2xl">
                      {medal ?? `#${index + 1}`}
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-lg font-medium">
                      {score.member.avatarUrl ? (
                        <img
                          src={score.member.avatarUrl}
                          alt={score.member.name}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        score.member.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {score.member.name}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-muted-foreground">(tú)</span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {score.tasksCompleted} tareas completadas
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-yellow-600">{score.points}</p>
                      <p className="text-xs text-muted-foreground">puntos</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {isAdult && (
              <div className="mt-6 flex justify-end">
                <Button
                  variant="outline"
                  onClick={handleEndCompetition}
                  disabled={isEnding}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  {isEnding ? "Finalizando..." : "Finalizar Competencia"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="mx-auto mb-4 h-12 w-12 text-foreground-tertiary" />
            <p className="text-lg font-medium">No hay competencia activa</p>
            <p className="text-muted-foreground">
              {isAdult
                ? "Crea una competencia para motivar a tu familia"
                : "Espera a que un adulto cree una competencia"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Past Competitions */}
      {pastCompetitions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Medal className="h-5 w-5 text-muted-foreground" />
            Competencias Anteriores
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            {pastCompetitions.map((competition) => {
              const winner = competition.scores[0];
              const isCompleted = competition.status === "COMPLETED";

              return (
                <Card key={competition.id} className={!isCompleted ? "opacity-60" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{competition.name}</CardTitle>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          isCompleted
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {isCompleted ? "Completada" : "Cancelada"}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {winner && isCompleted && (
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🏆</span>
                        <div>
                          <p className="font-medium">{winner.member.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {winner.points} puntos
                          </p>
                        </div>
                      </div>
                    )}
                    {competition.prize && isCompleted && (
                      <p className="mt-2 text-sm text-muted-foreground flex items-center gap-1">
                        <Gift className="h-3 w-3" />
                        Premio: {competition.prize}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {competition.scores.length} participantes
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
