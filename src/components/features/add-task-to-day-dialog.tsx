"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { Search, X, Plus, ChevronDown, Loader2 } from "lucide-react";
import { CatalogTaskItem } from "@/components/features/onboarding/catalog-task-item";
import { cn } from "@/lib/utils";
import { cyclingColors, contrastText } from "@/lib/design-tokens";
import { ONBOARDING_CATALOG } from "@/data/onboarding-catalog";

import type { CatalogTaskItemData } from "@/components/features/onboarding/catalog-task-item";
import type { OnboardingCatalogCategory } from "@/data/onboarding-catalog";
import type { MemberType } from "@prisma/client";

// ============================================
// Types
// ============================================

interface MemberOption {
  id: string;
  name: string;
  type: MemberType;
}

interface AddTaskToDayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDayOfWeek: number;
  planDurationDays: number;
  members: MemberOption[];
  existingTaskNames: string[];
  existingAssignmentKeys: Set<string>;
  onAddTask: (params: {
    taskName: string;
    memberId: string;
    memberName: string;
    memberType: MemberType;
    dayOfWeek: number;
  }) => void;
}

// ============================================
// Constants
// ============================================

const DAY_OF_WEEK_SHORT: Record<number, string> = {
  1: "Lun", 2: "Mar", 3: "Mié", 4: "Jue", 5: "Vie", 6: "Sáb", 7: "Dom",
};

const FREQUENCY_OPTIONS = [
  { value: "DAILY", label: "Diaria" },
  { value: "WEEKLY", label: "Semanal" },
  { value: "BIWEEKLY", label: "Quincenal" },
  { value: "MONTHLY", label: "Mensual" },
];

const WEIGHT_OPTIONS = [
  { value: "1", label: "Muy fácil" },
  { value: "2", label: "Fácil" },
  { value: "3", label: "Media" },
  { value: "4", label: "Difícil" },
  { value: "5", label: "Muy difícil" },
];

// ============================================
// Component
// ============================================

