"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Dices, Loader2, Sparkles, Star, CheckCircle, Search, Plus } from "lucide-react";
import { RouletteWheel } from "@/components/features/roulette-wheel";
import { RouletteResultDialog } from "@/components/features/roulette-result-dialog";
import { BackButton } from "@/components/ui/back-button";
import { apiFetch } from "@/lib/api-client";
import { calculatePoints } from "@/lib/points";

import type { TaskFrequency, MemberType } from "@prisma/client";

interface RouletteTask {
  id: string;
  name: string;
  weight: number;
  frequency: TaskFrequency;
  estimatedMinutes: number | null;
}

interface RouletteMember {
  id: string;
  name: string;
  memberType: MemberType;
  avatarUrl: string | null;
}

type TaskSelection =
  | { type: "existing"; task: RouletteTask }
  | { type: "custom"; name: string };

interface AssignResponse {
  assignment: {
    id: string;
    task: { id: string; name: string; weight: number; frequency: TaskFrequency };
    member: { id: string; name: string; avatarUrl: string | null; memberType: MemberType };
  };
  taskName: string;
  pointsPreview: number;
}

interface RouletteViewProps {
  initialTasks: RouletteTask[];
  initialMembers: RouletteMember[];
  currentMemberId: string;
}

type RoulettePhase = "idle" | "loading-members" | "ready" | "spinning" | "result" | "assigned";

