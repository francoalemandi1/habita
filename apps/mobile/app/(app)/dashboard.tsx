import { useCallback, useMemo, useRef } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowRightLeft } from "lucide-react-native";
import { useBriefing, useStats } from "@/hooks/use-stats";
import { useMyAssignments } from "@/hooks/use-assignments";
import { useExpenses } from "@/hooks/use-expenses";
import { useExpenseBalances } from "@/hooks/use-expense-balances";
import { useTransfers } from "@/hooks/use-transfers";
import { useEvents } from "@/hooks/use-events";
import { useMembers } from "@/hooks/use-members";
import { useDailyDeal } from "@/hooks/use-grocery-deals";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { useThemeColors } from "@/hooks/use-theme";
import { ScreenHeader } from "@/components/features/screen-header";
import { OnboardingChecklist } from "@/components/features/onboarding-checklist";
import { TourSheet } from "@/components/features/tour-sheet";
import { HeroCard } from "@/components/features/dashboard/hero-card";
import { BalanceCard } from "@/components/features/dashboard/balance-card";
import { ActionAlert } from "@/components/features/dashboard/action-alert";
import { BriefingTip } from "@/components/features/dashboard/briefing-tip";
import { DailyHighlight } from "@/components/features/dashboard/daily-highlight";
import { DashboardSkeleton } from "@/components/features/dashboard/dashboard-skeleton";
import { HouseholdWeekCard } from "@/components/features/dashboard/household-week-card";
import { ShareableWeekCard, shareWeekCard } from "@/components/features/dashboard/shareable-week-card";
import { useHeroState } from "@/components/features/dashboard/use-hero-state";
import { useDailyHighlight } from "@/components/features/dashboard/use-daily-highlight";
import { useGuidedTour } from "@/hooks/use-guided-tour";
import { useCelebration } from "@/hooks/use-celebration";
import { fontFamily, spacing, typography } from "@/theme";

import type ViewShot from "react-native-view-shot";
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

// ─── main screen ────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { me, activeHouseholdId } = useMobileAuth();

  const viewShotRef = useRef<ViewShot>(null);

  // Data hooks
  const briefingQuery = useBriefing();
  const statsQuery = useStats();
  const assignmentsQuery = useMyAssignments();
  const balancesQuery = useExpenseBalances();
  const transfersQuery = useTransfers();
  const eventsQuery = useEvents({ limit: 5 });
  const membersQuery = useMembers();
  const dailyDealQuery = useDailyDeal();
  const expensesQuery = useExpenses();

  // First visit
  const isSolo = (membersQuery.data?.members?.length ?? 1) <= 1;
  const tour = useGuidedTour(!isSolo);
  const { celebrate } = useCelebration();

  // Derived data
  const myMemberId = useMemo(() => {
    return me?.members.find((m) => m.householdId === activeHouseholdId)?.id ?? null;
  }, [me, activeHouseholdId]);

  const myBalance = useMemo(() => {
    if (!myMemberId || !balancesQuery.data) return 0;
    return balancesQuery.data.balances.find((b) => b.memberId === myMemberId)?.balance ?? 0;
  }, [balancesQuery.data, myMemberId]);

  const pendingAssignments = assignmentsQuery.data?.pending ?? [];

  const incomingTransfers = useMemo(() => {
    if (!myMemberId || !transfersQuery.data) return [];
    return transfersQuery.data.transfers.filter(
      (t) => t.toMemberId === myMemberId && t.status === "PENDING",
    );
  }, [transfersQuery.data, myMemberId]);

  const recommendedEvent = useMemo(() => {
    const events = eventsQuery.data?.events ?? [];
    return events.find((e) => e.editorialHighlight) ?? events[0] ?? null;
  }, [eventsQuery.data?.events]);

  const assignmentsData = assignmentsQuery.data;
  const hasExpense = (expensesQuery.data?.expenses?.length ?? 0) > 0;
  const hasCompletedTask = (assignmentsData?.completed?.length ?? 0) > 0;
  const briefing = briefingQuery.data;

  // Hero state
  const isInitialLoad =
    assignmentsQuery.isLoading || balancesQuery.isLoading || transfersQuery.isLoading;

  const { state: heroState } = useHeroState({
    pendingAssignments,
    incomingTransfers,
    myBalance,
    isLoading: isInitialLoad,
  });

  // Daily highlight
  const { highlight: highlightState, loading: highlightLoading } = useDailyHighlight({
    dailyDeal: dailyDealQuery.data,
    recommendedEvent,
    isLoading: eventsQuery.isLoading || dailyDealQuery.isLoading,
  });

  // Transfer alert text
  const transferAlertText = useMemo(() => {
    if (incomingTransfers.length === 0) return "";
    if (incomingTransfers.length === 1) {
      const t = incomingTransfers[0];
      return t
        ? `${t.fromMember.name} quiere pasarte "${t.assignment.task.name}"`
        : "1 transferencia pendiente";
    }
    return `${incomingTransfers.length} transferencias pendientes`;
  }, [incomingTransfers]);

  // Share handler
  const handleShareWeek = useCallback(() => {
    void shareWeekCard(viewShotRef.current);
  }, []);

  const isRefreshing = briefingQuery.isRefetching || balancesQuery.isRefetching;
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
              void statsQuery.refetch();
              void assignmentsQuery.refetch();
              void balancesQuery.refetch();
              void transfersQuery.refetch();
              void eventsQuery.refetch();
              void dailyDealQuery.refetch();
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

        {/* ── Main content ── */}
        {isInitialLoad ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* Zone 1: Status + actions */}
            <View style={styles.zone}>
              <HeroCard state={heroState} />

              {briefing?.suggestion ? (
                <BriefingTip text={briefing.suggestion} />
              ) : null}

              {incomingTransfers.length > 0 ? (
                <ActionAlert
                  icon={ArrowRightLeft}
                  text={transferAlertText}
                  iconColor={colors.warningText}
                  bgColor={colors.warningBg}
                  route="/(app)/transfers"
                />
              ) : null}

              <BalanceCard balance={myBalance} />
            </View>

            {/* Zone 2: Weekly progress + discovery */}
            <View style={styles.zone}>
              {statsQuery.data ? (
                <HouseholdWeekCard
                  memberStats={statsQuery.data.memberStats}
                  householdStreak={statsQuery.data.householdStreak}
                  isSolo={isSolo}
                  currentMemberId={myMemberId}
                  onShare={handleShareWeek}
                />
              ) : null}

              <DailyHighlight highlight={highlightState} loading={highlightLoading} />
            </View>
          </>
        )}

        {/* Off-screen shareable card for capture */}
        {statsQuery.data ? (
          <ShareableWeekCard
            ref={viewShotRef}
            memberStats={statsQuery.data.memberStats}
            householdStreak={statsQuery.data.householdStreak}
            isSolo={isSolo}
            currentMemberId={myMemberId}
          />
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
    zone: {
      gap: spacing.md,
      marginBottom: spacing.xl,
    },
    bottomPadding: {
      height: 20,
    },
  });
}