export function AddTaskToDayDialog({
  open,
  onOpenChange,
  defaultDayOfWeek,
  planDurationDays,
  members,
  existingTaskNames,
  existingAssignmentKeys,
  onAddTask,
}: AddTaskToDayDialogProps) {
  const toast = useToast();

  // Selection state — pre-select first member
  const [selectedTaskName, setSelectedTaskName] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(defaultDayOfWeek);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Custom tasks added during this session (appended as extra category)
  const [customTasks, setCustomTasks] = useState<OnboardingCatalogCategory["tasks"]>([]);

  // Custom task form
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customFrequency, setCustomFrequency] = useState("WEEKLY");
  const [customWeight, setCustomWeight] = useState("2");

  // Submitting
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedTaskName(null);
      setSelectedMemberId(members[0]?.id ?? null);
      setSelectedDayOfWeek(defaultDayOfWeek);
      setSearchQuery("");
      setExpandedCategories(new Set());
      setCustomTasks([]);
      setShowCustomForm(false);
      setCustomName("");
    }
  }, [open, defaultDayOfWeek, members]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Build full category list: onboarding catalog + household-only tasks + custom tasks
  const allCategories = useMemo(() => {
    const catalogNames = new Set(
      ONBOARDING_CATALOG.flatMap((c) => c.tasks.map((t) => t.name.toLowerCase()))
    );

    const householdOnly = existingTaskNames.filter(
      (name) => !catalogNames.has(name.toLowerCase())
    );

    const result: OnboardingCatalogCategory[] = [...ONBOARDING_CATALOG];

    if (householdOnly.length > 0) {
      result.push({
        category: "_household",
        label: "Tareas del hogar",
        icon: "🏠",
        tasks: householdOnly.map((name) => ({
          name,
          icon: "📋",
          defaultFrequency: "weekly",
          defaultWeight: 2,
          estimatedMinutes: 0,
          minAge: null,
        })),
      });
    }

    if (customTasks.length > 0) {
      result.push({
        category: "_custom",
        label: "Personalizadas",
        icon: "📋",
        tasks: customTasks,
      });
    }

    return result;
  }, [existingTaskNames, customTasks]);

  const selectedMember = members.find((m) => m.id === selectedMemberId);
  const canSubmit = selectedTaskName && selectedMemberId && !isSubmitting;
  const dayCount = Math.min(planDurationDays, 7);

  const handleSelectTask = (taskName: string) => {
    setSelectedTaskName((prev) => (prev === taskName ? null : taskName));
  };

  const handleAddCustomTask = useCallback(() => {
    const name = customName.trim();
    if (!name || name.length < 2) return;

    // Check if already exists in any category
    const exists = allCategories.some((c) =>
      c.tasks.some((t) => t.name.toLowerCase() === name.toLowerCase())
    );
    if (exists) {
      setSelectedTaskName(name);
      setShowCustomForm(false);
      setCustomName("");
      return;
    }

    setCustomTasks((prev) => [
      ...prev,
      {
        name,
        icon: "📋",
        defaultFrequency: customFrequency.toLowerCase(),
        defaultWeight: parseInt(customWeight, 10),
        estimatedMinutes: 0,
        minAge: null,
      },
    ]);

    setSelectedTaskName(name);
    setShowCustomForm(false);
    setCustomName("");
  }, [customName, customFrequency, customWeight, allCategories]);

  const handleSubmit = async () => {
    if (!selectedTaskName || !selectedMember) return;

    // Check duplicate assignment
    const key = `${selectedTaskName}|${selectedMember.id}|${selectedDayOfWeek}`;
    if (existingAssignmentKeys.has(key)) {
      toast.error("Duplicada", "Esta tarea ya está asignada a este miembro en este día");
      return;
    }

    setIsSubmitting(true);
    try {
      // If the task doesn't exist in the household yet, create it first
      const existingNamesLower = new Set(existingTaskNames.map((n) => n.toLowerCase()));
      if (!existingNamesLower.has(selectedTaskName.toLowerCase())) {
        const allTasks = allCategories.flatMap((c) => c.tasks);
        const catalogTask = allTasks.find(
          (t) => t.name.toLowerCase() === selectedTaskName.toLowerCase()
        );
        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: selectedTaskName,
            frequency: (catalogTask?.defaultFrequency ?? "weekly").toUpperCase(),
            weight: catalogTask?.defaultWeight ?? 2,
          }),
        });
        if (!response.ok) {
          throw new Error("No se pudo crear la tarea");
        }
      }

      onAddTask({
        taskName: selectedTaskName,
        memberId: selectedMember.id,
        memberName: selectedMember.name,
        memberType: selectedMember.type,
        dayOfWeek: selectedDayOfWeek,
      });
      onOpenChange(false);
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "No se pudo agregar la tarea");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar tarea</DialogTitle>
          <DialogDescription>
            Elegí tarea, miembro y día
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar tarea"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Categories with expandable tasks */}
          <div className="max-h-[280px] space-y-3 overflow-y-auto">
            {allCategories.map((category) => {
              const filteredTasks = searchQuery
                ? category.tasks.filter((t) =>
                    t.name.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                : category.tasks;

              if (filteredTasks.length === 0) return null;

              const isExpanded = expandedCategories.has(category.category) || !!searchQuery;
              const hasSelected = filteredTasks.some((t) => t.name === selectedTaskName);

              return (
                <div key={category.category} className="rounded-2xl border p-2">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-2 py-2"
                    onClick={() => toggleCategory(category.category)}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      {category.icon} {category.label}
                      {hasSelected && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          1
                        </span>
                      )}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isExpanded && (
                    <div>
                      {filteredTasks.map((task) => {
                        const isSelected = selectedTaskName === task.name;
                        const itemData: CatalogTaskItemData = {
                          name: task.name,
                          icon: task.icon,
                          defaultFrequency: task.defaultFrequency,
                          selected: isSelected,
                        };

                        return (
                          <CatalogTaskItem
                            key={task.name}
                            task={itemData}
                            onToggle={() => handleSelectTask(task.name)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* No results */}
            {searchQuery &&
              allCategories.every((c) =>
                !c.tasks.some((t) =>
                  t.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
              ) && (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No se encontraron tareas con &quot;{searchQuery}&quot;
                </p>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setCustomName(searchQuery);
                    setShowCustomForm(true);
                    setSearchQuery("");
                  }}
                >
                  Agregar &quot;{searchQuery}&quot; como tarea personalizada
                </Button>
              </div>
            )}
          </div>

          {/* Custom task form */}
          {!showCustomForm ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowCustomForm(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Tarea personalizada
            </Button>
          ) : (
            <div className="space-y-3 rounded-2xl border p-4">
              <p className="text-sm font-medium">Tarea personalizada</p>
              <Input
                placeholder="Nombre de la tarea"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                maxLength={100}
                autoFocus
              />
              <div className="grid grid-cols-2 gap-3">
                <Select value={customFrequency} onValueChange={setCustomFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={customWeight} onValueChange={setCustomWeight}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEIGHT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowCustomForm(false); setCustomName(""); }}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddCustomTask}
                  disabled={customName.trim().length < 2}
                >
                  Agregar
                </Button>
              </div>
            </div>
          )}

          {/* Member selector */}
          <div>
            <p className="mb-2 text-sm font-medium">Asignar a</p>
            <div className="flex flex-wrap gap-2">
              {members.map((member, index) => {
                const isSelected = selectedMemberId === member.id;
                const colorIndex = index % cyclingColors.length;
                const bgColor = cyclingColors[colorIndex]!;
                const textColor = contrastText(bgColor);
                const initial = member.name.charAt(0).toUpperCase();

                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setSelectedMemberId(member.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-all",
                      isSelected
                        ? "ring-2 ring-primary ring-offset-2 bg-primary/5 font-medium"
                        : "bg-muted/50 hover:bg-muted",
                    )}
                  >
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                      style={{ backgroundColor: bgColor, color: textColor }}
                    >
                      {initial}
                    </span>
                    <span className="truncate max-w-[80px]">{member.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day selector */}
          <div>
            <p className="mb-2 text-sm font-medium">Día</p>
            <div className="flex items-center gap-1">
              {Array.from({ length: dayCount }, (_, i) => i + 1).map((dow) => {
                const isActive = dow === selectedDayOfWeek;
                return (
                  <button
                    key={dow}
                    type="button"
                    onClick={() => setSelectedDayOfWeek(dow)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
                      isActive
                        ? "bg-primary text-white"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {DAY_OF_WEEK_SHORT[dow]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Agregando...
              </>
            ) : (
              "Agregar tarea"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
