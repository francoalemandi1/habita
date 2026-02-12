"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Dices, Loader2, CheckCircle, Search, Plus, BookOpen } from "lucide-react";
import { RouletteWheel } from "@/components/features/roulette-wheel";
import { RouletteResultDialog } from "@/components/features/roulette-result-dialog";
import { BackButton } from "@/components/ui/back-button";
import { apiFetch } from "@/lib/api-client";
import { spacing, iconSize, wheelColors } from "@/lib/design-tokens";

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

interface CatalogSuggestion {
  name: string;
  weight: number;
  frequency: TaskFrequency;
  estimatedMinutes: number | null;
}

type TaskSelection =
  | { type: "existing"; task: RouletteTask }
  | { type: "catalog"; suggestion: CatalogSuggestion }
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
  catalogSuggestions: CatalogSuggestion[];
  initialMembers: RouletteMember[];
  currentMemberId: string;
}

type RoulettePhase = "idle" | "loading-members" | "ready" | "spinning" | "result" | "assigned";

const CONFETTI_COUNT = 40;

function spawnConfetti(containerEl: HTMLDivElement | null) {
  if (!containerEl) return;

  // Clear previous confetti
  containerEl.innerHTML = "";

  for (let i = 0; i < CONFETTI_COUNT; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    const color = wheelColors[i % wheelColors.length]!;
    const leftPos = Math.random() * 100;
    const duration = 2 + Math.random() * 2;
    const delay = Math.random() * 0.5;
    const size = 6 + Math.random() * 8;

    piece.style.cssText = `
      left: ${leftPos}%;
      width: ${size}px;
      height: ${size * 0.6}px;
      background: ${color};
      --confetti-duration: ${duration}s;
      --confetti-delay: ${delay}s;
      border-radius: ${Math.random() > 0.5 ? "50%" : "2px"};
    `;
    containerEl.appendChild(piece);
  }

  // Cleanup after animations
  setTimeout(() => {
    if (containerEl) containerEl.innerHTML = "";
  }, 4000);
}

