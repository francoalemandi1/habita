"use client";

import { LoadingScreen } from "@/components/features/loading-screen";
import { OnboardingLayout } from "@/components/features/onboarding/onboarding-layout";
import { StepHeader } from "@/components/features/onboarding/step-header";
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
  CheckCircle2,
  Lightbulb,
  CalendarDays,
  MapPin,
} from "lucide-react";
import { CityTypeahead } from "@/components/ui/city-typeahead";
import type { CityResult } from "@/components/ui/city-typeahead";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { ONBOARDING_CATALOG } from "@/data/onboarding-catalog";
import type { OnboardingCatalogTask } from "@/data/onboarding-catalog";

import type { OnboardingSetupResponse } from "@habita/contracts";
import { buildOnboardingProfilePayload } from "@habita/domain/onboarding-profile";

type StepId = "features" | "householdType" | "setup" | "location" | "creating" | "ready" | "notifications" | "invite" | "join";

const PROGRESS_STEPS = ["householdType", "setup", "location"];

const ESSENTIAL_TASKS = new Set([
  "Lavar platos", "Limpiar cocina", "Barrer", "Sacar basura", "Hacer cama",
]);

const LOADING_MESSAGES_DEFAULT = [
  "Creando tu hogar...",
  "Configurando todo...",
  "Casi listo...",
];

