import { useMemo } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Banner, SkeletonGate } from "@/components/ds";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { useThemeColors } from "@/hooks/use-theme";
import { useHouseholdDetail } from "@/hooks/use-households";
import { useMembers } from "@/hooks/use-members";
import { useMyAssignments } from "@/hooks/use-assignments";
import { useWeekAssignments } from "@/hooks/use-week-assignments";
import { useToggleAssignment } from "@/hooks/use-toggle-assignment";
import { useExpenseBalances } from "@/hooks/use-expense-balances";
import { useExpenseInsights } from "@/hooks/use-expense-insights";
import { useSavedCarts } from "@/hooks/use-saved-carts";
import { useShoppingList } from "@/hooks/use-shopping-list";
import { countUnchecked } from "@/lib/super-shopping-list-logic";
import { useEvents } from "@/hooks/use-events";
import { useTransfers } from "@/hooks/use-transfers";
import { useNotifications } from "@/hooks/use-notifications";
import { CasaHeader } from "@/components/features/casa/casa-header";
import { TareasCard } from "@/components/features/casa/tareas-card";
import { PlataCard } from "@/components/features/casa/plata-card";
import { SuperCard } from "@/components/features/casa/super-card";
import { DestacadoCard } from "@/components/features/casa/destacado-card";
import { CasaSkeleton } from "@/components/features/casa/casa-skeleton";
import { filterDueToday } from "@/lib/casa-week";
import { pickLatestCart } from "@/lib/casa-cart";
import { pickDestacadoEvent } from "@/lib/casa-event";
import { buildTransferBannerText, formatCasaMonthLabel } from "@/lib/casa-format";
import { fontFamilyForWeight, spacing } from "@/theme";
import { summarizeMyBalance, summarizeWeekTasks, formatCasaDateLabel } from "@habita/domain";

import type { ThemeColors } from "@/theme";
import type { CheckboxState } from "@/components/ds";
import type { AssignmentSummary } from "@habita/contracts";