export function RouletteView({
  initialTasks,
  initialMembers,
  currentMemberId,
}: RouletteViewProps) {
  const [taskSelection, setTaskSelection] = useState<TaskSelection | null>(null);
  const [searchText, setSearchText] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [eligibleMembers, setEligibleMembers] = useState<RouletteMember[]>(initialMembers);
  const [phase, setPhase] = useState<RoulettePhase>("idle");
  const [winnerIndex, setWinnerIndex] = useState(-1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered tasks based on search
  const filteredTasks = searchText.trim()
    ? initialTasks.filter((t) =>
        t.name.toLowerCase().includes(searchText.toLowerCase()),
      )
    : initialTasks;

  const exactMatch = initialTasks.some(
    (t) => t.name.toLowerCase() === searchText.trim().toLowerCase(),
  );
  const showCustomOption = searchText.trim().length >= 2 && !exactMatch;

  // Fetch eligible members when a task is selected
  const fetchMembers = useCallback(
    async (selection: TaskSelection) => {
      setPhase("loading-members");

      const taskIdParam =
        selection.type === "existing" ? selection.task.id : "__custom__";

      try {
        const data = await apiFetch<{ members: RouletteMember[] }>(
          `/api/roulette/members?taskId=${taskIdParam}`,
        );
        setEligibleMembers(data.members);
        setPhase(data.members.length >= 2 ? "ready" : "idle");

        if (data.members.length < 2) {
          toast.warning(
            "Pocos miembros",
            data.members.length === 0
              ? "No hay miembros elegibles para esta tarea"
              : "Se necesitan al menos 2 miembros para girar la ruleta",
          );
        }
      } catch {
        toast.error("Error", "No se pudieron cargar los miembros elegibles");
        setPhase("idle");
      }
    },
    [toast],
  );

  const handleSelectTask = useCallback(
    (selection: TaskSelection) => {
      setTaskSelection(selection);
      setSearchText(
        selection.type === "existing" ? selection.task.name : selection.name,
      );
      setIsDropdownOpen(false);
      setWinnerIndex(-1);
      fetchMembers(selection);
    },
    [fetchMembers],
  );

  const handleInputChange = useCallback((value: string) => {
    setSearchText(value);
    setIsDropdownOpen(true);
    // Clear current selection when typing
    setTaskSelection(null);
    setPhase("idle");
    setWinnerIndex(-1);
    setEligibleMembers([]);
  }, []);

  // Client-side spin — no API call
  const handleSpin = useCallback(() => {
    if (!taskSelection || eligibleMembers.length < 2) return;

    setPhase("spinning");
    const randomIndex = Math.floor(Math.random() * eligibleMembers.length);
    setWinnerIndex(randomIndex);
  }, [taskSelection, eligibleMembers]);

  // Called when wheel animation finishes
  const handleSpinComplete = useCallback(() => {
    setPhase("result");
    setIsDialogOpen(true);
  }, []);

  // Confirm assignment via API
  const handleConfirmAssignment = useCallback(async () => {
    if (!taskSelection || winnerIndex < 0) return;
    const winner = eligibleMembers[winnerIndex];
    if (!winner) return;

    setIsAssigning(true);

    try {
      const body =
        taskSelection.type === "existing"
          ? { taskId: taskSelection.task.id, memberId: winner.id }
          : { customTaskName: taskSelection.name, memberId: winner.id };

      await apiFetch<AssignResponse>("/api/roulette/assign", {
        method: "POST",
        body,
      });

      setIsDialogOpen(false);
      setPhase("assigned");
      toast.success("Tarea asignada", `${winner.name} tiene una nueva tarea`);
    } catch {
      toast.error("Error", "No se pudo crear la asignación");
    } finally {
      setIsAssigning(false);
    }
  }, [taskSelection, winnerIndex, eligibleMembers, toast]);

  // Cancel dialog — go back to ready state
  const handleDialogClose = useCallback(() => {
    setIsDialogOpen(false);
    setPhase("ready");
    setWinnerIndex(-1);
  }, []);

  // Reset to spin again
  const handleReset = useCallback(() => {
    setPhase("ready");
    setWinnerIndex(-1);
  }, []);

  // Computed values
  const winner = winnerIndex >= 0 ? eligibleMembers[winnerIndex] : undefined;
  const taskName = taskSelection
    ? taskSelection.type === "existing"
      ? taskSelection.task.name
      : taskSelection.name
    : "";
  const pointsPreview = taskSelection?.type === "existing"
    ? calculatePoints({
        weight: taskSelection.task.weight,
        frequency: taskSelection.task.frequency,
      })
    : 10; // Default for custom tasks (weight 1 × ONCE multiplier 1 × 10)

  const isSpinDisabled = phase !== "ready";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <BackButton />
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl flex items-center gap-2">
          <Dices className="h-6 w-6 text-primary shrink-0" />
          Ruleta de tareas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Elegí una tarea y girá la ruleta para asignarla al azar
        </p>
      </div>

      {/* Task Combobox */}
      <div className="relative mx-auto max-w-sm" ref={dropdownRef}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            placeholder="Buscar o crear tarea..."
            value={searchText}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setIsDropdownOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setIsDropdownOpen(false);
                inputRef.current?.blur();
              }
            }}
            disabled={phase === "spinning"}
            className="pl-10"
          />
        </div>

        {isDropdownOpen && (filteredTasks.length > 0 || showCustomOption) && (
          <div className="absolute z-30 mt-2 w-full rounded-2xl border border-border bg-card shadow-lg max-h-60 overflow-y-auto">
            {filteredTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-muted/50 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                onClick={() =>
                  handleSelectTask({ type: "existing", task })
                }
              >
                <span className="truncate font-medium">{task.name}</span>
                <Badge variant="secondary" className="ml-2 shrink-0 gap-0.5 text-xs">
                  <Star className="h-3 w-3 text-yellow-500" />
                  {calculatePoints({ weight: task.weight, frequency: task.frequency })}
                </Badge>
              </button>
            ))}
            {showCustomOption && (
              <button
                type="button"
                className="flex w-full items-center gap-2 border-t border-border/50 px-4 py-3 text-left text-sm text-primary hover:bg-primary/5 transition-colors last:rounded-b-2xl"
                onClick={() =>
                  handleSelectTask({
                    type: "custom",
                    name: searchText.trim(),
                  })
                }
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>
                  Crear: <span className="font-medium">{searchText.trim()}</span>
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Points preview */}
      {taskSelection && (
        <div className="flex justify-center">
          <Badge variant="secondary" className="gap-1">
            <Star className="h-3 w-3 text-yellow-500" />
            {pointsPreview} XP
            {taskSelection.type === "custom" && (
              <span className="text-muted-foreground ml-1">(tarea nueva)</span>
            )}
          </Badge>
        </div>
      )}

      {/* Wheel */}
      <RouletteWheel
        members={!taskSelection ? initialMembers : eligibleMembers}
        isSpinning={phase === "spinning"}
        winnerIndex={winnerIndex}
        onSpinComplete={handleSpinComplete}
      />

      {/* Action buttons */}
      <div className="flex justify-center">
        {phase === "ready" && (
          <Button
            size="lg"
            className="rounded-full px-8 text-lg"
            onClick={handleSpin}
            disabled={isSpinDisabled}
          >
            <Sparkles className="mr-2 h-5 w-5" />
            Girar
          </Button>
        )}
        {phase === "loading-members" && (
          <Button size="lg" className="rounded-full px-8" disabled>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Cargando...
          </Button>
        )}
        {phase === "spinning" && (
          <Button size="lg" className="rounded-full px-8" disabled>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Girando...
          </Button>
        )}
      </div>

      {/* Assigned success card */}
      {phase === "assigned" && winner && (
        <Card className="animate-fade-in mx-auto max-w-sm border-2 border-green-500/30">
          <CardContent className="space-y-4 py-6 text-center">
            <div className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Asignación creada para hoy</span>
            </div>
            <div>
              <p className="text-lg font-bold">{winner.name}</p>
              <p className="text-muted-foreground">{taskName}</p>
            </div>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={handleReset}
            >
              Girar de nuevo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Confirmation dialog */}
      <RouletteResultDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        onConfirm={handleConfirmAssignment}
        isAssigning={isAssigning}
        winner={winner ? { name: winner.name, memberType: winner.memberType } : null}
        taskName={taskName}
        pointsPreview={pointsPreview}
        isCurrentMember={winner?.id === currentMemberId}
      />
    </div>
  );
}