export function RouletteView({
  initialTasks,
  catalogSuggestions,
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
  const confettiRef = useRef<HTMLDivElement>(null);
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
  const searchLower = searchText.trim().toLowerCase();
  const filteredTasks = searchLower
    ? initialTasks.filter((t) =>
        t.name.toLowerCase().includes(searchLower),
      )
    : initialTasks;

  const filteredCatalog = searchLower
    ? catalogSuggestions.filter((c) =>
        c.name.toLowerCase().includes(searchLower),
      )
    : catalogSuggestions;

  const allNames = [
    ...initialTasks.map((t) => t.name.toLowerCase()),
    ...catalogSuggestions.map((c) => c.name.toLowerCase()),
  ];
  const exactMatch = allNames.some((n) => n === searchLower);
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

  const getSelectionName = useCallback((selection: TaskSelection): string => {
    switch (selection.type) {
      case "existing": return selection.task.name;
      case "catalog": return selection.suggestion.name;
      case "custom": return selection.name;
    }
  }, []);

  const handleSelectTask = useCallback(
    (selection: TaskSelection) => {
      setTaskSelection(selection);
      setSearchText(getSelectionName(selection));
      setIsDropdownOpen(false);
      setWinnerIndex(-1);
      fetchMembers(selection);
    },
    [fetchMembers, getSelectionName],
  );

  const handleInputChange = useCallback((value: string) => {
    setSearchText(value);
    setIsDropdownOpen(true);
    setTaskSelection(null);
    setPhase("idle");
    setWinnerIndex(-1);
    setEligibleMembers([]);
  }, []);

  // Client-side spin — triggered from wheel center button
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
    spawnConfetti(confettiRef.current);
  }, []);

  // Confirm assignment via API
  const handleConfirmAssignment = useCallback(async () => {
    if (!taskSelection || winnerIndex < 0) return;
    const winner = eligibleMembers[winnerIndex];
    if (!winner) return;

    setIsAssigning(true);

    try {
      const customName =
        taskSelection.type === "catalog"
          ? taskSelection.suggestion.name
          : taskSelection.type === "custom"
            ? taskSelection.name
            : null;

      const body = taskSelection.type === "existing"
        ? { taskId: taskSelection.task.id, memberId: winner.id }
        : {
            customTaskName: customName!,
            memberId: winner.id,
            ...(taskSelection.type === "catalog" && {
              customTaskWeight: taskSelection.suggestion.weight,
              customTaskFrequency: taskSelection.suggestion.frequency,
              customTaskEstimatedMinutes: taskSelection.suggestion.estimatedMinutes ?? undefined,
            }),
          };

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
  const taskName = taskSelection ? getSelectionName(taskSelection) : "";

  const canSpin = phase === "ready" && !!taskSelection && eligibleMembers.length >= 2;

  return (
    <div className={spacing.contentStackWide}>
      {/* Confetti container (portal-like, fixed positioned pieces) */}
      <div ref={confettiRef} aria-hidden="true" />

      {/* Header */}
      <div className={spacing.pageHeader}>
        <BackButton />
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl flex items-center gap-2">
          <Dices className={`${iconSize.xl} text-primary shrink-0`} />
          Ruleta de tareas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Elegí una tarea y tocá el centro de la ruleta para girar
        </p>
      </div>

      {/* Task Combobox */}
      <div className="relative mx-auto max-w-sm" ref={dropdownRef}>
        <div className="relative">
          <Search className={`${iconSize.md} absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none`} />
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

        {isDropdownOpen && (filteredTasks.length > 0 || filteredCatalog.length > 0 || showCustomOption) && (
          <div className="absolute z-30 mt-2 w-full rounded-2xl border border-border bg-card shadow-lg max-h-60 overflow-y-auto">
            {/* Household tasks */}
            {filteredTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                className="flex w-full items-center px-4 py-3 text-left text-sm hover:bg-muted/50 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                onClick={() =>
                  handleSelectTask({ type: "existing", task })
                }
              >
                <span className="truncate font-medium">{task.name}</span>
              </button>
            ))}

            {/* Catalog suggestions */}
            {filteredCatalog.length > 0 && (
              <>
                {filteredTasks.length > 0 && (
                  <div className="flex items-center gap-2 border-t border-border/50 px-4 py-2">
                    <BookOpen className={`${iconSize.xs} text-muted-foreground`} />
                    <span className="text-xs text-muted-foreground">Sugerencias</span>
                  </div>
                )}
                {filteredCatalog.map((suggestion) => (
                  <button
                    key={`catalog-${suggestion.name}`}
                    type="button"
                    className="flex w-full items-center px-4 py-3 text-left text-sm hover:bg-muted/50 transition-colors last:rounded-b-2xl"
                    onClick={() =>
                      handleSelectTask({ type: "catalog", suggestion })
                    }
                  >
                    <span className="truncate text-muted-foreground">{suggestion.name}</span>
                  </button>
                ))}
              </>
            )}

            {/* Custom task option */}
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
                <Plus className={`${iconSize.md} shrink-0`} />
                <span>
                  Crear: <span className="font-medium">{searchText.trim()}</span>
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Wheel — includes the spin button in center */}
      <RouletteWheel
        members={!taskSelection ? initialMembers : eligibleMembers}
        isSpinning={phase === "spinning"}
        winnerIndex={winnerIndex}
        onSpinComplete={handleSpinComplete}
        onSpin={handleSpin}
        canSpin={canSpin}
      />

      {/* Loading indicator (replaces old separate button) */}
      {phase === "loading-members" && (
        <div className="flex justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className={`${iconSize.md} animate-spin`} />
            Cargando miembros...
          </div>
        </div>
      )}

      {/* Hint text when ready */}
      {phase === "ready" && (
        <p className="text-center text-sm text-muted-foreground animate-fade-in">
          Tocá el centro de la ruleta para girar
        </p>
      )}

      {/* Assigned success card */}
      {phase === "assigned" && winner && (
        <Card className="animate-fade-in mx-auto max-w-sm border-2 border-green-500/30">
          <CardContent className={`${spacing.contentStack} py-6 text-center`}>
            <div className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle className={iconSize.lg} />
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
        isCurrentMember={winner?.id === currentMemberId}
      />
    </div>
  );
}
