import { useState } from "react";
import { router } from "expo-router";
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Bell,
  Check,
  Copy,
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
import { registerForPushNotifications } from "@/lib/push-notifications";
import { ONBOARDING_CATALOG } from "@habita/contracts";

import type { HouseholdResponse } from "@habita/contracts";

type Step = "householdType" | "setup" | "tasks" | "notifications" | "invite";

const ESSENTIAL_TASKS = new Set([
  "Lavar platos", "Limpiar cocina", "Barrer", "Sacar basura", "Hacer cama",
]);

export default function OnboardingScreen() {
  const { hydrate } = useMobileAuth();
  const createHousehold = useCreateHousehold();

  const [step, setStep] = useState<Step>("householdType");
  const [isSoloMode, setIsSoloMode] = useState(false);
  const [householdName, setHouseholdName] = useState("");
  const [memberName, setMemberName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(() => new Set(ESSENTIAL_TASKS));

  const isFormValid = memberName.trim().length > 0;

  const handleSelectMode = (solo: boolean) => {
    setIsSoloMode(solo);
    setError(null);
    setStep("setup");
  };

  const handleToggleTask = (taskName: string) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskName)) next.delete(taskName);
      else next.add(taskName);
      return next;
    });
  };

  const handleCreate = async () => {
    setError(null);
    try {
      const tasksToCreate = Array.from(selectedTasks).map((name) => {
        const found = ONBOARDING_CATALOG.flatMap((c) => c.tasks).find((t) => t.name === name);
        return {
          name,
          frequency: found?.defaultFrequency.toUpperCase() ?? "WEEKLY",
          weight: found?.defaultWeight ?? 2,
          estimatedMinutes: found?.estimatedMinutes ?? 15,
        };
      });

      const result = await createHousehold.mutateAsync({
        householdName: householdName.trim() || `Casa de ${memberName.trim() || "Mi hogar"}`,
        memberName: memberName.trim(),
        memberType: "ADULT",
        tasks: tasksToCreate,
      });

      if (isSoloMode) {
        setStep("notifications");
      } else {
        const response = result as HouseholdResponse;
        setInviteCode(response.inviteCode);
        setStep("invite");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el hogar.");
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

        {/* Progress: step 1 of 3 */}
        <View style={styles.progressRow}>
          <View style={[styles.progressDot, styles.progressActive]} />
          <View style={styles.progressDot} />
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

        {/* Progress: step 2 of 3 */}
        <View style={styles.progressRow}>
          <View style={[styles.progressDot, styles.progressDone]} />
          <View style={[styles.progressDot, styles.progressActive]} />
          <View style={styles.progressDot} />
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
          </View>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Button
            onPress={() => { setError(null); setStep("tasks"); }}
            disabled={!isFormValid}
            style={styles.submitBtn}
          >
            Continuar
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Step: Tasks (catalog selection) ──────────────────────────────────────
  if (step === "tasks") {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => setStep("setup")} hitSlop={8}>
            <ArrowLeft size={20} color={colors.text} />
          </Pressable>
          <HabitaLogo size={24} />
          <View style={{ width: 20 }} />
        </View>

        {/* Progress: step 3 of 3 */}
        <View style={styles.progressRow}>
          <View style={[styles.progressDot, styles.progressDone]} />
          <View style={[styles.progressDot, styles.progressDone]} />
          <View style={[styles.progressDot, styles.progressActive]} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={styles.formScroll}
        >
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>¿Qué tareas hacen{"\n"}en tu hogar?</Text>
            <Text style={styles.heroSubtitle}>
              Seleccioná las que apliquen — después podés agregar más
            </Text>
          </View>

          {ONBOARDING_CATALOG.map((category) => (
            <View key={category.category} style={styles.catalogCategory}>
              <Text style={styles.catalogCategoryLabel}>
                {category.icon} {category.label}
              </Text>
              {category.tasks.map((task) => {
                const isSelected = selectedTasks.has(task.name);
                return (
                  <Pressable
                    key={task.name}
                    onPress={() => handleToggleTask(task.name)}
                    style={[styles.taskItem, isSelected && styles.taskItemSelected]}
                  >
                    <Text style={styles.taskEmoji}>{task.icon}</Text>
                    <Text style={styles.taskName}>{task.name}</Text>
                    <View style={[styles.taskCheck, isSelected && styles.taskCheckSelected]}>
                      {isSelected ? <Check size={12} color={colors.white} strokeWidth={3} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Button
            onPress={() => void handleCreate()}
            disabled={createHousehold.isPending}
            loading={createHousehold.isPending}
            style={styles.submitBtn}
          >
            {createHousehold.isPending
              ? "Creando hogar..."
              : selectedTasks.size > 0
                ? `Crear mi hogar (${selectedTasks.size} tareas)`
                : "Crear mi hogar"}
          </Button>
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

  // ─── Task catalog ──────────────────────────────────
  catalogCategory: {
    marginBottom: spacing.lg,
  },
  catalogCategoryLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: "600",
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    marginBottom: 2,
  },
  taskItemSelected: {
    backgroundColor: `${colors.primary}10`,
  },
  taskEmoji: {
    fontSize: 18,
    width: 28,
    textAlign: "center",
  },
  taskName: {
    flex: 1,
    fontFamily: fontFamily.sans,
    fontSize: 14,
    color: colors.text,
  },
  taskCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  taskCheckSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
});
