import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowRightLeft,
  Calendar,
  CalendarDays,
  ChefHat,
  CheckCircle2,
  ChevronRight,
  Compass,
  Dices,
  Lightbulb,
  ShoppingCart,
  Tag,
  UserPlus,
  Wallet,
  X,
} from "lucide-react-native";
import { useBriefing } from "@/hooks/use-stats";
import { useMyAssignments } from "@/hooks/use-assignments";
import { useExpenses } from "@/hooks/use-expenses";
import { useExpenseBalances } from "@/hooks/use-expense-balances";
import { useTransfers } from "@/hooks/use-transfers";
import { useEvents } from "@/hooks/use-events";
import { useHouseholdDetail } from "@/hooks/use-households";
import { useMembers } from "@/hooks/use-members";
import { getTodayCategory, useDailyDeal } from "@/hooks/use-grocery-deals";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { useThemeColors } from "@/hooks/use-theme";
import { mobileConfig } from "@/lib/config";
import { Card, CardContent } from "@/components/ui/card";
import { SkeletonCard } from "@/components/ui/skeleton";
import { ScreenHeader } from "@/components/features/screen-header";
import { OnboardingChecklist } from "@/components/features/onboarding-checklist";
import { TourSheet } from "@/components/features/tour-sheet";
import { useGuidedTour } from "@/hooks/use-guided-tour";
import { useCelebration } from "@/hooks/use-celebration";
import { fontFamily, radius, spacing, typography, shadows } from "@/theme";

import type { ReactNode } from "react";
import type { ThemeColors } from "@/theme";

// ─── helpers ────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

function formatTodayDate(): string {
  const date = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return date.charAt(0).toUpperCase() + date.slice(1);
}

function getMealLabel(): string {
  const hour = new Date().getHours();
  if (hour < 10) return "desayuno";
  if (hour < 15) return "almuerzo";
  if (hour < 19) return "merienda";
  return "cena";
}

// ─── Weekly Streak Card ────────────────────────────────────────────────────

function WeeklyStreakCard({ completedCount, activeToday }: { completedCount: number; activeToday: boolean }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.streakCard}>
      <CheckCircle2 size={20} color={colors.successText} />
      <View style={styles.streakTextWrap}>
        <Text style={styles.streakCount}>
          <Text style={{ color: colors.successText }}>{completedCount}</Text>
          {" esta semana"}
        </Text>
        <Text style={styles.streakLabel}>
          {activeToday ? "Tareas completadas · Activo hoy" : "Tareas completadas"}
        </Text>
      </View>
    </View>
  );
}

// ─── Invite Banner ─────────────────────────────────────────────────────────

