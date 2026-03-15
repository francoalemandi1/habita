import { useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  CheckCircle2,
  Copy,
  Lightbulb,
  Sparkles,
  User,
  Users,
} from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { useCreateHousehold } from "@/hooks/use-households";
import { StyledTextInput } from "@/components/ui/text-input";
import { Button } from "@/components/ui/button";
import { colors, fontFamily, radius, spacing, typography } from "@/theme";
import { HabitaLogo } from "@/components/ui/habita-logo";
import { mobileConfig } from "@/lib/config";
import { mobileApi } from "@/lib/api";
import { registerForPushNotifications } from "@/lib/push-notifications";
import { ONBOARDING_CATALOG } from "@habita/contracts";
import { buildOnboardingProfilePayload } from "@habita/domain/onboarding-profile";

import type { HouseholdResponse, OnboardingSetupResponse } from "@habita/contracts";

type Step = "householdType" | "setup" | "creating" | "ready" | "notifications" | "invite";

const ESSENTIAL_TASKS = new Set([
  "Lavar platos", "Limpiar cocina", "Barrer", "Sacar basura", "Hacer cama",
]);

const CATALOG_FLAT = ONBOARDING_CATALOG.flatMap((c) => c.tasks);

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

export default function OnboardingScreen() {
  const { hydrate } = useMobileAuth();
  const createHousehold = useCreateHousehold();

  const [step, setStep] = useState<Step>("householdType");
  const [isSoloMode, setIsSoloMode] = useState(false);
  const [householdName, setHouseholdName] = useState("");
  const [householdDescription, setHouseholdDescription] = useState("");
  const [memberName, setMemberName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [aiSetupResult, setAiSetupResult] = useState<OnboardingSetupResponse | null>(null);
  const [tasksCreatedCount, setTasksCreatedCount] = useState(0);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const isFormValid = memberName.trim().length > 0;

  const handleSelectMode = (solo: boolean) => {
    setIsSoloMode(solo);
    setError(null);
    setStep("setup");
  };

  const handleCreate = async () => {
    setError(null);
    setStep("creating");
    setLoadingMessageIndex(0);

    const useAiMessages = householdDescription.trim().length > 0;
    const messages = useAiMessages ? LOADING_MESSAGES_AI : LOADING_MESSAGES_DEFAULT;
    const messageInterval = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2000);

    try {
      // Step 1: Call AI endpoint if description provided
      let aiResult: OnboardingSetupResponse | null = null;
      const description = householdDescription.trim();

      if (description) {
        try {
          aiResult = await mobileApi.post<OnboardingSetupResponse>(
            "/api/ai/onboarding-setup",
            {
              householdDescription: description,
              isSoloMode,
              memberName: memberName.trim() || undefined,
            },
          );
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
            const found = CATALOG_FLAT.find((t) => t.name === name);
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

      const result = await createHousehold.mutateAsync({
        householdName: resolvedHouseholdName,
        memberName: memberName.trim(),
        memberType: "ADULT",
        tasks: tasksToCreate,
        ...(profile?.planningDay != null && { planningDay: profile.planningDay }),
        ...(profile?.occupationLevel && { occupationLevel: profile.occupationLevel }),
        ...(onboardingProfile && { onboardingProfile }),
        ...(profile?.city && {
          location: {
            city: profile.city,
            timezone: profile.timezone ?? undefined,
          },
        }),
      });

      const response = result as HouseholdResponse & { tasksCreated?: number };
      setAiSetupResult(aiResult);
      setTasksCreatedCount(response.tasksCreated ?? tasksToCreate.length);

      // Always capture invite code
      if (response.inviteCode) {
        setInviteCode(response.inviteCode);
      }

      // Step 4: Go to "ready" step if AI provided insights
      if (aiResult && aiResult.insights.length > 0) {
        setStep("ready");
      } else if (isSoloMode) {
        setStep("notifications");
      } else {
        setStep("invite");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el hogar.");
      setStep("setup");
    } finally {
      clearInterval(messageInterval);
    }
  };

  const handleContinueToApp = async () => {
    await hydrate();
    router.replace("/(app)/dashboard");
  };

  const handleShareInvite = async () => {
    if (!inviteCode) return;
    const baseUrl = mobileConfig.oauthBaseUrl;
    const inviteUrl = `${baseUrl}/join/${inviteCode}`;
    const message = `Te invito a unirte a mi hogar "${householdName || memberName}" en Habita\n\n${inviteUrl}`;
    try {
      await Share.share({ message });
    } catch {
      // user cancelled
    }
  };

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleNotificationsStep = async (enable: boolean) => {
    if (enable) {
      await registerForPushNotifications();
    }
    await handleContinueToApp();
  };

  // ─── Step: Household Type ─────────────────────────────────────────────────
  if (step === "householdType") {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ArrowLeft size={20} color={colors.text} />
          </Pressable>
          <HabitaLogo size={24} />
          <View style={{ width: 20 }} />
        </View>

        {/* Progress: step 1 of 2 */}
        <View style={styles.progressRow}>
          <View style={[styles.progressDot, styles.progressActive]} />
          <View style={styles.progressDot} />
        </View>

        <View style={styles.centeredContent}>
          <View style={styles.heroSection}>
            <View style={styles.heroIcon}>
              <Sparkles size={24} color={colors.primary} />
            </View>
            <Text style={styles.heroTitle}>¿Cómo es tu hogar?</Text>
            <Text style={styles.heroSubtitle}>
              Esto nos ayuda a personalizar tu experiencia
            </Text>
          </View>

          <View style={styles.optionsSection}>
            <Pressable
              onPress={() => handleSelectMode(true)}
              style={styles.optionCard}
            >
              <View style={styles.optionIconWrap}>
                <User size={22} color={colors.primary} />
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>Vivo solo/a</Text>
                <Text style={styles.optionDesc}>
                  Tareas, compras, recetas y más — todo tu hogar en un solo lugar
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => handleSelectMode(false)}
              style={styles.optionCard}
            >
              <View style={styles.optionIconWrap}>
                <Users size={22} color={colors.primary} />
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>Vivo con más personas</Text>
                <Text style={styles.optionDesc}>
                  Tareas, gastos, compras y más — coordiná el hogar en equipo
                </Text>
              </View>
            </Pressable>
          </View>

          <Pressable onPress={() => router.push("/(auth)/join")} style={styles.joinLink}>
            <Users size={14} color={colors.primary} />
            <Text style={styles.joinLinkText}>
              ¿Tenés un código de invitación?
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Step: Setup (name + household name) ──────────────────────────────────
  if (step === "setup") {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => setStep("householdType")} hitSlop={8}>
            <ArrowLeft size={20} color={colors.text} />
          </Pressable>
          <HabitaLogo size={24} />
          <View style={{ width: 20 }} />
        </View>

        {/* Progress: step 2 of 2 */}
        <View style={styles.progressRow}>
          <View style={[styles.progressDot, styles.progressDone]} />
          <View style={[styles.progressDot, styles.progressActive]} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={styles.formScroll}
        >
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>Configurá tu hogar</Text>
            <Text style={styles.heroSubtitle}>
              {isSoloMode
                ? "Dale un nombre a tu espacio"
                : "Datos básicos para empezar"}
            </Text>
          </View>

          <View style={styles.formSection}>
            <StyledTextInput
              label="Tu nombre"
              placeholder="Ej: Franco"
              value={memberName}
              onChangeText={setMemberName}
              maxLength={50}
            />

            <View style={styles.fieldGap}>
              <StyledTextInput
                label="Nombre del hogar (opcional)"
                placeholder={memberName ? `Casa de ${memberName}` : "Ej: Casa de los García"}
                value={householdName}
                onChangeText={setHouseholdName}
                maxLength={50}
              />
            </View>

            <View style={styles.fieldGap}>
              <Text style={styles.fieldLabel}>Contanos sobre tu hogar (opcional)</Text>
              <TextInput
                style={styles.descriptionInput}
                placeholder="Ej: Departamento en Palermo, vivimos con mi pareja y un gato. Ambos trabajamos full-time..."
                placeholderTextColor={colors.mutedForeground}
                value={householdDescription}
                onChangeText={setHouseholdDescription}
                maxLength={2000}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text style={styles.fieldHint}>
                Con esta info personalizamos tareas, recetas y recomendaciones
              </Text>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Button
            onPress={() => { setError(null); void handleCreate(); }}
            disabled={!isFormValid}
            style={styles.submitBtn}
          >
            Crear mi hogar
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Step: Creating (loading) ─────────────────────────────────────────────
  if (step === "creating") {
    const useAiMessages = householdDescription.trim().length > 0;
    const messages = useAiMessages ? LOADING_MESSAGES_AI : LOADING_MESSAGES_DEFAULT;
    const currentMessage = messages[loadingMessageIndex % messages.length] ?? "Creando hogar...";

    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centeredContent}>
          <View style={styles.heroSection}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.heroSubtitle, { marginTop: spacing.lg }]}>
              {currentMessage}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Step: Ready (post-creation with insights + CTA) ────────────────────
  if (step === "ready") {
    const handleGeneratePlan = async () => {
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 6);

      try {
        await mobileApi.post("/api/ai/preview-plan", {
          startDate: today.toISOString(),
          endDate: endDate.toISOString(),
        });
      } catch {
        // Plan generation is fire-and-forget
      }
      await hydrate();
      router.replace("/(app)/plan");
    };

    const handleSkipToNextStep = () => {
      if (!isSoloMode && inviteCode) {
        setStep("invite");
      } else {
        setStep("notifications");
      }
    };

    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.readyScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroSection}>
            <View style={[styles.heroIcon, { backgroundColor: `${colors.successText}20` }]}>
              <CheckCircle2 size={28} color={colors.successText} />
            </View>
            <Text style={styles.heroTitle}>¡Tu hogar está listo!</Text>
            <Text style={styles.heroSubtitle}>
              Creamos {tasksCreatedCount} tarea{tasksCreatedCount !== 1 ? "s" : ""} personalizadas para tu hogar
            </Text>
          </View>

          {aiSetupResult && aiSetupResult.insights.length > 0 && (
            <View style={styles.insightsCard}>
              <View style={styles.insightsHeader}>
                <Lightbulb size={16} color="#f59e0b" />
                <Text style={styles.insightsTitle}>Tips para tu hogar</Text>
              </View>
              {aiSetupResult.insights.map((insight) => (
                <Text key={insight} style={styles.insightText}>
                  {insight}
                </Text>
              ))}
            </View>
          )}

          <Button onPress={() => void handleGeneratePlan()} style={styles.planBtn}>
            <View style={styles.planBtnContent}>
              <CalendarDays size={18} color="#fff" />
              <Text style={styles.planBtnText}>Generar mi primer plan semanal</Text>
            </View>
          </Button>

          <Pressable onPress={handleSkipToNextStep} style={styles.skipLink}>
            <Text style={styles.skipLinkText}>
              {isSoloMode ? "Ir al inicio" : "Continuar"}
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Step: Invite (shared mode only) ──────────────────────────────────────
  if (step === "invite" && inviteCode) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centeredContent}>
          <View style={styles.heroSection}>
            <View style={[styles.heroIcon, { backgroundColor: colors.successBg }]}>
              <Sparkles size={24} color={colors.successText} />
            </View>
            <Text style={styles.heroTitle}>¡Hogar creado!</Text>
            <Text style={styles.heroSubtitle}>
              Invitá a tu familia a unirse con este código
            </Text>
          </View>

          <View style={styles.inviteCodeCard}>
            <Text style={styles.inviteCodeLabel}>Código de invitación</Text>
            <Text style={styles.inviteCodeValue}>{inviteCode}</Text>
            <Pressable onPress={() => void handleCopyCode()} style={styles.copyRow}>
              <Copy size={14} color={colors.primary} />
              <Text style={styles.copyText}>
                {codeCopied ? "Copiado" : "Copiar código"}
              </Text>
            </Pressable>
          </View>

          <Button onPress={() => void handleShareInvite()} style={styles.shareBtn}>
            Compartir invitación
          </Button>

          <Pressable onPress={() => setStep("notifications")} style={styles.skipLink}>
            <Text style={styles.skipLinkText}>Continuar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Step: Notifications (push opt-in) ────────────────────────────────────
  if (step === "notifications") {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centeredContent}>
          <View style={styles.heroSection}>
            <View style={styles.heroIcon}>
              <Bell size={24} color={colors.primary} />
            </View>
            <Text style={styles.heroTitle}>¿Activamos las{"\n"}notificaciones?</Text>
            <Text style={styles.heroSubtitle}>
              Te avisamos sobre tareas pendientes, gastos compartidos y recordatorios del hogar
            </Text>
          </View>

          <Button onPress={() => void handleNotificationsStep(true)} style={styles.shareBtn}>
            Activar notificaciones
          </Button>

          <Pressable onPress={() => void handleNotificationsStep(false)} style={styles.skipLink}>
            <Text style={styles.skipLinkText}>Ahora no</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  centeredContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
  },
  formScroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 60,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroTitle: {
    ...typography.displayMd,
    textAlign: "center",
  },
  heroSubtitle: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
    paddingHorizontal: spacing.md,
  },

  // ─── Progress indicator ────────────────────────────
  progressRow: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.muted,
  },
  progressActive: {
    backgroundColor: colors.primary,
  },
  progressDone: {
    backgroundColor: `${colors.primary}60`,
  },

  // ─── Type selection ────────────────────────────────
  optionsSection: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  optionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  optionTextWrap: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  optionDesc: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 18,
  },

  // ─── Form ─────────────────────────────────────────
  formSection: {
    marginBottom: spacing.xl,
  },
  fieldGap: {
    marginTop: spacing.lg,
  },
  fieldLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
    marginBottom: 6,
  },
  descriptionInput: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 100,
    lineHeight: 20,
  },
  fieldHint: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  errorBanner: {
    backgroundColor: colors.errorBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    fontFamily: fontFamily.sans,
    color: colors.errorText,
    fontSize: 14,
  },
  submitBtn: {
    marginBottom: spacing.md,
  },
  joinLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.md,
  },
  joinLinkText: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },

  // ─── Invite ────────────────────────────────────────
  inviteCodeCard: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  inviteCodeLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    fontWeight: "600",
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  inviteCodeValue: {
    fontFamily: fontFamily.sans,
    fontSize: 32,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: 4,
    marginBottom: spacing.md,
  },
  copyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  copyText: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  shareBtn: {
    marginBottom: spacing.md,
  },
  skipLink: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  skipLinkText: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    fontWeight: "600",
    color: colors.mutedForeground,
  },

  // ─── Ready step ─────────────────────────────────
  readyScroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    paddingBottom: 40,
  },
  insightsCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: 8,
  },
  insightsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  insightsTitle: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  insightText: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 18,
  },
  planBtn: {
    marginBottom: spacing.md,
  },
  planBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  planBtnText: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});