const LOADING_MESSAGES_AI = [
  "Analizando tu hogar...",
  "Personalizando tus tareas...",
  "Preparando recomendaciones...",
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
  const [householdDescription, setHouseholdDescription] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSoloMode, setIsSoloMode] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [aiSetupResult, setAiSetupResult] = useState<OnboardingSetupResponse | null>(null);
  const [tasksCreatedCount, setTasksCreatedCount] = useState(0);
  const [citySearch, setCitySearch] = useState("");
  const [selectedCity, setSelectedCity] = useState<CityResult | null>(null);

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

  const useAiMessages = householdDescription.trim().length > 0;
  const loadingMessages = useAiMessages ? LOADING_MESSAGES_AI : LOADING_MESSAGES_DEFAULT;

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
    }, 2000);

    try {
      // Step 1: Call AI endpoint if description provided
      let aiResult: OnboardingSetupResponse | null = null;
      const description = householdDescription.trim();

      if (description) {
        try {
          const aiRes = await fetch("/api/ai/onboarding-setup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              householdDescription: description,
              isSoloMode,
              memberName: memberName.trim() || undefined,
            }),
          });
          if (aiRes.ok) {
            aiResult = (await aiRes.json()) as OnboardingSetupResponse;
          }
        } catch {
          // AI failed — continue with essential tasks
        }
      }

      // Step 2: Build tasks (AI result or fallback)
      const tasksToCreate = aiResult?.tasks?.length
        ? aiResult.tasks.map((t) => ({
            name: t.name,
            frequency: t.frequency,
            weight: t.weight,
            estimatedMinutes: t.estimatedMinutes,
          }))
        : Array.from(ESSENTIAL_TASKS).map((name) => {
            const found = findCatalogTask(name);
            return {
              name,
              frequency: found?.defaultFrequency.toUpperCase() ?? "WEEKLY",
              weight: found?.defaultWeight ?? 2,
              estimatedMinutes: found?.estimatedMinutes ?? 15,
            };
          });

      // Step 3: Build household payload with AI-inferred data
      const profile = aiResult?.householdProfile;
      const resolvedHouseholdName =
        householdName.trim() ||
        profile?.suggestedHouseholdName ||
        `Casa de ${memberName.trim() || "Mi hogar"}`;

      const onboardingProfile = aiResult
        ? buildOnboardingProfilePayload(aiResult, description)
        : undefined;

      const res = await fetch("/api/households/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdName: resolvedHouseholdName,
          memberName: memberName.trim() || undefined,
          memberType: "adult",
          tasks: tasksToCreate,
          ...(profile?.planningDay != null && { planningDay: profile.planningDay }),
          ...(profile?.occupationLevel && { occupationLevel: profile.occupationLevel }),
          ...(onboardingProfile && { onboardingProfile }),
          ...((profile?.city || selectedCity) && {
            location: {
              city: profile?.city ?? selectedCity?.name,
              timezone: profile?.timezone ?? (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined),
              ...(selectedCity?.latitude != null && !profile?.city && { latitude: selectedCity.latitude }),
              ...(selectedCity?.longitude != null && !profile?.city && { longitude: selectedCity.longitude }),
              ...(!profile?.city && selectedCity && { country: "AR" }),
            },
          }),
        }),
      });

      const data = (await res.json()) as {
        household?: { inviteCode?: string };
        tasksCreated?: number;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Error al crear el hogar");
      }

      setAiSetupResult(aiResult);
      setTasksCreatedCount(data.tasksCreated ?? tasksToCreate.length);

      // Always capture invite code for shared mode
      if (data.household?.inviteCode) {
        setCreatedInviteCode(data.household.inviteCode);
      }

      // Step 4: Go to "ready" step if AI provided insights, otherwise skip
      if (aiResult && aiResult.insights.length > 0) {
        goToStep("ready", "forward");
      } else if (isSoloMode) {
        goToNotificationsOrDashboard();
      } else if (data.household?.inviteCode) {
        goToStep("invite", "forward");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear el hogar");
      goToStep("setup", "back");
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
              className="mt-4 w-full rounded-full border border-white/60 bg-transparent py-4 text-base font-bold text-white transition-all duration-200 active:scale-[0.98]"
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
                className="w-full rounded-2xl border border-border/60 bg-background p-5 text-left transition-all duration-200 hover:border-primary/50 active:scale-[0.99]"
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
                className="w-full rounded-2xl border border-border/60 bg-background p-5 text-left transition-all duration-200 hover:border-primary/50 active:scale-[0.99]"
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
          onContinue={() => { setError(null); goToStep("location", "forward"); }}
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

            <div className="space-y-1">
              <label className="text-sm text-foreground">
                Contanos sobre tu hogar (opcional)
              </label>
              <textarea
                className="flex min-h-[100px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Ej: Departamento en Palermo, vivimos con mi pareja y un gato. Ambos trabajamos full-time y solemos cocinar los fines de semana..."
                value={householdDescription}
                onChange={(e) => setHouseholdDescription(e.target.value)}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground">
                Con esta info personalizamos tareas, recetas y recomendaciones para tu hogar
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </OnboardingLayout>
      </div>
    );
  }

  /* ─── Step: location (optional city selection) ─── */
  if (step === "location") {
    const browserTimezone =
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : "America/Argentina/Buenos_Aires";

    return (
      <div key="location" className={stepAnimationClass}>
        <OnboardingLayout
          onBack={() => { setError(null); goToStep("setup", "back"); }}
          onContinue={() => { setError(null); handleCreateHousehold(); }}
          continueLabel="Crear mi hogar"
          continueLoading={createLoading}
          progress={{ steps: PROGRESS_STEPS, currentStep: "location" }}
        >
          <div className="space-y-6">
            <StepHeader
              title="¿Dónde está tu hogar?"
              subtitle="Esto mejora las recomendaciones de planes, recetas y ofertas"
            />

            <div className="space-y-1">
              <label className="text-sm text-foreground">Ciudad</label>
              <CityTypeahead
                value={citySearch}
                onChange={setCitySearch}
                onSelectCity={(city) => {
                  setSelectedCity({
                    ...city,
                    // Store timezone from browser
                  });
                  setCitySearch(`${city.name}, ${city.province}`);
                }}
                placeholder="Buscar tu ciudad..."
              />
            </div>

            {selectedCity && (
              <div className="flex items-center gap-2 rounded-xl bg-primary/5 px-3 py-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{selectedCity.name}</span>
                <span className="text-xs text-muted-foreground">{browserTimezone}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => { setError(null); handleCreateHousehold(); }}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Omitir por ahora
            </button>
          </div>
        </OnboardingLayout>
      </div>
    );
  }

  /* ─── Step: creating (loading) ─── */
  if (step === "creating") {
    return <LoadingScreen message={loadingMessages[loadingMessageIndex] ?? "Creando hogar..."} />;
  }

  /* ─── Step: ready (post-creation with insights + CTA) ─── */
  if (step === "ready") {
    const handleGeneratePlan = async () => {
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 6);

      try {
        await fetch("/api/ai/preview-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startDate: today.toISOString(),
            endDate: endDate.toISOString(),
          }),
        });
      } catch {
        // Plan generation is fire-and-forget, error is non-blocking
      }
      router.refresh();
      router.push("/plan");
    };

    const handleSkipToNextStep = () => {
      if (!isSoloMode && createdInviteCode) {
        goToStep("invite", "forward");
      } else {
        goToNotificationsOrDashboard();
      }
    };

    return (
      <div key="ready" className={stepAnimationClass}>
        <OnboardingLayout showContinue={false}>
          <div className="space-y-6 py-4">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-lime/20">
                <CheckCircle2 className="size-8 text-brand-lime" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                ¡Tu hogar está listo!
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Creamos {tasksCreatedCount} tarea{tasksCreatedCount !== 1 ? "s" : ""} personalizadas para tu hogar
              </p>
            </div>

            {aiSetupResult && aiSetupResult.insights.length > 0 && (
              <div className="space-y-2 rounded-xl border border-border bg-muted/50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Lightbulb className="size-4 text-amber-500" />
                  Tips para tu hogar
                </div>
                <ul className="space-y-1.5">
                  {aiSetupResult.insights.map((insight) => (
                    <li key={insight} className="text-sm text-muted-foreground">
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <Button
                size="lg"
                className="w-full gap-2"
                onClick={handleGeneratePlan}
              >
                <CalendarDays className="size-4" />
                Generar mi primer plan semanal
              </Button>
              <button
                type="button"
                onClick={handleSkipToNextStep}
                className="w-full text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {isSoloMode ? "Ir al dashboard" : "Continuar"}
              </button>
            </div>
          </div>
        </OnboardingLayout>
      </div>
    );
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
