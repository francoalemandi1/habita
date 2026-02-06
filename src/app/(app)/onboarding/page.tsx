"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProgressIndicator } from "@/components/features/onboarding/progress-indicator";
import { CatalogTaskItem } from "@/components/features/onboarding/catalog-task-item";
import { ChevronRight, Plus, Check, Search, X } from "lucide-react";

type StepId = "name" | "household" | "catalog" | "frequency" | "summary" | "creating" | "invite" | "join";

interface CatalogTaskFromApi {
  name: string;
  icon: string;
  defaultFrequency: string;
  defaultWeight: number;
  estimatedMinutes: number | null;
  minAge: number | null;
}

interface CatalogTask extends CatalogTaskFromApi {
  selected: boolean;
  category?: string;
}

interface CategoryFromApi {
  category: string;
  label: string;
  icon: string;
  tasks: CatalogTaskFromApi[];
}

const STEPS_CREATE: StepId[] = ["name", "household", "catalog", "frequency", "summary", "invite"];
const STEPS_JOIN: StepId[] = ["join"];

const LOADING_MESSAGES = [
  "Distribuyendo tareas equitativamente...",
  "Balanceando cargas de trabajo...",
  "Creando tu calendario de tareas...",
  "Casi listo...",
];

const FREQUENCY_OPTIONS = [
  { value: "DAILY", label: "Diario" },
  { value: "WEEKLY", label: "Semanal" },
  { value: "BIWEEKLY", label: "Quincenal" },
  { value: "MONTHLY", label: "Mensual" },
];

function frequencyToApi(f: string): "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" {
  const map: Record<string, "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY"> = {
    daily: "DAILY",
    weekly: "WEEKLY",
    biweekly: "BIWEEKLY",
    monthly: "MONTHLY",
  };
  return map[f] ?? "WEEKLY";
}

