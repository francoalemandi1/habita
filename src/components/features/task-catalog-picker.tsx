"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CatalogTaskItem } from "@/components/features/onboarding/catalog-task-item";
import { useToast } from "@/components/ui/toast";
import { Plus, Search, X, ChevronDown, Loader2 } from "lucide-react";

import type { CatalogTaskItemData } from "@/components/features/onboarding/catalog-task-item";
import type { MemberType } from "@prisma/client";

interface CatalogCategory {
  category: string;
  label: string;
  icon: string;
  tasks: Array<{
    name: string;
    icon: string;
    defaultFrequency: string;
    defaultWeight: number;
    estimatedMinutes: number | null;
    minAge: number | null;
  }>;
}

interface PlanModeConfig {
  /** The member this picker will assign tasks to (no member selector shown) */
  member: { id: string; name: string; type: MemberType };
  existingAssignmentKeys: Set<string>;
  onAddToPlan: (taskName: string, memberId: string, memberName: string, memberType: MemberType) => void;
}

interface TaskCatalogPickerProps {
  existingTaskNames: string[];
  onTasksCreated: () => void;
  /** When provided, the picker works in "plan mode": tasks are created AND assigned to a member */
  planMode?: PlanModeConfig;
}

const FREQUENCY_MAP: Record<string, string> = {
  daily: "DAILY",
  weekly: "WEEKLY",
  biweekly: "BIWEEKLY",
  monthly: "MONTHLY",
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

export function TaskCatalogPicker({
  existingTaskNames,
  onTasksCreated,
  planMode,
}: TaskCatalogPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={planMode ? "outline" : "default"} size={planMode ? "sm" : "default"}>
          <Plus className="mr-2 h-4 w-4" />
          {planMode ? "Asignar más tareas" : "Agregar tareas"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {planMode ? `Asignar tareas a ${planMode.member.name}` : "Agregar tareas"}
          </DialogTitle>
          <DialogDescription>
            {planMode
              ? "Seleccioná tareas del catálogo para asignar"
              : "Seleccioná del catálogo o creá una tarea personalizada"}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <CatalogPickerContent
            existingTaskNames={existingTaskNames}
            planMode={planMode}
            onDone={() => {
              setOpen(false);
              onTasksCreated();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface CatalogPickerContentProps {
  existingTaskNames: string[];
  planMode?: PlanModeConfig;
  onDone: () => void;
}

function CatalogPickerContent({
  existingTaskNames,
  planMode,
  onDone,
}: CatalogPickerContentProps) {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);

  // Custom task state
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customFrequency, setCustomFrequency] = useState("WEEKLY");
  const [customWeight, setCustomWeight] = useState("2");

  const toast = useToast();
  const router = useRouter();

  const existingNamesLower = new Set(existingTaskNames.map((n) => n.toLowerCase()));

  useEffect(() => {
    fetchCatalog();
  }, []);

  const fetchCatalog = async () => {
    try {
      const response = await fetch("/api/tasks/catalog");
      if (!response.ok) return;
      const data = (await response.json()) as { categories: CatalogCategory[] };
      setCategories(data.categories);
    } catch {
      // Silently fail — user can still add custom tasks
    } finally {
      setIsLoadingCatalog(false);
    }
  };

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

  const toggleTask = (taskName: string) => {
    if (existingNamesLower.has(taskName.toLowerCase())) {
      // In plan mode, existing tasks can still be added to the plan (assigned to a member)
      if (!planMode) return;
    }
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskName)) {
        next.delete(taskName);
      } else {
        next.add(taskName);
      }
      return next;
    });
  };

  const handleAddCustomTask = useCallback(() => {
    const name = customName.trim();
    if (!name || name.length < 2) return;
    if (!planMode && existingNamesLower.has(name.toLowerCase())) {
      toast.error("Duplicada", "Ya existe una tarea con ese nombre");
      return;
    }
    if (selectedTasks.has(name)) {
      toast.info("Ya seleccionada", "Esa tarea ya está en la lista");
      return;
    }
    setSelectedTasks((prev) => new Set(prev).add(name));
    // Add to a temporary "custom" category for tracking
    setCategories((prev) => {
      const customCat = prev.find((c) => c.category === "_custom");
      if (customCat) {
        customCat.tasks.push({
          name,
          icon: "📋",
          defaultFrequency: customFrequency.toLowerCase(),
          defaultWeight: parseInt(customWeight, 10),
          estimatedMinutes: null,
          minAge: null,
        });
        return [...prev];
      }
      return [
        ...prev,
        {
          category: "_custom",
          label: "Personalizadas",
          icon: "📋",
          tasks: [{
            name,
            icon: "📋",
            defaultFrequency: customFrequency.toLowerCase(),
            defaultWeight: parseInt(customWeight, 10),
            estimatedMinutes: null,
            minAge: null,
          }],
        },
      ];
    });
    setCustomName("");
    setShowCustomForm(false);
  }, [customName, customFrequency, customWeight, existingNamesLower, planMode, selectedTasks, toast]);

  const handleSubmit = async () => {
    if (selectedTasks.size === 0) return;

    setIsCreating(true);

    const allTasks = categories.flatMap((c) => c.tasks);
    let created = 0;
    let addedToPlan = 0;

    for (const taskName of selectedTasks) {
      const isExisting = existingNamesLower.has(taskName.toLowerCase());

      // Create the task if it doesn't exist yet
      if (!isExisting) {
        const catalogTask = allTasks.find((t) => t.name === taskName);
        const frequency = catalogTask
          ? FREQUENCY_MAP[catalogTask.defaultFrequency] ?? "WEEKLY"
          : "WEEKLY";
        const weight = catalogTask?.defaultWeight ?? 2;

        try {
          const response = await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: taskName,
              frequency,
              weight,
              estimatedMinutes: catalogTask?.estimatedMinutes ?? undefined,
            }),
          });
          if (response.ok) created++;
          else continue; // Skip plan assignment if task creation failed
        } catch {
          continue;
        }
      }

      // In plan mode, add to the plan for the fixed member
      if (planMode) {
        const { id: memberId, name: memberName, type: memberType } = planMode.member;
        const assignmentKey = `${taskName}|${memberId}`;
        if (!planMode.existingAssignmentKeys.has(assignmentKey)) {
          planMode.onAddToPlan(taskName, memberId, memberName, memberType);
          addedToPlan++;
        }
      }
    }

    if (planMode) {
      const parts: string[] = [];
      if (created > 0) parts.push(`${created} tarea${created > 1 ? "s" : ""} creada${created > 1 ? "s" : ""}`);
      if (addedToPlan > 0) parts.push(`${addedToPlan} agregada${addedToPlan > 1 ? "s" : ""} al plan`);
      if (parts.length > 0) {
        toast.success("Listo", parts.join(", "));
      }
    } else if (created > 0) {
      toast.success(
        "Tareas agregadas",
        `Se ${created === 1 ? "agregó" : "agregaron"} ${created} tarea${created > 1 ? "s" : ""}`
      );
    } else {
      toast.error("Error", "No se pudieron agregar las tareas");
      setIsCreating(false);
      return;
    }

    router.refresh();
    onDone();
  };

  const selectedCount = selectedTasks.size;

  return (
    <div className="space-y-4">
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

      {/* Catalog */}
      {isLoadingCatalog ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {categories
            .filter((c) => c.category !== "_custom" || c.tasks.some((t) => selectedTasks.has(t.name)))
            .map((category) => {
              const filteredTasks = searchQuery
                ? category.tasks.filter((t) =>
                    t.name.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                : category.tasks;

              if (filteredTasks.length === 0) return null;

              const isExpanded = expandedCategories.has(category.category) || !!searchQuery;
              const selectedInCategory = filteredTasks.filter((t) => selectedTasks.has(t.name)).length;

              return (
                <div key={category.category} className="rounded-2xl border p-2">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-2 py-2"
                    onClick={() => toggleCategory(category.category)}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      {category.icon} {category.label}
                      {selectedInCategory > 0 && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          {selectedInCategory}
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
                        const isExisting = existingNamesLower.has(task.name.toLowerCase());
                        const isSelected = selectedTasks.has(task.name);

                        const itemData: CatalogTaskItemData = {
                          name: task.name,
                          icon: task.icon,
                          defaultFrequency: task.defaultFrequency,
                          selected: isSelected,
                        };

                        // In non-plan mode, existing tasks are disabled
                        if (isExisting && !planMode) {
                          return (
                            <div key={task.name} className="opacity-50 pointer-events-none">
                              <CatalogTaskItem task={{ ...itemData, selected: true }} onToggle={() => {}} />
                            </div>
                          );
                        }

                        return (
                          <CatalogTaskItem
                            key={task.name}
                            task={itemData}
                            onToggle={() => toggleTask(task.name)}
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
            categories.every((c) =>
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
      )}

      {/* Custom task form */}
      {!showCustomForm ? (
        <Button
          type="button"
          variant="outline"
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
              disabled={!customName.trim() || customName.trim().length < 2}
            >
              Agregar
            </Button>
          </div>
        </div>
      )}

      {/* Submit button */}
      {selectedCount > 0 && (
        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={isCreating}
        >
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Agregando...
            </>
          ) : planMode ? (
            `Asignar ${selectedCount} tarea${selectedCount > 1 ? "s" : ""} a ${planMode.member.name}`
          ) : (
            `Agregar ${selectedCount} tarea${selectedCount > 1 ? "s" : ""}`
          )}
        </Button>
      )}
    </div>
  );
}
