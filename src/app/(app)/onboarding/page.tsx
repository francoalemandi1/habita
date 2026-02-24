"use client";

import { LoadingScreen } from "@/components/features/loading-screen";
import { OnboardingLayout } from "@/components/features/onboarding/onboarding-layout";
import { StepHeader } from "@/components/features/onboarding/step-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InviteShareBlock } from "@/components/features/invite-share-block";
import { useGeolocation } from "@/hooks/use-geolocation";
import {
  Sparkles,
  ClipboardList,
  ChefHat,
  MapPin,
  Receipt,
  StickyNote,
  Package,
  Sun,
  Loader2,
  MapPinned,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type StepId = "welcome" | "householdType" | "setup" | "features" | "creating" | "invite" | "join";

const LOADING_MESSAGES_SOLO = [
  "Preparando tu hogar...",
  "Configurando la IA...",
  "Casi listo...",
];

const LOADING_MESSAGES_SHARED = [
  "Creando tu hogar...",
  "Preparando todo para el equipo...",
  "Casi listo...",
];

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
  const { location: geoLocation, isLoading: geoLoading } = useGeolocation();

  const [step, setStep] = useState<StepId>("welcome");
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
  const [isSoloMode, setIsSoloMode] = useState(false);

  const [cityInput, setCityInput] = useState("");

  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

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

  const loadingMessages = isSoloMode ? LOADING_MESSAGES_SOLO : LOADING_MESSAGES_SHARED;

  const handleUseMyLocation = () => {
    if (geoLocation?.city) {
      setCityInput(geoLocation.city);
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
      // Build location: prefer browser coords if available, fall back to manual city
      const hasCoords = geoLocation && geoLocation.latitude !== 0;
      const city = cityInput.trim() || geoLocation?.city || "";
      const location = hasCoords
        ? {
            latitude: geoLocation.latitude,
            longitude: geoLocation.longitude,
            timezone: geoLocation.timezone,
            country: geoLocation.country,
            city,
          }
        : city
          ? {
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              city,
            }
          : undefined;

      const [res] = await Promise.all([
        fetch("/api/households/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            householdName: householdName.trim() || `${memberName.trim()}'s Home`,
            memberName: memberName.trim() || undefined,
            memberType: "adult",
            ...(location && { location }),
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

      if (isSoloMode) {
        router.refresh();
        router.push("/dashboard");
      } else if (data.household?.inviteCode) {
        setCreatedInviteCode(data.household.inviteCode);
        goToStep("invite", "forward");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear el hogar");
      goToStep("features", "back");
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

  const handleContinueToApp = () => {
    router.refresh();
    router.push("/dashboard");
  };

  const stepAnimationClass = stepDirection === "forward" ? "animate-step-enter" : "animate-step-enter-reverse";

  /* ─── Step: welcome ─── */
  if (step === "welcome") {
    return (
      <div key="welcome" className={stepAnimationClass}>
        <div className="flex min-h-screen w-full flex-col items-center bg-brand-primary-light px-6">
          {/* Logo — centrado verticalmente */}
          <div className="flex flex-1 flex-col items-center justify-center">
            <h1 className="text-[98px] font-bold leading-none tracking-tighter text-brand-lime">
              Hábita
            </h1>
            <p className="mt-3 flex items-center gap-1.5 text-lg text-background">
              Tu asistente inteligente para el hogar
              <Sparkles className="size-4 text-brand-lime" />
            </p>
          </div>

          {/* Botones — empujados al fondo */}
          <div className="w-full max-w-xs pb-12 sm:max-w-sm">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setHasInviteCode(false);
                goToStep("householdType", "forward");
              }}
              className="w-full rounded-full bg-white py-4 text-base font-bold text-primary transition-all duration-200 active:scale-[0.98]"
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

  /* ─── Step: householdType (solo vs shared) ─── */
  if (step === "householdType") {
    return (
      <div key="householdType" className={stepAnimationClass}>
        <OnboardingLayout
          onBack={() => { setError(null); goToStep("welcome", "back"); }}
          showContinue={false}
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
                  Habita organiza tus tareas, te sugiere recetas y planes para salir
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
                  Repartan tareas, gastos y organicen el hogar juntos
                </p>
              </button>
            </div>
          </div>
        </OnboardingLayout>
      </div>
    );
  }

  /* ─── Step: setup (household name + location + context) ─── */
  if (step === "setup") {
    return (
      <div key="setup" className={stepAnimationClass}>
        <OnboardingLayout
          onBack={() => { setError(null); goToStep("householdType", "back"); }}
          onContinue={() => { setError(null); goToStep("features", "forward"); }}
          continueLabel="Continuar"
        >
          <div className="space-y-6">
            <StepHeader
              title="Configurá tu hogar"
              subtitle={isSoloMode ? "Dale un nombre a tu espacio" : "Datos básicos para empezar"}
            />

            {/* Household name */}
            <div className="space-y-1">
              <label className="text-sm text-foreground">Nombre del hogar</label>
              <Input
                placeholder={`ej. Casa de ${memberName || "Pepito"}`}
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                maxLength={50}
              />
            </div>

            {/* City / Location */}
            <div className="space-y-1">
              <label className="text-sm text-foreground">Ciudad</label>
              <p className="text-xs text-muted-foreground">
                Para recomendarte eventos, ofertas y actividades cerca tuyo
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="ej. Buenos Aires"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  maxLength={100}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5"
                  onClick={handleUseMyLocation}
                  disabled={geoLoading || !geoLocation?.city}
                >
                  {geoLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <MapPinned className="size-4" />
                  )}
                  <span className="hidden sm:inline">Usar mi ubicación</span>
                  <span className="sm:hidden">Ubicar</span>
                </Button>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </OnboardingLayout>
      </div>
    );
  }

  /* ─── Step: features (showcase) ─── */
  if (step === "features") {
    const featureCards = [
      {
        icon: <ClipboardList className="size-6" />,
        secondIcon: <Sparkles className="size-4 text-brand-lime" />,
        title: "Tareas + Plan IA",
        description: "Organizamos tus tareas de la semana con inteligencia artificial",
        bg: "bg-brand-lavender-light/50",
        iconBg: "bg-brand-lavender",
      },
      {
        icon: <ChefHat className="size-6" />,
        title: "Recetas",
        description: "Decinos qué tenés y te sugerimos qué cocinar",
        bg: "bg-brand-cream/60",
        iconBg: "bg-brand-tan",
      },
      {
        icon: <MapPin className="size-6" />,
        title: "Eventos y salidas",
        description: "Descubrí actividades y planes cerca tuyo",
        bg: "bg-brand-lavender-light/40",
        iconBg: "bg-brand-lavender-light",
      },
      {
        icon: <Receipt className="size-6" />,
        title: "Gastos",
        description: isSoloMode
          ? "Llevá el control de tus gastos del hogar"
          : "Registrá gastos y dividí entre los miembros",
        bg: "bg-brand-lime/40",
        iconBg: "bg-brand-lime",
      },
      {
        icon: <StickyNote className="size-5" />,
        secondIcon: <Package className="size-5" />,
        title: "Notas e Inventario",
        description: isSoloMode
          ? "Notas rápidas y control de lo que tenés en casa"
          : "Notas compartidas y control de lo que tienen en casa",
        bg: "bg-brand-cream/40",
        iconBg: "bg-brand-tan",
      },
      {
        icon: <Sun className="size-6" />,
        title: "Briefing diario",
        description: "Cada mañana, un resumen personalizado de tu día",
        bg: "bg-brand-lime/50",
        iconBg: "bg-brand-lime",
      },
    ];

    return (
      <div key="features" className={stepAnimationClass}>
        <OnboardingLayout
          onBack={() => { setError(null); goToStep("setup", "back"); }}
          onContinue={handleCreateHousehold}
          continueLabel="Crear hogar"
          continueLoading={createLoading}
        >
          <div className="space-y-5">
            <StepHeader
              title="Todo lo que Habita puede hacer"
              subtitle="Tu hogar, organizado de punta a punta"
            />

            <div className="space-y-3">
              {featureCards.map((card) => (
                <div
                  key={card.title}
                  className={`rounded-2xl p-4 ${card.bg}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${card.iconBg}`}>
                      {card.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-foreground">{card.title}</p>
                        {card.secondIcon}
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {card.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </OnboardingLayout>
      </div>
    );
  }

  /* ─── Step: creating (loading) ─── */
  if (step === "creating") {
    return <LoadingScreen message={loadingMessages[loadingMessageIndex] ?? "Creando hogar..."} />;
  }

  /* ─── Step: join ─── */
  if (step === "join") {
    return (
      <div key="join" className={stepAnimationClass}>
        <OnboardingLayout
          onBack={() => { setError(null); setHasInviteCode(false); goToStep("welcome", "back"); }}
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

  return null;
}