function InviteBanner({ inviteCode, householdName, onDismiss }: {
  inviteCode: string;
  householdName: string;
  onDismiss: () => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleShare = async () => {
    const baseUrl = mobileConfig.oauthBaseUrl;
    // Universal link — opens the app directly if installed, otherwise prompts to download
    const inviteUrl = `${baseUrl}/join/${inviteCode}`;
    const message = `Te invito a unirte a mi hogar "${householdName}" en Habita 🏠\n\n${inviteUrl}`;
    try {
      await Share.share({ message });
    } catch {
      // user cancelled
    }
  };

  return (
    <View style={styles.inviteBanner}>
      <Pressable onPress={onDismiss} style={styles.inviteDismiss} hitSlop={8}>
        <X size={14} color={colors.mutedForeground} />
      </Pressable>
      <View style={styles.inviteRow}>
        <View style={styles.inviteIconWrap}>
          <UserPlus size={18} color={colors.primary} />
        </View>
        <View style={styles.inviteTextWrap}>
          <Text style={styles.inviteTitle}>¿Compartís tu hogar?</Text>
          <Text style={styles.inviteSubtitle}>
            Invitá a alguien a organizar juntos
          </Text>
        </View>
      </View>
      <Pressable onPress={() => void handleShare()} style={styles.inviteShareBtn}>
        <Text style={styles.inviteShareText}>Compartir invitación</Text>
      </Pressable>
    </View>
  );
}


// ─── Feature Link Card ──────────────────────────────────────────────────────

interface FeatureLinkCardProps {
  icon: ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  cardBg: string;
  cardBorder: string;
  onPress: () => void;
}

function FeatureLinkCard({ icon, iconBg, title, subtitle, cardBg, cardBorder, onPress }: FeatureLinkCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable onPress={onPress}>
      <View style={[styles.featureCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <View style={styles.featureCardContent}>
          <View style={[styles.featureIconContainer, { backgroundColor: iconBg }]}>{icon}</View>
          <View style={styles.featureTextContainer}>
            <Text style={styles.featureTitle}>{title}</Text>
            <Text style={styles.featureSubtitle} numberOfLines={2}>{subtitle}</Text>
          </View>
          <ChevronRight size={16} color={colors.mutedForeground} />
        </View>
      </View>
    </Pressable>
  );
}

// ─── main screen ────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { me, activeHouseholdId } = useMobileAuth();
  const briefingQuery = useBriefing();
  const assignmentsQuery = useMyAssignments();
  const balancesQuery = useExpenseBalances();
  const transfersQuery = useTransfers();
  const eventsQuery = useEvents({ limit: 10 });
  const householdQuery = useHouseholdDetail();
  const membersQuery = useMembers();
  const dailyDealQuery = useDailyDeal();

  const expensesQuery = useExpenses();
  const [inviteDismissed, setInviteDismissed] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem("invite_banner_dismissed").then((val) => {
      if (val === "1") setInviteDismissed(true);
    });
  }, []);

  const handleDismissInvite = () => {
    setInviteDismissed(true);
    void AsyncStorage.setItem("invite_banner_dismissed", "1");
  };

  const activeMembers = me?.members.filter((m) => m.householdId === activeHouseholdId) ?? [];
  const isSolo = (membersQuery.data?.members?.length ?? activeMembers.length) <= 1;

  // Guided tour
  const tour = useGuidedTour(!isSolo);
  const { celebrate } = useCelebration();

  // My net balance: positive = others owe me, negative = I owe others
  const myMemberId = useMemo(() => {
    return me?.members.find((m) => m.householdId === activeHouseholdId)?.id ?? null;
  }, [me, activeHouseholdId]);

  const myBalance = useMemo(() => {
    if (!myMemberId || !balancesQuery.data) return 0;
    return balancesQuery.data.balances.find((b) => b.memberId === myMemberId)?.balance ?? 0;
  }, [balancesQuery.data, myMemberId]);

  // Incoming pending transfers (someone wants to pass me a task)
  const incomingTransfers = useMemo(() => {
    if (!myMemberId || !transfersQuery.data) return [];
    return transfersQuery.data.transfers.filter(
      (t) => t.toMemberId === myMemberId && t.status === "PENDING",
    );
  }, [transfersQuery.data, myMemberId]);

  const briefing = briefingQuery.data;
  const briefingLines = briefing?.highlights ?? [];

  const pendingAssignments = assignmentsQuery.data?.pending ?? [];
  const todayPending = pendingAssignments.filter((a) => {
    const due = new Date(a.dueDate);
    const now = new Date();
    return due.toDateString() === now.toDateString();
  });

  const assignmentsData = assignmentsQuery.data;
  const hasAnyAssignments = (assignmentsData?.assignments?.length ?? 0) > 0;
  const hasPendingAssignments = (assignmentsData?.pending?.length ?? 0) > 0;

  const hasExpense = (expensesQuery.data?.expenses?.length ?? 0) > 0;
  const hasCompletedTask = (assignmentsData?.completed?.length ?? 0) > 0;

  const weeklyCompletedCount = assignmentsData?.completed?.length ?? 0;
  const activeTodayStreak = (assignmentsData?.completed ?? []).some((a) => {
    const completedAt = a.completedAt ? new Date(a.completedAt) : null;
    if (!completedAt) return false;
    const now = new Date();
    return completedAt.toDateString() === now.toDateString();
  });

  const planCardTitle = (() => {
    if (!hasAnyAssignments) {
      return isSolo ? "Plan semanal" : "Plan de distribución";
    }
    if (hasPendingAssignments) {
      return isSolo ? "Plan semanal en curso" : "Plan de distribución en curso";
    }
    return "Plan completado";
  })();

  const planCardSubtitle = (() => {
    if (!hasAnyAssignments) {
      return isSolo
        ? "Organizá tus tareas de la semana"
        : "Distribuí las tareas equitativamente entre los miembros";
    }
    if (hasPendingAssignments) {
      return "Tenés tareas asignadas para esta semana.";
    }
    return "Completaste todas las tareas de tu último plan.";
  })();

  const recommendedEvent = useMemo(() => {
    const events = eventsQuery.data?.events ?? [];
    return events.find((e) => e.editorialHighlight) ?? events[0] ?? null;
  }, [eventsQuery.data?.events]);

  const inviteCode = householdQuery.data?.household?.inviteCode ?? null;
  const householdName = householdQuery.data?.household?.name ?? "";

  const isRefreshing = briefingQuery.isRefetching || balancesQuery.isRefetching;

  const mealLabel = getMealLabel();
  const firstName = me?.name?.split(" ")[0] ?? "";

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader />
      <ScrollView
        bounces={false}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            tintColor={colors.primary}
            onRefresh={() => {
              void briefingQuery.refetch();
              void assignmentsQuery.refetch();
              void balancesQuery.refetch();
              void transfersQuery.refetch();
              void eventsQuery.refetch();
            }}
          />
        }
      >
        {/* ── Greeting ── */}
        <View style={styles.greetingSection}>
          <Text style={[styles.greetingTitle, { color: colors.text }]}>
            {getGreeting()}{firstName ? `, ${firstName}` : ""}
          </Text>
          <Text style={styles.greetingDate}>{formatTodayDate()}</Text>
        </View>

        {/* ── Guided tour ── */}
        {tour.shouldShowTour && tour.activeTourSection ? (
          <TourSheet
            section={tour.activeTourSection}
            stepNumber={tour.getTourStepNumber(tour.activeTourSection)}
            totalSteps={tour.totalSteps}
            visible={tour.shouldShowTour}
            onDismiss={() => tour.advanceToNext()}
            onSkipTour={() => { tour.skipTour(); celebrate("tour-complete"); }}
            onNavigate={() => { if (tour.activeTourSection) tour.markSectionToured(tour.activeTourSection); }}
          />
        ) : null}

        {/* ── Onboarding checklist ── */}
        <OnboardingChecklist hasExpense={hasExpense} hasCompletedTask={hasCompletedTask} />

        {/* ── Invite banner ── */}
        {inviteCode && !inviteDismissed ? (
          <View style={styles.section}>
            <InviteBanner
              inviteCode={inviteCode}
              householdName={householdName}
              onDismiss={handleDismissInvite}
            />
          </View>
        ) : null}

        {/* ── Briefing card ── */}
        {briefingQuery.isLoading ? (
          <SkeletonCard lines={3} style={styles.section} />
        ) : briefing ? (
          <Card style={styles.section}>
            <CardContent>
              {briefing.greeting ? (
                <Text style={styles.briefingGreeting}>{briefing.greeting}</Text>
              ) : null}
              {briefing.summary ? (
                <Text style={styles.briefingSummary}>{briefing.summary}</Text>
              ) : null}
              {briefingLines.length > 0 ? (
                <View style={styles.briefingHighlights}>
                  {briefingLines.map((line) => (
                    <View key={line} style={styles.briefingLine}>
                      <View style={styles.briefingBullet} />
                      <Text style={styles.briefingLineText}>{line}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {briefing.suggestion ? (
                <View style={styles.briefingSuggestion}>
                  <Lightbulb size={16} color={colors.warningText} style={{ flexShrink: 0, marginTop: 1 }} />
                  <Text style={styles.briefingSuggestionText}>{briefing.suggestion}</Text>
                </View>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {/* ── Weekly streak summary ── */}
        {weeklyCompletedCount > 0 ? (
          <View style={styles.section}>
            <WeeklyStreakCard completedCount={weeklyCompletedCount} activeToday={activeTodayStreak} />
          </View>
        ) : null}

        {/* ── Today's tasks summary ── */}
        {todayPending.length > 0 ? (
          <Pressable onPress={() => router.push("/(app)/tasks")} style={styles.section}>
            <View style={styles.tasksSummaryCard}>
              <View style={styles.tasksSummaryIconWrap}>
                <Calendar size={18} color={colors.primary} />
              </View>
              <View style={styles.tasksSummaryText}>
                <Text style={styles.tasksSummaryTitle}>
                  {todayPending.length} {todayPending.length === 1 ? "tarea pendiente" : "tareas pendientes"} hoy
                </Text>
                <Text style={styles.tasksSummarySubtitle} numberOfLines={1}>
                  {todayPending.slice(0, 2).map((a) => a.task.name).join(", ")}
                  {todayPending.length > 2 ? ` y ${todayPending.length - 2} más` : ""}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.mutedForeground} />
            </View>
          </Pressable>
        ) : null}

        {/* ── Feature link cards ── */}
        <View style={[styles.section, styles.featureRow]}>
          {/* Descubrí — shows recommended event inline when available */}
          <FeatureLinkCard
            icon={<Compass size={20} color="#7c3aed" />}
            iconBg="#ede9fe"
            cardBg="#f5f3ff"
            cardBorder="rgba(196, 181, 253, 0.4)"
            title={recommendedEvent ? recommendedEvent.title : "Descubrí"}
            subtitle={
              recommendedEvent
                ? (recommendedEvent.startDate
                    ? new Date(recommendedEvent.startDate).toLocaleDateString("es-AR", {
                        weekday: "short", day: "numeric", month: "short",
                      }) + (recommendedEvent.venueName ? ` · ${recommendedEvent.venueName}` : "")
                    : (recommendedEvent.venueName ?? "Eventos cerca tuyo"))
                : "Explorá eventos y salidas cerca tuyo →"
            }
            onPress={() => router.push("/(app)/discover")}
          />
          <FeatureLinkCard
            icon={<ChefHat size={20} color="#c2410c" />}
            iconBg="#fed7aa"
            cardBg="#fff7ed"
            cardBorder="rgba(251, 146, 60, 0.35)"
            title="Cociná"
            subtitle="Recetas con lo que tenés en casa →"
            onPress={() => router.push("/(app)/cocina")}
          />
          {/* Ahorrá — shows best live deal when loaded, skeleton while loading */}
          {dailyDealQuery.isLoading ? (
            <View style={[styles.featureCard, { backgroundColor: "#ecfeff", borderColor: "rgba(34,211,238,0.35)" }]}>
              <View style={styles.featureCardContent}>
                <View style={[styles.featureIconContainer, { backgroundColor: "#a5f3fc" }]}>
                  <ShoppingCart size={20} color="#0e7490" />
                </View>
                <View style={styles.featureTextContainer}>
                  <View style={styles.dealSkeletonTitle} />
                  <View style={styles.dealSkeletonSub} />
                </View>
              </View>
            </View>
          ) : dailyDealQuery.data ? (
            (() => {
              const best = dailyDealQuery.data.clusters[0];
              return (
                <Pressable onPress={() => router.push({ pathname: "/(app)/grocery-deals", params: { category: getTodayCategory() } })}>
                  <View style={[styles.featureCard, { backgroundColor: "#ecfeff", borderColor: "rgba(34,211,238,0.35)" }]}>
                    <View style={styles.featureCardContent}>
                      <View style={[styles.featureIconContainer, { backgroundColor: "#a5f3fc" }]}>
                        <Tag size={20} color="#0e7490" />
                      </View>
                      <View style={styles.featureTextContainer}>
                        <Text style={styles.featureTitle} numberOfLines={1}>
                          {best ? best.storeName : "Mejor precio hoy"}
                        </Text>
                        <Text style={styles.featureSubtitle} numberOfLines={2}>
                          {best
                            ? `${best.averageDiscountPercent > 0 ? `${Math.round(best.averageDiscountPercent)}% dto · ` : ""}${best.productCount} producto${best.productCount !== 1 ? "s" : ""}`
                            : dailyDealQuery.data.recommendation}
                        </Text>
                      </View>
                      <ChevronRight size={16} color={colors.mutedForeground} />
                    </View>
                  </View>
                </Pressable>
              );
            })()
          ) : (
            <FeatureLinkCard
              icon={<ShoppingCart size={20} color="#0e7490" />}
              iconBg="#a5f3fc"
              cardBg="#ecfeff"
              cardBorder="rgba(34, 211, 238, 0.35)"
              title="Ahorrá"
              subtitle="Compará precios entre supermercados"
              onPress={() => router.push("/(app)/shopping-plan")}
            />
          )}
        </View>

        {/* ── Incoming transfers ── */}
        {incomingTransfers.length > 0 ? (
          <Pressable onPress={() => router.push("/(app)/transfers")} style={styles.section}>
            <View style={styles.transfersCard}>
              <View style={styles.transfersIconWrap}>
                <ArrowRightLeft size={18} color={colors.warningText} />
              </View>
              <View style={styles.transfersText}>
                <Text style={styles.transfersTitle}>
                  {incomingTransfers.length === 1
                    ? "1 transferencia pendiente"
                    : `${incomingTransfers.length} transferencias pendientes`}
                </Text>
                <Text style={styles.transfersSubtitle} numberOfLines={1}>
                  {incomingTransfers[0]
                    ? `${incomingTransfers[0].fromMember.name} quiere pasarte "${incomingTransfers[0].assignment.task.name}"`
                    : "Ver solicitudes recibidas"}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.mutedForeground} />
            </View>
          </Pressable>
        ) : null}

        {/* ── Plan status card ── */}
        <Pressable onPress={() => router.push("/(app)/weekly-plan")} style={styles.section}>
          <View style={styles.planCard}>
            <View style={styles.planIconWrap}>
              <CalendarDays size={18} color={colors.primary} />
            </View>
            <View style={styles.planText}>
            <Text style={styles.planTitle}>{planCardTitle}</Text>
            <Text style={styles.planSubtitle}>{planCardSubtitle}</Text>
            </View>
            <ChevronRight size={16} color={colors.mutedForeground} />
          </View>
        </Pressable>

        {/* ── Balance card ── */}
        <Pressable onPress={() => router.push("/(app)/expenses")} style={styles.section}>
          {(() => {
            const isOwed = myBalance > 0;
            const isOwing = myBalance < 0;
            const cardStyle = isOwed
              ? styles.balanceCardGreen
              : isOwing
                ? styles.balanceCardRed
                : styles.balanceCardNeutral;
            const iconColor = isOwed ? colors.successText : isOwing ? colors.errorText : colors.mutedForeground;
            const mainText = isOwed
              ? `Te deben $${myBalance.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
              : isOwing
                ? `Debés $${Math.abs(myBalance).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
                : "Sin deudas pendientes";
            return (
              <View style={[styles.balanceCard, cardStyle]}>
                <View style={styles.balanceIconWrapper}>
                  <Wallet size={18} color={iconColor} />
                </View>
                <View style={styles.balanceText}>
                  <Text style={[styles.balanceMain, { color: isOwed ? colors.successText : isOwing ? colors.errorText : colors.text }]}>
                    {mainText}
                  </Text>
                  <Text style={styles.balanceSub}>Ver gastos del hogar</Text>
                </View>
                <ChevronRight size={16} color={colors.mutedForeground} />
              </View>
            );
          })()}
        </Pressable>

        {/* ── Roulette CTA (shared households only) ── */}
        {!isSolo ? (
          <Pressable onPress={() => router.push("/(app)/roulette")} style={styles.section}>
            <Card style={styles.rouletteCard}>
              <CardContent style={styles.rouletteContent}>
                <View style={styles.rouletteIconContainer}>
                  <Dices size={24} color="#7c3aed" />
                </View>
                <View style={styles.rouletteTextContainer}>
                  <Text style={styles.rouletteTitle}>Ruleta de tareas</Text>
                  <Text style={styles.rouletteSubtitle}>Asigná una tarea al azar</Text>
                </View>
                <ChevronRight size={18} color={colors.mutedForeground} />
              </CardContent>
            </Card>
          </Pressable>
        ) : null}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.background,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: 24,
    },
    section: {
      marginBottom: spacing.lg,
    },
    greetingSection: {
      marginBottom: spacing.lg,
      gap: 2,
    },
    greetingTitle: {
      ...typography.pageTitle,
    },
    greetingDate: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      color: c.mutedForeground,
      textTransform: "capitalize",
    },

    // ── Invite banner ──
    inviteBanner: {
      backgroundColor: `${c.primary}08`,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: `${c.primary}20`,
      padding: spacing.lg,
    },
    inviteDismiss: {
      position: "absolute",
      top: spacing.md,
      right: spacing.md,
      zIndex: 1,
    },
    inviteRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      marginBottom: spacing.md,
      paddingRight: spacing.lg,
    },
    inviteIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.primaryLight,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    inviteTextWrap: {
      flex: 1,
      gap: 2,
    },
    inviteTitle: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      fontWeight: "600",
      color: c.text,
    },
    inviteSubtitle: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
    },
    inviteShareBtn: {
      alignItems: "center",
      backgroundColor: c.primary,
      borderRadius: radius.lg,
      paddingVertical: 10,
    },
    inviteShareText: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      fontWeight: "600",
      color: "#ffffff",
    },

    // ── Weekly streak ──
    streakCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: `${c.successText}30`,
      backgroundColor: c.successBg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    streakTextWrap: {
      flex: 1,
      gap: 2,
    },
    streakCount: {
      fontFamily: fontFamily.sans,
      fontSize: 15,
      fontWeight: "700" as const,
      color: c.text,
    },
    streakLabel: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
    },

    // ── Tasks summary ──
    tasksSummaryCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: `${c.primary}25`,
      backgroundColor: c.primaryLight,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    tasksSummaryIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: `${c.primary}15`,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    tasksSummaryText: {
      flex: 1,
      gap: 2,
    },
    tasksSummaryTitle: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      fontWeight: "600",
      color: c.text,
    },
    tasksSummarySubtitle: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
    },

    // ── Daily deal skeleton ──
    dealSkeletonTitle: {
      height: 13,
      borderRadius: 6,
      backgroundColor: `${c.muted}CC`,
      width: "70%",
      marginBottom: 6,
    },
    dealSkeletonSub: {
      height: 11,
      borderRadius: 5,
      backgroundColor: `${c.muted}99`,
      width: "50%",
    },

    // Briefing
    briefingGreeting: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      fontWeight: "600",
      color: c.text,
      marginBottom: 4,
    },
    briefingSummary: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      color: c.mutedForeground,
      lineHeight: 20,
    },
    briefingHighlights: {
      marginTop: spacing.md,
      gap: 6,
    },
    briefingLine: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },
    briefingBullet: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: `${c.text}66`,
      marginTop: 7,
      flexShrink: 0,
    },
    briefingLineText: {
      fontFamily: fontFamily.sans,
      flex: 1,
      fontSize: 14,
      color: c.mutedForeground,
      lineHeight: 20,
    },
    briefingSuggestion: {
      marginTop: spacing.md,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      backgroundColor: c.warningBg,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    briefingSuggestionText: {
      fontFamily: fontFamily.sans,
      flex: 1,
      fontSize: 14,
      color: c.warningText,
      lineHeight: 20,
    },

    // Feature link cards
    featureRow: {
      gap: spacing.sm,
    },
    featureCard: {
      borderRadius: radius.xl,
      borderWidth: 1,
      ...shadows.card,
    },
    featureCardContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
    },
    featureIconContainer: {
      width: 40,
      height: 40,
      borderRadius: radius.lg,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    featureTextContainer: {
      flex: 1,
      gap: 2,
    },
    featureTitle: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      fontWeight: "600",
      color: c.text,
    },
    featureSubtitle: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
      lineHeight: 16,
    },

    // Balance card
    balanceCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: `${c.muted}4D`,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      ...shadows.card,
    },
    balanceIconWrapper: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.muted,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    balanceText: {
      flex: 1,
      gap: 2,
    },
    balanceMain: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      fontWeight: "500",
      color: c.text,
    },
    balanceSub: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
    },
    balanceCardGreen: {
      borderColor: c.successBg,
      backgroundColor: c.successBg,
    },
    balanceCardRed: {
      borderColor: c.errorBg,
      backgroundColor: c.errorBg,
    },
    balanceCardNeutral: {
      borderColor: c.border,
      backgroundColor: `${c.muted}4D`,
    },

    // Transfers card
    transfersCard: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.md,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.warningBg,
      backgroundColor: c.warningBg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      ...shadows.card,
    },
    transfersIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: c.warningBg,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      flexShrink: 0,
    },
    transfersText: {
      flex: 1,
      gap: 2,
    },
    transfersTitle: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      fontWeight: "600" as const,
      color: c.warningText,
    },
    transfersSubtitle: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.warningText,
    },

    // Plan card
    planCard: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.md,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: `${c.primary}25`,
      backgroundColor: c.primaryLight,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      ...shadows.card,
    },
    planIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: `${c.primary}15`,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      flexShrink: 0,
    },
    planText: {
      flex: 1,
      gap: 2,
    },
    planTitle: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      fontWeight: "600" as const,
      color: c.text,
    },
    planSubtitle: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
    },

    // Roulette CTA
    rouletteCard: {
      borderWidth: 1,
      borderColor: "rgba(196, 181, 253, 0.25)",
      backgroundColor: "#faf5ff",
    },
    rouletteContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.sm,
    },
    rouletteIconContainer: {
      width: 44,
      height: 44,
      borderRadius: radius.xl,
      backgroundColor: "#ede9fe",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    rouletteTextContainer: {
      flex: 1,
      gap: 2,
    },
    rouletteTitle: {
      fontFamily: fontFamily.sans,
      fontSize: 15,
      fontWeight: "600",
      color: c.text,
    },
    rouletteSubtitle: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
    },

    bottomPadding: {
      height: 20,
    },
  });
}
