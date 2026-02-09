"use client";

import { LoadingScreen } from "@/components/features/loading-screen";
import { CatalogTaskItem } from "@/components/features/onboarding/catalog-task-item";
import { OnboardingLayout } from "@/components/features/onboarding/onboarding-layout";
import { useGeolocation } from "@/hooks/use-geolocation";
import { StepHeader } from "@/components/features/onboarding/step-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, ChevronDown, Plus, Search, Sparkles, User, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Skeleton className="h-[400px] w-full max-w-md rounded-2xl" />
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
  const { location: geoLocation } = useGeolocation();

  const [step, setStep] = useState<StepId>("name");
  const [stepDirection, setStepDirection] = useState<"forward" | "back">("forward");

  const goToStep = (nextStep: StepId, direction: "forward" | "back" = "forward") => {
    setStepDirection(direction);
    setStep(nextStep);
  };
  const [memberName, setMemberName] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasInviteCode, setHasInviteCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCustomTask, setShowCustomTask] = useState(false);
  const [customTaskName, setCustomTaskName] = useState("");
  const [customTaskFrequency, setCustomTaskFrequency] = useState("WEEKLY");
  const [searchQuery, setSearchQuery] = useState("");

  const [hasChildren, setHasChildren] = useState(false);
  const [hasPets, setHasPets] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  const [catalogTasks, setCatalogTasks] = useState<Record<string, CatalogTask[]>>({});
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [showAllSummaryTasks, setShowAllSummaryTasks] = useState(false);
  const hasFetchedCatalogRef = useRef(false);

  useEffect(() => {
    if (searchParams.get("mode") === "join") {
      setHasInviteCode(true);
      goToStep("join", "forward");
    }
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: { name?: string | null; hasMembership?: boolean }) => {
        if (data.hasMembership) {
          router.replace("/dashboard");
          return;
        }
        if (data.name) {
          setMemberName((prev) => (prev === "" ? data.name! : prev));
        }
      })
      .catch(() => {});
  }, [router]);

  const steps = hasInviteCode ? STEPS_JOIN : STEPS_CREATE;

  const fetchCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const res = await fetch("/api/ai/suggest-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hasChildren,
          hasPets,
        }),
      });

      if (!res.ok) {
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
      goToStep("join", "forward");
    } else {
      goToStep("household", "forward");
    }
  };

  const handleBackToName = () => {
    setError(null);
    setHasInviteCode(false);
    goToStep("name", "back");
  };

  const handleHouseholdNext = () => {
    setError(null);
    goToStep("catalog", "forward");
  };

  const handleHouseholdBack = () => {
    setError(null);
    goToStep("name", "back");
  };

  const handleCatalogNext = () => {
    if (selectedCount === 0) {
      setError("Selecciona al menos una tarea");
      return;
    }
    setError(null);
    goToStep("frequency", "forward");
  };

  const handleCatalogBack = () => {
    setError(null);
    goToStep("household", "back");
  };

  const handleFrequencyNext = () => {
    setError(null);
    goToStep("summary", "forward");
  };

  const handleFrequencyBack = () => {
    setError(null);
    goToStep("catalog", "back");
  };

  const handleSummaryBack = () => {
    setError(null);
    goToStep("frequency", "back");
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
    goToStep("creating", "forward");
    setCreateLoading(true);
    setLoadingMessageIndex(0);

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

      const [res] = await Promise.all([
        fetch("/api/households/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            householdName: householdName.trim() || `${memberName.trim()}'s Home`,
            memberName: memberName.trim() || undefined,
            memberType: "adult",
            tasks: tasksPayload,
            ...(geoLocation && geoLocation.latitude !== 0 && {
              location: {
                latitude: geoLocation.latitude,
                longitude: geoLocation.longitude,
                timezone: geoLocation.timezone,
                country: geoLocation.country,
                city: geoLocation.city,
              },
            }),
          }),
        }),
        new Promise((resolve) => setTimeout(resolve, 3000)),
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
        goToStep("invite", "forward");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear el hogar");
      goToStep("summary", "back");
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

  const stepAnimationClass = stepDirection === "forward" ? "animate-step-enter" : "animate-step-enter-reverse";

  /* ─── Step: name (welcome / start screen) ─── */
  if (step === "name") {
    return (
      <div key="name" className={stepAnimationClass}>
        <div className="flex min-h-screen w-full flex-col items-center bg-[#626efe] px-6">
          {/* Logo — centrado verticalmente */}
          <div className="flex flex-1 flex-col items-center justify-center">
            <h1 className="text-[98px] font-bold leading-none tracking-tighter text-[#d2ffa0]">
              Hábita
            </h1>
            <p className="mt-3 flex items-center gap-1.5 text-lg text-[#fff7ea]">
              Que las tareas no sean el problema
              <Sparkles className="size-4 text-[#d2ffa0]" />
            </p>
          </div>

          {/* Botones — empujados al fondo */}
          <div className="w-full max-w-xs pb-12 sm:max-w-sm">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setHasInviteCode(false);
                goToStep("household", "forward");
              }}
              className="w-full rounded-full bg-white py-4 text-base font-bold text-[#5260fe] transition-all duration-200 active:scale-[0.98]"
            >
              Crear hogar
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setHasInviteCode(true);
                goToStep("join", "forward");
              }}
              className="mt-4 w-full rounded-full border-2 border-white bg-transparent py-4 text-base font-bold text-white transition-all duration-200 active:scale-[0.98]"
            >
              Tengo un código de invitación
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Step: household ─── */
  if (step === "household") {
    return (
      <div key="household" className={stepAnimationClass}>
      <OnboardingLayout
        onBack={handleHouseholdBack}
        onContinue={handleHouseholdNext}
        continueLabel="Continuar"
      >
        <div className="space-y-6">
          <StepHeader
            title="Nombre del hogar"
            subtitle="Sirve para identificar el grupo"
          />
          <div className="space-y-1">
            <label className="text-sm text-foreground">Nombre del hogar</label>
            <Input
              placeholder={`ej. Casa de ${memberName || "Pepito"}`}
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleHouseholdNext())}
              maxLength={50}
            />
          </div>

          {/* Sobre el grupo */}
          <div className="space-y-2 pt-2">
            <StepHeader
              title="Sobre el grupo"
              subtitle="¿Cómo está compuesto?"
            />
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center gap-3 py-3">
                <Checkbox
                  checked={hasChildren}
                  onCheckedChange={(checked) => setHasChildren(checked)}
                />
                <span className="text-base">Hay niños</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 py-3">
                <Checkbox
                  checked={hasPets}
                  onCheckedChange={(checked) => setHasPets(checked)}
                />
                <span className="text-base">Hay mascotas</span>
              </label>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </OnboardingLayout>
      </div>
    );
  }

  /* ─── Step: catalog ─── */
  if (step === "catalog") {
    return (
      <div key="catalog" className={stepAnimationClass}>
      <OnboardingLayout
        onBack={handleCatalogBack}
        onContinue={handleCatalogNext}
        continueLabel={`Continuar (${selectedCount} tareas)`}
        continueDisabled={selectedCount === 0}
      >
        <div className="flex flex-col gap-4">
          <StepHeader
            title="Selección de tareas"
            subtitle="Elige las tareas de tu hogar"
          />

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar tarea"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {catalogLoading ? (
            <p className="py-8 text-center text-muted-foreground">
              Generando sugerencias personalizadas...
            </p>
          ) : (
            <div className="space-y-6">
              {Object.entries(catalogTasks)
                .map(([categoryKey, tasks]) => {
                  const filteredTasks = searchQuery
                    ? tasks.filter((t) =>
                        t.name.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                    : tasks;
                  return { categoryKey, tasks, filteredTasks };
                })
                .filter(({ filteredTasks }) => filteredTasks.length > 0)
                .map(({ categoryKey, tasks, filteredTasks }) => {
                  const meta = categoryKey === "other"
                    ? { label: "Otros", icon: "📋" }
                    : { label: categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1), icon: tasks[0]?.icon ?? "📋" };
                  const isExpanded = expandedCategories.has(categoryKey) || !!searchQuery;
                  const selectedInCategory = filteredTasks.filter((t) => t.selected).length;

                  return (
                    <div key={categoryKey} className="rounded-2xl border border-primary p-3">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between px-1 py-2"
                        onClick={() => {
                          setExpandedCategories((prev) => {
                            const next = new Set(prev);
                            if (next.has(categoryKey)) {
                              next.delete(categoryKey);
                            } else {
                              next.add(categoryKey);
                            }
                            return next;
                          });
                        }}
                      >
                        <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          {meta.icon} {meta.label}
                          {selectedInCategory > 0 && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                              {selectedInCategory}
                            </span>
                          )}
                        </span>
                        <ChevronDown
                          className={`size-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </button>
                      {isExpanded && (
                        <div>
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

              {/* No results */}
              {searchQuery && Object.entries(catalogTasks).every(([, tasks]) =>
                !tasks.some((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
              ) && (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">No se encontraron tareas con &quot;{searchQuery}&quot;</p>
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => {
                      setCustomTaskName(searchQuery);
                      setShowCustomTask(true);
                      setSearchQuery("");
                    }}
                  >
                    Agregar &quot;{searchQuery}&quot; como tarea personalizada
                  </Button>
                </div>
              )}

              {/* Custom task */}
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
                <div className="space-y-3 rounded-full p-4">
                  <Input
                    placeholder="Nombre de la tarea"
                    value={customTaskName}
                    onChange={(e) => setCustomTaskName(e.target.value)}
                  />
                  <Select
                    value={customTaskFrequency}
                    onValueChange={setCustomTaskFrequency}
                  >
                    <SelectTrigger className="rounded-full">
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
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </OnboardingLayout>
      </div>
    );
  }

  /* ─── Step: frequency ─── */
  if (step === "frequency") {
    return (
      <div key="frequency" className={stepAnimationClass}>
      <OnboardingLayout
        onBack={handleFrequencyBack}
        onContinue={handleFrequencyNext}
        continueLabel="Continuar"
      >
        <div className="space-y-4">
          <StepHeader
            title="Frecuencia de tareas"
            subtitle="¿Cada cuánto se hace cada tarea?"
          />
          <div className="rounded-2xl border border-primary p-3 space-y-1">
            {Object.entries(catalogTasks).flatMap(([categoryKey, tasks]) =>
              tasks
                .filter((t) => t.selected)
                .map((t) => (
                  <div
                    key={t.name + categoryKey}
                    className="flex w-full items-center gap-3 px-3 py-3"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                      {t.icon}
                    </span>
                    <span className="min-w-0 flex-1 text-base text-foreground">
                      {t.name}
                    </span>
                    <Select
                      value={frequencyToApi(t.defaultFrequency)}
                      onValueChange={(v) => updateTaskFrequency(categoryKey, t.name, v)}
                    >
                      <SelectTrigger className="h-9 w-[120px] shrink-0 border-none bg-transparent px-0 text-sm text-muted-foreground shadow-none">
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
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </OnboardingLayout>
      </div>
    );
  }

  /* ─── Step: summary ─── */
  if (step === "summary") {
    const allSelectedTasks = Object.entries(catalogTasks).flatMap(([, tasks]) =>
      tasks.filter((t) => t.selected)
    );
    const visibleTasks = showAllSummaryTasks ? allSelectedTasks : allSelectedTasks.slice(0, 5);

    return (
      <div key="summary" className={stepAnimationClass}>
      <OnboardingLayout
        onBack={handleSummaryBack}
        onContinue={handleCreateHousehold}
        continueLabel="Crear hogar"
        continueLoading={createLoading}
      >
        <div className="space-y-5">
          <StepHeader
            title="Resumen"
            subtitle="Revisá que la información sea correcta"
          />

          {/* Card 1: Household info */}
          <div className="rounded-[32px] bg-[#e4d5ff] p-5">
            <p className="text-lg font-semibold text-foreground">
              {householdName || `${memberName}'s Home`}
            </p>
            <div className="mt-2 flex items-center gap-2 text-sm text-foreground/70">
              <User className="size-4" />
              <span>
                {hasPets && "Con mascotas"}
                {hasPets && hasChildren && " · "}
                {hasChildren && "Con niños"}
                {!hasChildren && !hasPets && "Hogar"}
              </span>
            </div>
          </div>

          {/* Card 2: Tasks */}
          <div className="rounded-[32px] bg-white p-5 shadow-sm">
            <p className="mb-4 font-semibold text-foreground">
              Tareas configuradas ({selectedCount})
            </p>
            <div className="space-y-3">
              {visibleTasks.map((t) => (
                <div key={t.name} className="flex items-center gap-3">
                  <span className="text-xl">{t.icon}</span>
                  <span className="flex-1 text-sm text-foreground">{t.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {FREQUENCY_OPTIONS.find((f) => f.value === frequencyToApi(t.defaultFrequency))?.label}
                  </span>
                </div>
              ))}
            </div>
            {allSelectedTasks.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllSummaryTasks(!showAllSummaryTasks)}
                className="mt-4 flex w-full items-center justify-center gap-1.5 text-sm font-medium text-primary"
              >
                {showAllSummaryTasks ? "Ver menos" : `Ver más tareas`}
                <ChevronDown
                  className={`size-4 transition-transform ${showAllSummaryTasks ? "rotate-180" : ""}`}
                />
              </button>
            )}
          </div>

          {/* Card 3: Info notice */}
          <div className="rounded-[24px] bg-[#fff0d7] px-5 py-4 text-center">
            <p className="text-sm text-foreground/80">
              La asignación automática de tareas se realizará cada domingo a las 20:00
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </OnboardingLayout>
      </div>
    );
  }

  /* ─── Step: creating (loading) ─── */
  if (step === "creating") {
    return <LoadingScreen message={LOADING_MESSAGES[loadingMessageIndex] ?? "Creando hogar..."} />;
  }

  /* ─── Step: join ─── */
  if (step === "join") {
    return (
      <div key="join" className={stepAnimationClass}>
      <OnboardingLayout
        onBack={handleBackToName}
        showContinue={false}
      >
        <div className="space-y-4">
          <StepHeader
            title="Unirse al Hogar"
            subtitle="Ingresa tu nombre y el código de invitación"
          />
          <form onSubmit={handleJoinHousehold} className="space-y-4">
            <Input
              placeholder="Tu nombre"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              maxLength={50}
              autoFocus
            />
            <Input
              placeholder="CODIGO"
              value={inviteCode}
              onChange={(e) =>
                setInviteCode(e.target.value.toUpperCase().slice(0, 8))
              }
              className="font-mono text-center text-lg tracking-widest"
              maxLength={8}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={!memberName.trim() || !inviteCode.trim() || joinLoading}
            >
              {joinLoading ? "Uniendo..." : "Unirse"}
            </Button>
          </form>
        </div>
      </OnboardingLayout>
      </div>
    );
  }

  /* ─── Step: invite (success) ─── */
  if (step === "invite" && createdInviteCode) {
    return (
      <div key="invite" className={stepAnimationClass}>
      <OnboardingLayout
        onContinue={handleContinueToApp}
        continueLabel="Continuar a la app"
      >
        <div className="space-y-6">
          <StepHeader
            title="¡Hogar creado!"
            subtitle="Compartí este código con otras personas"
          />

          {/* Invite code card */}
          <div className="rounded-[32px] bg-[#d2ffa0] px-6 py-8 text-center">
            <span className="font-mono text-3xl font-bold tracking-[0.3em] text-foreground">
              {createdInviteCode}
            </span>
          </div>

          {/* Copy button */}
          <Button
            type="button"
            variant="outline"
            className="w-full border-2 border-primary text-primary hover:bg-primary/5 hover:text-primary"
            onClick={handleCopyCode}
          >
            {copied ? "¡Copiado!" : "Copiar código"}
          </Button>
        </div>
      </OnboardingLayout>
      </div>
    );
  }

  return null;
}
