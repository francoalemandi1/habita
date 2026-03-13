"use client";

import { LoadingScreen } from "@/components/features/loading-screen";
import { OnboardingLayout } from "@/components/features/onboarding/onboarding-layout";
import { StepHeader } from "@/components/features/onboarding/step-header";
import { CatalogTaskItem } from "@/components/features/onboarding/catalog-task-item";
import { ONBOARDING_CATALOG } from "@/data/onboarding-catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InviteShareBlock } from "@/components/features/invite-share-block";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import {
  Sparkles,
  ClipboardList,
  ChefHat,
  Compass,
  Receipt,
  ShoppingCart,
  Bell,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import type { OnboardingCatalogTask } from "@/data/onboarding-catalog";

type StepId = "features" | "householdType" | "setup" | "tasks" | "creating" | "notifications" | "invite" | "join";

const PROGRESS_STEPS = ["householdType", "setup", "tasks"];

const ESSENTIAL_TASKS = new Set([
  "Lavar platos", "Limpiar cocina", "Barrer", "Sacar basura", "Hacer cama",
]);

const LOADING_MESSAGES_SOLO = [
  "Preparando tu hogar...",
  "Configurando todo...",
  "Casi listo...",
];

const LOADING_MESSAGES_SHARED = [
  "Creando tu hogar...",
  "Preparando todo para el equipo...",
  "Casi listo...",
];

// Build a flat lookup for catalog tasks
const CATALOG_FLAT = ONBOARDING_CATALOG.flatMap((c) => c.tasks);
function findCatalogTask(name: string): OnboardingCatalogTask | undefined {
  return CATALOG_FLAT.find((t) => t.name === name);
}

function OnboardingLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="h-[400px] w-full max-w-md animate-pulse rounded-2xl bg-muted" />
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
  const { isSupported: pushSupported, permission: pushPermission, subscribe: pushSubscribe } = usePushNotifications();

  const [step, setStep] = useState<StepId>("features");
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
  const [isSoloMode, setIsSoloMode] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(() => new Set(ESSENTIAL_TASKS));

  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  useEffect(() => {
    if (searchParams.get("mode") === "join") {
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

  const loadingMessages = isSoloMode ? LOADING_MESSAGES_SOLO : LOADING_MESSAGES_SHARED;

  const goToNotificationsOrDashboard = () => {
    if (pushSupported && pushPermission === "default") {
      goToStep("notifications", "forward");
    } else {
      router.refresh();
      router.push("/dashboard");
    }
  };

  const handleCreateHousehold = async () => {
    setError(null);
    goToStep("creating", "forward");
    setCreateLoading(true);
    setLoadingMessageIndex(0);

    const messageInterval = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 1500);

    try {
      const tasksToCreate = Array.from(selectedTasks).map((name) => {
        const found = findCatalogTask(name);
        return {
          name,
          frequency: found?.defaultFrequency.toUpperCase() ?? "WEEKLY",
          weight: found?.defaultWeight ?? 2,
          estimatedMinutes: found?.estimatedMinutes ?? 15,
        };
      });

      const res = await fetch("/api/households/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdName: householdName.trim() || `Casa de ${memberName.trim() || "Mi hogar"}`,
          memberName: memberName.trim() || undefined,
          memberType: "adult",
          tasks: tasksToCreate,
        }),
      });

      const data = (await res.json()) as {
        household?: { inviteCode?: string };
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Error al crear el hogar");
      }

      if (isSoloMode) {
        goToNotificationsOrDashboard();
      } else if (data.household?.inviteCode) {
        setCreatedInviteCode(data.household.inviteCode);
        goToStep("invite", "forward");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear el hogar");
      goToStep("tasks", "back");
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

      goToNotificationsOrDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al unirse");
    } finally {
      setJoinLoading(false);
    }
  };

  const handleContinueToApp = () => {
    router.refresh();
    router.push("/dashboard");
  };

  const handleToggleTask = (taskName: string) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskName)) next.delete(taskName);
      else next.add(taskName);
      return next;
    });
  };

  const stepAnimationClass = stepDirection === "forward" ? "animate-step-enter" : "animate-step-enter-reverse";

  /* ─── Step: features (intro splash) ─── */
  if (step === "features") {
    const FEATURES = [
      { icon: <ClipboardList className="size-4" />, label: "Organizá las tareas" },
      { icon: <Receipt className="size-4" />, label: "Controlá los gastos" },
      { icon: <ShoppingCart className="size-4" />, label: "Ahorrá en el super" },
      { icon: <ChefHat className="size-4" />, label: "Cociná con recetas" },
      { icon: <Compass className="size-4" />, label: "Descubrí planes" },
      { icon: <Bell className="size-4" />, label: "Notificaciones inteligentes" },
    ];

    return (
      <div key="features" className={stepAnimationClass}>
        <div className="flex min-h-screen w-full flex-col items-center bg-brand-primary-light px-6">
          <div className="flex flex-1 flex-col items-center justify-center gap-8 py-12">
            <div className="text-center">
              <h1 className="text-[80px] font-bold leading-none tracking-tighter text-brand-lime sm:text-[98px]">
                Habita
              </h1>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-base text-background/90 sm:text-lg">
                Tu hogar, coordinado
                <Sparkles className="size-4 text-brand-lime" />
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              {FEATURES.map((f) => (
                <div
                  key={f.label}
                  className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium text-white"
                >
                  {f.icon}
                  {f.label}
                </div>
              ))}
            </div>
          </div>

          <div className="w-full max-w-xs pb-12 sm:max-w-sm">
            <button
              type="button"
              onClick={() => {
                setError(null);
                goToStep("householdType", "forward");
              }}
              className="w-full rounded-full bg-white py-4 text-base font-bold text-primary transition-all duration-200 active:scale-[0.98]"
            >
              Comenzar
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
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

  /* ─── Step: householdType (solo vs shared) ─── */
  if (step === "householdType") {
    return (
      <div key="householdType" className={stepAnimationClass}>
        <OnboardingLayout
          onBack={() => { setError(null); goToStep("features", "back"); }}
          showContinue={false}
          progress={{ steps: PROGRESS_STEPS, currentStep: "householdType" }}
        >
          <div className="space-y-6">
            <StepHeader
              title="¿Cómo es tu hogar?"
              subtitle="Esto nos ayuda a personalizar tu experiencia"
            />
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  setIsSoloMode(true);
                  setError(null);
                  goToStep("setup", "forward");
                }}
                className="w-full rounded-2xl border-2 border-border bg-background p-5 text-left transition-all duration-200 hover:border-primary/50 active:scale-[0.99]"
              >
                <p className="text-base font-semibold text-foreground">Vivo solo/a</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tareas, compras, recetas y más — todo tu hogar en un solo lugar
                </p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSoloMode(false);
                  setError(null);
                  goToStep("setup", "forward");
                }}
                className="w-full rounded-2xl border-2 border-border bg-background p-5 text-left transition-all duration-200 hover:border-primary/50 active:scale-[0.99]"
              >
                <p className="text-base font-semibold text-foreground">Vivo con más personas</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tareas, gastos, compras y más — coordiná el hogar en equipo
                </p>
              </button>
            </div>
          </div>
        </OnboardingLayout>
      </div>
    );
  }

  /* ─── Step: setup (member name + household name) ─── */
  if (step === "setup") {
    return (
      <div key="setup" className={stepAnimationClass}>
        <OnboardingLayout
          onBack={() => { setError(null); goToStep("householdType", "back"); }}
          onContinue={() => { setError(null); goToStep("tasks", "forward"); }}
          continueLabel="Continuar"
          continueDisabled={!memberName.trim()}
          progress={{ steps: PROGRESS_STEPS, currentStep: "setup" }}
        >
          <div className="space-y-6">
            <StepHeader
              title="Configurá tu hogar"
              subtitle={isSoloMode ? "Dale un nombre a tu espacio" : "Datos básicos para empezar"}
            />

            <div className="space-y-1">
              <label className="text-sm text-foreground">Tu nombre</label>
              <Input
                placeholder="Ej: Franco"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                maxLength={50}
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm text-foreground">Nombre del hogar (opcional)</label>
              <Input
                placeholder={memberName ? `Casa de ${memberName}` : "Ej: Casa de los García"}
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                maxLength={50}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </OnboardingLayout>
      </div>
    );
  }

  /* ─── Step: tasks (catalog selection) ─── */
  if (step === "tasks") {
    return (
      <div key="tasks" className={stepAnimationClass}>
        <OnboardingLayout
          onBack={() => { setError(null); goToStep("setup", "back"); }}
          onContinue={handleCreateHousehold}
          continueLabel={selectedTasks.size > 0 ? `Crear mi hogar (${selectedTasks.size} tareas)` : "Crear mi hogar"}
          continueLoading={createLoading}
          progress={{ steps: PROGRESS_STEPS, currentStep: "tasks" }}
        >
          <div className="space-y-6">
            <StepHeader
              title="¿Qué tareas hacen en tu hogar?"
              subtitle="Seleccioná las que apliquen — después podés agregar más"
            />

            <div className="space-y-5">
              {ONBOARDING_CATALOG.map((category) => (
                <div key={category.category}>
                  <p className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <span>{category.icon}</span> {category.label}
                  </p>
                  <div>
                    {category.tasks.map((task) => (
                      <CatalogTaskItem
                        key={task.name}
                        task={{ ...task, selected: selectedTasks.has(task.name) }}
                        onToggle={() => handleToggleTask(task.name)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
          </div>
        </OnboardingLayout>
      </div>
    );
  }

  /* ─── Step: creating (loading) ─── */
  if (step === "creating") {
    return <LoadingScreen message={loadingMessages[loadingMessageIndex] ?? "Creando hogar..."} />;
  }

  /* ─── Step: invite (success — shared mode) ─── */
  if (step === "invite" && createdInviteCode) {
    return (
      <div key="invite" className={stepAnimationClass}>
        <OnboardingLayout
          onContinue={goToNotificationsOrDashboard}
          continueLabel="Continuar"
        >
          <div className="space-y-6">
            <StepHeader
              title="¡Hogar creado!"
              subtitle="Invitá a tu familia a unirse"
            />

            <InviteShareBlock
              inviteCode={createdInviteCode}
              householdName={householdName || memberName}
            />
          </div>
        </OnboardingLayout>
      </div>
    );
  }

  /* ─── Step: notifications (push opt-in) ─── */
  if (step === "notifications") {
    return (
      <div key="notifications" className={stepAnimationClass}>
        <OnboardingLayout showContinue={false}>
          <div className="space-y-6 py-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Bell className="size-8 text-primary" />
            </div>
            <StepHeader
              title="¿Activamos las notificaciones?"
              subtitle="Te avisamos sobre tareas pendientes, gastos compartidos y recordatorios del hogar"
            />
            <div className="space-y-3">
              <Button
                size="lg"
                className="w-full gap-2"
                onClick={async () => {
                  await pushSubscribe();
                  handleContinueToApp();
                }}
              >
                <Bell className="size-4" />
                Activar notificaciones
              </Button>
              <button
                type="button"
                onClick={handleContinueToApp}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Ahora no
              </button>
            </div>
          </div>
        </OnboardingLayout>
      </div>
    );
  }

  /* ─── Step: join ─── */
  if (step === "join") {
    return (
      <div key="join" className={stepAnimationClass}>
        <OnboardingLayout
          onBack={() => { setError(null); goToStep("features", "back"); }}
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

  return null;
}
