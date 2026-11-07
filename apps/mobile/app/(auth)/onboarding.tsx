import { useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { useCreateHousehold } from "@/hooks/use-households";
import { useThemeColors } from "@/hooks/use-theme";
import { Button, ProgressBar } from "@/components/ds";
import { fontFamilyForWeight, spacing, typography } from "@/theme";
import { HabitaLogo } from "@/components/ds";
import { CrearHogarStep1 } from "@/components/features/onboarding/crear-hogar-step1";
import { CrearHogarInviteStep } from "@/components/features/onboarding/crear-hogar-invite-step";
import { starterTasksFor } from "@/lib/onboarding-starter-tasks";
import { mobileApi } from "@/lib/api";

import { householdResponseSchema } from "@habita/contracts";

import type { ThemeColors } from "@/theme";
import type { CityResult } from "@/components/ds";
import type { HouseholdComposition } from "@/lib/onboarding-starter-tasks";
import type { AuthMeResponse } from "@habita/contracts";

type Step = "setup" | "invite";

/** Crear hogar (steps 1-2) — handoff §5.3. */
export default function OnboardingScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { hydrate } = useMobileAuth();
  const createHousehold = useCreateHousehold();

  const [step, setStep] = useState<Step>("setup");
  const [householdName, setHouseholdName] = useState("");
  const [composition, setComposition] = useState<HouseholdComposition | null>(null);
  const [city, setCity] = useState("");
  const [selectedCity, setSelectedCity] = useState<CityResult | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [memberName, setMemberName] = useState("Usuario");

  useEffect(() => {
    mobileApi
      .get<AuthMeResponse>("/api/auth/me")
      .then((me) => {
        if (me.name) setMemberName(me.name);
      })
      .catch(() => {});
  }, []);

  const isFormValid = householdName.trim().length >= 2 && composition !== null;

  const goToCasa = async () => {
    await hydrate();
    router.replace("/(app)/casa");
  };

  const handleCreate = async () => {
    if (!composition) return;
    setError(null);
    try {
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const result = await createHousehold.mutateAsync({
        householdName: householdName.trim(),
        memberName,
        memberType: "ADULT",
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
      });

      const parsed = householdResponseSchema.safeParse(result);
      if (!parsed.success) {
        console.warn("OnboardingScreen: unexpected household response", parsed.error);
      }
      const response = parsed.success ? parsed.data : null;
      if (composition === "solo" || !response?.inviteCode) {
        await goToCasa();
        return;
      }
      setInviteCode(response.inviteCode);
      setStep("invite");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el hogar.");
    }
  };

  if (step === "invite" && inviteCode) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <View style={styles.backSlot} />
          <HabitaLogo size={24} />
          <View style={styles.backSlot} />
        </View>
        <ProgressBar progress={1} accessibilityLabel="Paso 2 de 2" />
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <CrearHogarInviteStep inviteCode={inviteCode} householdName={householdName} />
        </ScrollView>
        <View style={styles.footer}>
          <Button label="Ir a mi casa" onPress={() => void goToCasa()} />
          <Pressable onPress={() => void goToCasa()} style={styles.skipLink}>
            <Text style={styles.skipLinkText}>Omitir por ahora</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backSlot}>
          <ArrowLeft size={20} color={colors.ink} />
        </Pressable>
        <HabitaLogo size={24} />
        <View style={styles.backSlot} />
      </View>
      <ProgressBar progress={0.5} accessibilityLabel="Paso 1 de 2" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
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
      </ScrollView>
      <View style={styles.footer}>
        <Button
          label="Seguir"
          loadingLabel="Creando"
          loading={createHousehold.isPending}
          disabled={!isFormValid}
          onPress={() => void handleCreate()}
        />
      </View>
    </SafeAreaView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    backSlot: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
    scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 40 },
    footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },
    skipLink: { alignItems: "center", paddingVertical: spacing.sm },
    skipLinkText: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: typography.b2.fontSize,
      color: c.ink2,
    },
  });
}
