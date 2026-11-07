"use client";

import { OnboardingLayout } from "@/components/features/onboarding/onboarding-layout";
import { CrearHogarStep1 } from "@/components/features/onboarding/crear-hogar-step1";
import { CrearHogarInviteStep } from "@/components/features/onboarding/crear-hogar-invite-step";
import { OnboardingJoinForm } from "@/components/features/onboarding/onboarding-join-form";
import { starterTasksFor } from "@/lib/onboarding-starter-tasks";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { z } from "zod";

import { APP_ROUTES } from "@habita/contracts";
import type { FormEvent } from "react";
import type { CityResult } from "@/components/ds/city-typeahead";
import type { HouseholdComposition } from "@/lib/onboarding-starter-tasks";

const createHouseholdResponseSchema = z.object({
  household: z.object({ inviteCode: z.string().optional() }).optional(),
  error: z.string().optional(),
});

const joinHouseholdResponseSchema = z.object({
  error: z.string().optional(),
});

type StepId = "setup" | "invite" | "join";

function OnboardingLoading() {
  return <div className="min-h-screen bg-paper" />;
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

  const [step, setStep] = useState<StepId>(searchParams.get("mode") === "join" ? "join" : "setup");
  const [householdName, setHouseholdName] = useState("");
  const [composition, setComposition] = useState<HouseholdComposition | null>(null);
  const [city, setCity] = useState("");
  const [selectedCity, setSelectedCity] = useState<CityResult | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: { hasMembership?: boolean }) => {
        if (data.hasMembership) router.replace(APP_ROUTES.casa);
      })
      .catch(() => {});
  }, [router]);

  const goToCasa = () => {
    router.refresh();
    router.push(APP_ROUTES.casa);
  };

  const handleCreateHousehold = async () => {
    if (!composition) return;
    setError(null);
    setCreateLoading(true);
    try {
      const browserTimezone =
        typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;
      const res = await fetch("/api/households/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdName: householdName.trim(),
          memberType: "adult",
          tasks: starterTasksFor(composition),
          ...(selectedCity && {
            location: {
              city: selectedCity.name,
              timezone: browserTimezone,
              ...(selectedCity.latitude != null && { latitude: selectedCity.latitude }),
              ...(selectedCity.longitude != null && { longitude: selectedCity.longitude }),
              country: "AR",
            },
          }),
        }),
      });
      const json: unknown = await res.json();
      const parsed = createHouseholdResponseSchema.safeParse(json);
      if (!parsed.success) {
        console.warn("onboarding: unexpected /api/households/onboarding response", parsed.error);
      }
      const data = parsed.success ? parsed.data : {};
      if (!res.ok) throw new Error(data.error ?? "Error al crear el hogar");

      if (composition === "solo" || !data.household?.inviteCode) {
        goToCasa();
        return;
      }
      setCreatedInviteCode(data.household.inviteCode);
      setStep("invite");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear el hogar");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoinHousehold = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setJoinLoading(true);
    try {
      const res = await fetch("/api/households/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: inviteCode.trim().toUpperCase() }),
      });
      const json: unknown = await res.json();
      const parsed = joinHouseholdResponseSchema.safeParse(json);
      if (!parsed.success) {
        console.warn("onboarding: unexpected /api/households/join response", parsed.error);
      }
      if (!res.ok) throw new Error((parsed.success ? parsed.data.error : undefined) ?? "Error al unirse");
      goToCasa();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al unirse");
    } finally {
      setJoinLoading(false);
    }
  };

  if (step === "join") {
    return (
      <OnboardingLayout showContinue={false}>
        <OnboardingJoinForm
          inviteCode={inviteCode}
          onInviteCodeChange={setInviteCode}
          onSubmit={(e) => void handleJoinHousehold(e)}
          loading={joinLoading}
          error={error}
        />
      </OnboardingLayout>
    );
  }

  if (step === "invite" && createdInviteCode) {
    return (
      <OnboardingLayout
        step={{ current: 2, total: 2 }}
        continueLabel="Ir a mi casa"
        onContinue={goToCasa}
      >
        <CrearHogarInviteStep inviteCode={createdInviteCode} householdName={householdName} />
        <button
          type="button"
          onClick={goToCasa}
          className="mt-4 w-full text-center text-[13px] text-ink-2"
        >
          Omitir por ahora
        </button>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout
      step={{ current: 1, total: 2 }}
      continueLabel="Seguir"
      continueDisabled={householdName.trim().length < 2 || !composition}
      continueLoading={createLoading}
      onContinue={() => void handleCreateHousehold()}
    >
      <CrearHogarStep1
        householdName={householdName}
        onHouseholdNameChange={setHouseholdName}
        composition={composition}
        onCompositionChange={setComposition}
        city={city}
        onCityChange={(value) => {
          setCity(value);
          setSelectedCity(null);
        }}
        onSelectCity={setSelectedCity}
        error={error}
      />
    </OnboardingLayout>
  );
}