export default function CasaScreen(): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const now = useMemo(() => new Date(), []);

  const { me, activeHouseholdId } = useMobileAuth();
  const householdQuery = useHouseholdDetail();
  const membersQuery = useMembers();
  const myAssignmentsQuery = useMyAssignments();
  const weekAssignmentsQuery = useWeekAssignments(now);
  const balancesQuery = useExpenseBalances();
  const insightsQuery = useExpenseInsights();
  const savedCartsQuery = useSavedCarts();
  const shoppingListQuery = useShoppingList();
  const eventsQuery = useEvents({ limit: 20 });
  const transfersQuery = useTransfers();
  const notificationsQuery = useNotifications(true);
  const toggle = useToggleAssignment();

  const myMember = useMemo(
    () => me?.members.find((member) => member.householdId === activeHouseholdId) ?? null,
    [me, activeHouseholdId],
  );

  const members = useMemo(() => membersQuery.data?.members ?? [], [membersQuery.data]);
  const isSolo = members.length <= 1;
  const myMemberType = members.find((member) => member.id === myMember?.id)?.memberType;
  const requiresVerification = myMemberType === "TEEN" || myMemberType === "CHILD";

  const weekSummary = useMemo(
    () =>
      summarizeWeekTasks({
        assignments: weekAssignmentsQuery.data ?? [],
        members,
        currentMemberId: myMember?.id ?? "",
      }),
    [weekAssignmentsQuery.data, members, myMember],
  );

  const todayAssignments = useMemo(
    () => filterDueToday(myAssignmentsQuery.data?.assignments ?? [], now),
    [myAssignmentsQuery.data, now],
  );

  const balance = useMemo(
    () => summarizeMyBalance(balancesQuery.data?.transactions ?? [], myMember?.id ?? ""),
    [balancesQuery.data, myMember],
  );

  const latestCart = useMemo(() => pickLatestCart(savedCartsQuery.data ?? []), [savedCartsQuery.data]);
  const uncheckedShoppingCount = useMemo(
    () => countUnchecked(shoppingListQuery.data?.items ?? []),
    [shoppingListQuery.data],
  );

  const destacadoEvent = useMemo(
    () => pickDestacadoEvent(eventsQuery.data?.events ?? [], now),
    [eventsQuery.data, now],
  );

  const incomingTransfers = useMemo(() => {
    if (!myMember || !transfersQuery.data) return [];
    return transfersQuery.data.transfers.filter((t) => t.toMemberId === myMember.id && t.status === "PENDING");
  }, [transfersQuery.data, myMember]);

  const household = householdQuery.data?.household ?? null;
  const hasUnreadNotifications = (notificationsQuery.data?.unreadCount ?? 0) > 0;

  const isLoading =
    myAssignmentsQuery.isLoading ||
    weekAssignmentsQuery.isLoading ||
    balancesQuery.isLoading ||
    insightsQuery.isLoading ||
    savedCartsQuery.isLoading;

  const handleToggle = (assignment: AssignmentSummary, next: CheckboxState) => {
    if (next === "done" || next === "toVerify") {
      toggle.complete(assignment, assignment.task.name);
    } else {
      toggle.uncomplete(assignment);
    }
  };

  const handleRefresh = () => {
    void myAssignmentsQuery.refetch();
    void weekAssignmentsQuery.refetch();
    void balancesQuery.refetch();
    void insightsQuery.refetch();
    void savedCartsQuery.refetch();
    void eventsQuery.refetch();
    void transfersQuery.refetch();
    void notificationsQuery.refetch();
  };

  const isRefreshing = myAssignmentsQuery.isRefetching || balancesQuery.isRefetching;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <CasaHeader
        householdName={household?.name ?? "Casa"}
        memberName={me?.name ?? ""}
        hasUnreadNotifications={hasUnreadNotifications}
      />
      <ScrollView
        bounces={false}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} tintColor={colors.monte} onRefresh={handleRefresh} />}
      >
        <View style={styles.titleBlock}>
          <Text style={styles.dateLabel}>{formatCasaDateLabel(now)}</Text>
          <Text style={styles.pageTitle}>
            La casa, <Text style={{ color: colors.ink3 }}>esta semana</Text>
          </Text>
        </View>

        {isSolo && household?.inviteCode ? (
          <Banner tone="info" text={`Invitá con el código ${household.inviteCode}`} />
        ) : null}

        {incomingTransfers.length > 0 ? (
          <Banner
            tone="attention"
            text={buildTransferBannerText(
              incomingTransfers.length,
              incomingTransfers[0]?.fromMember.name,
              incomingTransfers[0]?.assignment.task.name,
            )}
          />
        ) : null}

        <SkeletonGate loading={isLoading} skeleton={<CasaSkeleton />}>
          <View style={styles.cards}>
            <TareasCard
              weekSummary={weekSummary}
              isSolo={isSolo}
              todayAssignments={todayAssignments}
              requiresVerification={requiresVerification}
              onToggle={handleToggle}
            />
            <PlataCard
              monthLabel={formatCasaMonthLabel(now)}
              monthTotal={insightsQuery.data?.thisMonthTotal ?? 0}
              balance={balance}
            />
            <SuperCard latestCart={latestCart} uncheckedCount={uncheckedShoppingCount} now={now} />
            {destacadoEvent ? <DestacadoCard event={destacadoEvent} /> : null}
          </View>
        </SkeletonGate>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.paper,
    },
    scrollContent: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      paddingBottom: 24,
      gap: spacing.md,
    },
    titleBlock: {
      gap: 2,
      marginBottom: spacing.sm,
    },
    dateLabel: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 11,
      letterSpacing: 0.9,
      textTransform: "uppercase",
      color: c.ink2,
    },
    pageTitle: {
      fontFamily: fontFamilyForWeight(700),
      fontSize: 32,
      letterSpacing: -1.1,
      color: c.ink,
    },
    cards: {
      gap: spacing.md,
    },
    bottomPadding: {
      height: 20,
    },
  });
}