function OnboardingLoading() {
  return (
    <div className="container flex min-h-[80vh] flex-col items-center justify-center px-4 py-6">
      <div className="w-full max-w-md space-y-6">
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingLoading />}>
      <OnboardingContent />
    </Suspense>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<StepId>("name");
  const [memberName, setMemberName] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasInviteCode, setHasInviteCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showCustomTask, setShowCustomTask] = useState(false);
  const [customTaskName, setCustomTaskName] = useState("");
  const [customTaskFrequency, setCustomTaskFrequency] = useState("WEEKLY");
  const [searchQuery, setSearchQuery] = useState("");

  const [hasChildren, setHasChildren] = useState(false);
  const [hasPets, setHasPets] = useState(false);

  // New: loading message state
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  const [catalogTasks, setCatalogTasks] = useState<Record<string, CatalogTask[]>>({});
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const hasFetchedCatalogRef = useRef(false);

  useEffect(() => {
    if (searchParams.get("mode") === "join") {
      setHasInviteCode(true);
      setStep("join");
    }
  }, [searchParams]);

  // Prefill member name from Google account
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: { name?: string | null }) => {
        if (data.name) {
          setMemberName((prev) => (prev === "" ? data.name! : prev));
        }
      })
      .catch(() => {});
  }, []);

  const steps = hasInviteCode ? STEPS_JOIN : STEPS_CREATE;
  const currentStepIndex = steps.indexOf(step);
  const stepsForProgress = steps;

  const fetchCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      // Use AI-enhanced task suggestions based on household context
      const res = await fetch("/api/ai/suggest-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hasChildren,
          hasPets,
        }),
      });

      if (!res.ok) {
        // Fallback to static catalog
        const fallbackRes = await fetch("/api/tasks/catalog");
        if (!fallbackRes.ok) throw new Error("Error al cargar catálogo");
        const data = (await fallbackRes.json()) as { categories: CategoryFromApi[] };
        const byCategory: Record<string, CatalogTask[]> = {};
        let firstCategory: string | null = null;
        for (const cat of data.categories) {
          byCategory[cat.category] = cat.tasks.map((t) => ({
            ...t,
            selected: false,
            category: cat.category,
          }));
          if (!firstCategory) firstCategory = cat.category;
        }
        setCatalogTasks(byCategory);
        if (firstCategory) setExpandedCategory(firstCategory);
        return;
      }

      const data = (await res.json()) as {
        categories: Array<{
          name: string;
          label: string;
          icon: string;
          tasks: Array<{
            name: string;
            frequency: string;
            icon: string;
            estimatedMinutes: number;
            weight: number;
          }>;
        }>;
        insights: string[];
      };

      const byCategory: Record<string, CatalogTask[]> = {};
      let firstCategory: string | null = null;

      for (const cat of data.categories) {
        byCategory[cat.name] = cat.tasks.map((t) => ({
          name: t.name,
          icon: t.icon,
          defaultFrequency: t.frequency.toLowerCase(),
          defaultWeight: t.weight,
          estimatedMinutes: t.estimatedMinutes,
          minAge: null,
          selected: false,
          category: cat.name,
        }));
        if (!firstCategory) firstCategory = cat.name;
      }

      setCatalogTasks(byCategory);
      if (firstCategory) setExpandedCategory(firstCategory);
    } catch {
      setError("No se pudo cargar el catálogo de tareas");
    } finally {
      setCatalogLoading(false);
    }
  }, [hasChildren, hasPets]);

  useEffect(() => {
    if (step !== "catalog") {
      hasFetchedCatalogRef.current = false;
      return;
    }
    if (hasFetchedCatalogRef.current) return;
    hasFetchedCatalogRef.current = true;
    fetchCatalog();
  }, [step, fetchCatalog]);

  const selectedCount = Object.values(catalogTasks).flat().filter((t) => t.selected).length;

  const handleNextFromName = () => {
    setError(null);
    if (hasInviteCode) {
      setStep("join");
    } else {
      setStep("household");
    }
  };

  const handleBackToName = () => {
    setError(null);
    setHasInviteCode(false);
    setStep("name");
  };

  const handleHouseholdNext = () => {
    setError(null);
    setStep("catalog");
  };

  const handleHouseholdBack = () => {
    setError(null);
    setStep("name");
  };

  const handleCatalogNext = () => {
    if (selectedCount === 0) {
      setError("Selecciona al menos una tarea");
      return;
    }
    setError(null);
    setStep("frequency");
  };

  const handleCatalogBack = () => {
    setError(null);
    setStep("household");
  };

  const handleFrequencyNext = () => {
    setError(null);
    setStep("summary");
  };

  const handleFrequencyBack = () => {
    setError(null);
    setStep("catalog");
  };

  const handleSummaryBack = () => {
    setError(null);
    setStep("frequency");
  };

  const updateTaskFrequency = (category: string, taskName: string, newFrequency: string) => {
    setCatalogTasks((prev) => {
      const cat = prev[category];
      if (!cat) return prev;
      return {
        ...prev,
        [category]: cat.map((t) =>
          t.name === taskName ? { ...t, defaultFrequency: newFrequency.toLowerCase() } : t
        ),
      };
    });
  };

  const toggleTask = (category: string, taskName: string) => {
    setCatalogTasks((prev) => {
      const cat = prev[category];
      if (!cat) return prev;
      return {
        ...prev,
        [category]: cat.map((t) =>
          t.name === taskName ? { ...t, selected: !t.selected } : t
        ),
      };
    });
  };

  const addCustomTask = () => {
    const name = customTaskName.trim();
    if (!name) return;
    const task: CatalogTask = {
      name,
      icon: "📋",
      defaultFrequency: customTaskFrequency.toLowerCase(),
      defaultWeight: 2,
      estimatedMinutes: 15,
      minAge: null,
      selected: true,
      category: "other",
    };
    setCatalogTasks((prev) => {
      const other = prev.other ?? [];
      return {
        ...prev,
        other: [...other, task],
      };
    });
    setCustomTaskName("");
    setCustomTaskFrequency("WEEKLY");
    setShowCustomTask(false);
  };

  const handleCreateHousehold = async () => {
    setError(null);
    setStep("creating");
    setCreateLoading(true);
    setLoadingMessageIndex(0);

    // Rotate loading messages
    const messageInterval = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 1500);

    try {
      const tasksPayload = Object.entries(catalogTasks).flatMap(([cat, tasks]) =>
        tasks
          .filter((t) => t.selected)
          .map((t) => ({
            name: t.name,
            category: cat,
            frequency: frequencyToApi(t.defaultFrequency),
            weight: t.defaultWeight ?? 2,
            estimatedMinutes: t.estimatedMinutes ?? undefined,
          }))
      );

      // Add minimum delay for UX
      const [res] = await Promise.all([
        fetch("/api/households/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            householdName: householdName.trim() || `${memberName.trim()}'s Home`,
            memberName: memberName.trim() || undefined,
            memberType: "adult",
            tasks: tasksPayload,
          }),
        }),
        new Promise((resolve) => setTimeout(resolve, 3000)), // Minimum 3s for anticipation
      ]);

      const data = (await res.json()) as {
        household?: { inviteCode?: string };
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Error al crear el hogar");
      }

      if (data.household?.inviteCode) {
        setCreatedInviteCode(data.household.inviteCode);
        setStep("invite");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear el hogar");
      setStep("summary"); // Go back to summary on error
    } finally {
      clearInterval(messageInterval);
      setCreateLoading(false);
    }
  };

  const handleJoinHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = inviteCode.trim().toUpperCase().slice(0, 8);
    if (!code) {
      setError("Ingresa el código de invitación");
      return;
    }
    setError(null);
    setJoinLoading(true);
    try {
      const res = await fetch("/api/households/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode: code,
          memberName: memberName.trim(),
          memberType: "adult",
        }),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "Error al unirse");
      }

      router.refresh();
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al unirse");
    } finally {
      setJoinLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!createdInviteCode) return;
    try {
      await navigator.clipboard.writeText(createdInviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("No se pudo copiar");
    }
  };

  const handleContinueToApp = () => {
    router.refresh();
    router.push("/dashboard");
  };

  const maxW = "max-w-md";
  const inputClass = "rounded-xl border-2";

  return (
    <div className="container flex min-h-[80vh] flex-col items-center justify-center px-4 py-6 sm:py-8">
      <div className={`w-full ${maxW} space-y-6`}>
        {/* Step: name (welcome screen for CREATE flow) */}
        {step === "name" && (
          <Card>
            <CardHeader className="space-y-1 text-center">
              <ProgressIndicator steps={stepsForProgress} currentStep={step} />
              <CardTitle className="text-2xl">Bienvenido!</CardTitle>
              <CardDescription>
                Configura las tareas de tu hogar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button
                type="button"
                className="w-full"
                onClick={handleNextFromName}
              >
                Continuar
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
              <div className="border-t pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => {
                    setError(null);
                    setHasInviteCode(true);
                    setStep("join");
                  }}
                >
                  Tengo un código de invitación
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: household */}
        {step === "household" && (
          <Card>
            <CardHeader className="space-y-1 text-center">
              <ProgressIndicator steps={stepsForProgress} currentStep={step} />
              <CardTitle className="text-2xl">Nombre del Hogar</CardTitle>
              <CardDescription>
                ¿Cómo se llama tu hogar?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder={`ej., Casa de ${memberName || "..."}`}
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleHouseholdNext())}
                className={inputClass}
                maxLength={50}
              />
              <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={hasChildren}
                    onChange={(e) => setHasChildren(e.target.checked)}
                    className="h-5 w-5 rounded border-2"
                  />
                  <span>Hay niños en el hogar</span>
                </label>
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={hasPets}
                    onChange={(e) => setHasPets(e.target.checked)}
                    className="h-5 w-5 rounded border-2"
                  />
                  <span>Hay mascotas</span>
                </label>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleHouseholdBack}>
                  Volver
                </Button>
                <Button type="button" onClick={handleHouseholdNext}>
                  Continuar
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: catalog */}
        {step === "catalog" && (
          <Card className="flex max-h-[85vh] flex-col">
            <CardHeader className="shrink-0 space-y-1 text-center">
              <ProgressIndicator steps={stepsForProgress} currentStep={step} />
              <CardTitle className="text-2xl">Selecciona Tareas</CardTitle>
              <CardDescription>
                Elige las tareas de tu hogar
              </CardDescription>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {/* Search input */}
              <div className="relative mb-4 shrink-0">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar tareas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pl-9 ${inputClass}`}
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

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
                {catalogLoading ? (
                  <p className="text-center text-muted-foreground">
                    Generando sugerencias personalizadas...
                  </p>
                ) : (
                  <>
                    {Object.entries(catalogTasks)
                      .map(([categoryKey, tasks]) => {
                        // Filter tasks by search query
                        const filteredTasks = searchQuery
                          ? tasks.filter((t) =>
                              t.name.toLowerCase().includes(searchQuery.toLowerCase())
                            )
                          : tasks;
                        return { categoryKey, tasks, filteredTasks };
                      })
                      .filter(({ filteredTasks }) => filteredTasks.length > 0)
                      .map(({ categoryKey, tasks, filteredTasks }) => {
                        const total = filteredTasks.length;
                        const selected = filteredTasks.filter((t) => t.selected).length;
                        const meta = categoryKey === "other" ? { label: "Otros", icon: "📋" } : { label: categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1), icon: tasks[0]?.icon ?? "📋" };
                        const isExpanded = expandedCategory === categoryKey || !!searchQuery;

                      return (
                        <div key={categoryKey} className="rounded-xl border bg-card">
                          <button
                            type="button"
                            className="flex w-full items-center justify-between p-4 text-left"
                            onClick={() =>
                              setExpandedCategory(isExpanded ? null : categoryKey)
                            }
                          >
                            <span className="flex items-center gap-2">
                              <span className="text-xl">{meta.icon}</span>
                              <span className="font-medium">{meta.label}</span>
                              <span className="text-sm text-muted-foreground">
                                {selected}/{total}
                              </span>
                            </span>
                            <ChevronRight
                              className={`h-5 w-5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                            />
                          </button>
                          {isExpanded && (
                            <div className="space-y-2 border-t px-4 pb-4 pt-2">
                              {filteredTasks.map((t) => (
                                <CatalogTaskItem
                                  key={t.name + categoryKey}
                                  task={t}
                                  onToggle={() => toggleTask(categoryKey, t.name)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* No results message */}
                    {searchQuery && Object.entries(catalogTasks).every(([, tasks]) =>
                      !tasks.some((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    ) && (
                      <div className="py-8 text-center">
                        <p className="text-muted-foreground">No se encontraron tareas con "{searchQuery}"</p>
                        <Button
                          type="button"
                          variant="link"
                          onClick={() => {
                            setCustomTaskName(searchQuery);
                            setShowCustomTask(true);
                            setSearchQuery("");
                          }}
                        >
                          Agregar "{searchQuery}" como tarea personalizada
                        </Button>
                      </div>
                    )}

                    {!showCustomTask ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowCustomTask(true)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar tarea personalizada
                      </Button>
                    ) : (
                      <div className="space-y-2 rounded-xl border bg-card p-4">
                        <Input
                          placeholder="Nombre de la tarea"
                          value={customTaskName}
                          onChange={(e) => setCustomTaskName(e.target.value)}
                          className={inputClass}
                        />
                        <Select
                          value={customTaskFrequency}
                          onValueChange={setCustomTaskFrequency}
                        >
                          <SelectTrigger className={inputClass}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FREQUENCY_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setShowCustomTask(false);
                              setCustomTaskName("");
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            onClick={addCustomTask}
                            disabled={!customTaskName.trim()}
                          >
                            Agregar
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              {error && (
                <p className="shrink-0 text-sm text-destructive">{error}</p>
              )}
              <div className="mt-4 flex shrink-0 gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={handleCatalogBack}>
                  Volver
                </Button>
                <Button
                  type="button"
                  onClick={handleCatalogNext}
                  disabled={selectedCount === 0}
                >
                  Continuar ({selectedCount} tareas)
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: frequency */}
        {step === "frequency" && (
          <Card className="flex max-h-[85vh] flex-col">
            <CardHeader className="shrink-0 space-y-1 text-center">
              <ProgressIndicator steps={stepsForProgress} currentStep={step} />
              <CardTitle className="text-2xl">Frecuencia de tareas</CardTitle>
              <CardDescription>
                ¿Cada cuánto se hace cada tarea?
              </CardDescription>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-4">
                {Object.entries(catalogTasks).flatMap(([categoryKey, tasks]) =>
                  tasks
                    .filter((t) => t.selected)
                    .map((t) => (
                      <div
                        key={t.name + categoryKey}
                        className="flex items-center justify-between gap-2 rounded-xl border bg-card p-3"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span>{t.icon}</span>
                          <span className="truncate font-medium">{t.name}</span>
                        </span>
                        <Select
                          value={frequencyToApi(t.defaultFrequency)}
                          onValueChange={(v) => updateTaskFrequency(categoryKey, t.name, v)}
                        >
                          <SelectTrigger className="w-[120px] shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FREQUENCY_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))
                )}
              </div>
              {error && (
                <p className="shrink-0 text-sm text-destructive">{error}</p>
              )}
              <div className="mt-4 flex shrink-0 gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={handleFrequencyBack}>
                  Volver
                </Button>
                <Button type="button" onClick={handleFrequencyNext}>
                  Continuar
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: summary */}
        {step === "summary" && (
          <Card className="flex max-h-[85vh] flex-col">
            <CardHeader className="shrink-0 space-y-1 text-center">
              <ProgressIndicator steps={stepsForProgress} currentStep={step} />
              <CardTitle className="text-2xl">Resumen</CardTitle>
              <CardDescription>
                Revisa que todo esté correcto
              </CardDescription>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
                {/* Household info */}
                <div className="rounded-xl border bg-muted/30 p-4">
                  <h3 className="mb-2 flex items-center gap-2 font-semibold">
                    <span className="text-xl">🏠</span>
                    {householdName || `${memberName}'s Home`}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {hasChildren && "👶 Con niños"}
                    {hasChildren && hasPets && " · "}
                    {hasPets && "🐕 Con mascotas"}
                    {!hasChildren && !hasPets && "🏠 Hogar"}
                  </p>
                </div>

                {/* Tasks summary */}
                <div className="rounded-xl border bg-muted/30 p-4">
                  <h3 className="mb-3 font-semibold">Tareas configuradas ({selectedCount})</h3>
                  <div className="space-y-2">
                    {Object.entries(catalogTasks)
                      .flatMap(([, tasks]) => tasks.filter((t) => t.selected))
                      .slice(0, 5)
                      .map((t) => (
                        <div key={t.name} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span>{t.icon}</span>
                            <span>{t.name}</span>
                          </span>
                          <span className="text-muted-foreground">
                            {FREQUENCY_OPTIONS.find((f) => f.value === frequencyToApi(t.defaultFrequency))?.label}
                          </span>
                        </div>
                      ))}
                    {selectedCount > 5 && (
                      <p className="text-sm text-muted-foreground">
                        ... y {selectedCount - 5} tareas más
                      </p>
                    )}
                  </div>
                </div>

                {/* Info box */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
                  <p className="text-sm">
                    La asignación automática de tareas se realizará cada domingo a las 20:00
                  </p>
                </div>
              </div>
              {error && (
                <p className="shrink-0 text-sm text-destructive">{error}</p>
              )}
              <div className="mt-4 flex shrink-0 gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={handleSummaryBack}>
                  Volver
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateHousehold}
                  disabled={createLoading}
                >
                  Crear mi hogar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: creating (loading) */}
        {step === "creating" && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="mb-6 flex justify-center">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
              <p className="text-lg font-medium">{LOADING_MESSAGES[loadingMessageIndex]}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Esto solo tomará unos segundos
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step: join */}
        {step === "join" && (
          <Card>
            <CardHeader className="space-y-1 text-center">
              <ProgressIndicator steps={stepsForProgress} currentStep={step} />
              <CardTitle className="text-2xl">Unirse al Hogar</CardTitle>
              <CardDescription>
                Ingresa tu nombre y el código de invitación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoinHousehold} className="space-y-4">
                <Input
                  placeholder="Tu nombre"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  className={inputClass}
                  maxLength={50}
                  autoFocus
                />
                <Input
                  placeholder="CODIGO"
                  value={inviteCode}
                  onChange={(e) =>
                    setInviteCode(e.target.value.toUpperCase().slice(0, 8))
                  }
                  className={`font-mono text-center text-lg tracking-widest ${inputClass}`}
                  maxLength={8}
                />
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBackToName}
                    disabled={joinLoading}
                  >
                    Volver
                  </Button>
                  <Button
                    type="submit"
                    disabled={!memberName.trim() || !inviteCode.trim() || joinLoading}
                  >
                    {joinLoading ? "Uniendo..." : "Unirse"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step: invite (success) */}
        {step === "invite" && createdInviteCode && (
          <Card>
            <CardHeader className="space-y-1 text-center">
              <ProgressIndicator steps={stepsForProgress} currentStep={step} />
              <div className="flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                  <Check className="h-8 w-8" />
                </div>
              </div>
              <CardTitle className="text-2xl">Hogar Creado!</CardTitle>
              <CardDescription>
                Comparte este código con tu familia
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-xl border-2 bg-muted/30 p-4 text-center">
                <span className="font-mono text-2xl tracking-[0.3em]">
                  {createdInviteCode}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleCopyCode}
              >
                {copied ? "Copiado!" : "Copiar Código"}
              </Button>
              <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
                <p className="text-sm font-medium text-center">Empezás en Nivel 1</p>
                <p className="text-xs text-muted-foreground text-center">
                  Completá tareas para ganar puntos, subir de nivel y desbloquear logros junto a tu familia.
                </p>
              </div>
              <Button
                type="button"
                className="w-full"
                onClick={handleContinueToApp}
              >
                Continuar a la App
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
