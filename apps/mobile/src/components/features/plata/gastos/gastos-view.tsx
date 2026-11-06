import { useCallback, useMemo } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { summarizeMyBalance } from "@habita/domain";
import { Banner, Button, EmptyState, Skeleton } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { useExpenseBalances } from "@/hooks/use-expense-balances";
import { fontFamilyForWeight, spacing } from "@/theme";
import { useExpenseFeed } from "@/hooks/use-expense-feed";
import { usePlataInsights } from "@/lib/plata-insights";
import { buildMonthComparisonText, formatMonthLabel } from "@/lib/plata-gastos-logic";
import { BalanceStrip } from "./balance-strip";
import { MiniBars } from "./mini-bars";
import { ExpenseDayList } from "./expense-day-list";

import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import type { ThemeColors } from "@/theme";
import type { PlataViewProps } from "@/components/features/plata/plata-view-props";

interface GastosViewProps extends PlataViewProps {
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

function formatArs(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-AR")}`;
}

/** Gastos view (handoff §5.3 "Plata" — Gastos), level 0 of the Plata stack. */
export function GastosView({ currentMemberId, currentMemberType, members, onScroll }: GastosViewProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insightsQuery = usePlataInsights();
  const balancesQuery = useExpenseBalances();
  const feedQuery = useExpenseFeed();

  const expenses = useMemo(
    () => feedQuery.data?.pages.flatMap((page) => page.expenses) ?? [],
    [feedQuery.data],
  );
  const hasMore = feedQuery.hasNextPage ?? false;

  const balance = useMemo(
    () => summarizeMyBalance(balancesQuery.data?.transactions ?? [], currentMemberId),
    [balancesQuery.data, currentMemberId],
  );

  const comparisonText = insightsQuery.data
    ? buildMonthComparisonText({
        hasReliableMonthlyTrend: insightsQuery.data.hasReliableMonthlyTrend,
        monthlyHistory: insightsQuery.data.monthlyHistory,
        projectedTotal: insightsQuery.data.projectedTotal,
      })
    : null;

  const handleEndReached = useCallback(() => {
    void feedQuery.fetchNextPage();
  }, [feedQuery]);

  const header = (
    <View style={styles.header}>
      <View style={styles.monthBlock}>
        <Text style={styles.monthLabel}>{formatMonthLabel(new Date())}</Text>
        {insightsQuery.isLoading && !insightsQuery.data ? (
          <Skeleton style={styles.totalSkeleton} />
        ) : (
          <Text style={styles.total}>{formatArs(insightsQuery.data?.thisMonthTotal ?? 0)}</Text>
        )}
        {insightsQuery.data ? <MiniBars monthlyHistory={insightsQuery.data.monthlyHistory} /> : null}
        {comparisonText ? <Text style={styles.comparison}>{comparisonText}</Text> : null}
      </View>

      <BalanceStrip
        balance={balance}
        currentMemberId={currentMemberId}
        currentMemberType={currentMemberType}
        members={members}
      />

      {feedQuery.isError && expenses.length === 0 ? (
        <View style={styles.errorBlock}>
          <Banner tone="attention" text="No pudimos cargar los gastos." />
          <Button label="Reintentar" variant="link" onPress={() => void feedQuery.refetch()} />
        </View>
      ) : expenses.length === 0 && !feedQuery.isLoading ? (
        <EmptyState title="Todavía no hay gastos" description="Anotá el primero para empezar a repartir." />
      ) : null}
    </View>
  );

  const footer = (
    <View style={styles.footerLinks}>
      <Pressable onPress={() => router.push("/(app)/services")}>
        <Text style={styles.footerLink}>Servicios</Text>
      </Pressable>
      <Pressable onPress={() => router.push("/(app)/expense-insights")}>
        <Text style={styles.footerLink}>Análisis</Text>
      </Pressable>
    </View>
  );

  return (
    <ExpenseDayList
      expenses={expenses}
      currentMemberId={currentMemberId}
      header={header}
      footer={footer}
      hasMore={hasMore}
      isFetchingMore={feedQuery.isFetchingNextPage}
      onEndReached={handleEndReached}
      onScroll={onScroll}
    />
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    header: {
      gap: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
    },
    monthBlock: {
      gap: spacing.sm,
    },
    monthLabel: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 11,
      letterSpacing: 0.9,
      textTransform: "uppercase",
      color: c.ink3,
    },
    total: {
      fontFamily: fontFamilyForWeight(700),
      fontSize: 48,
      letterSpacing: -1.2,
      color: c.ink,
      fontVariant: ["tabular-nums"],
    },
    totalSkeleton: {
      width: 180,
      height: 48,
    },
    comparison: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.ink2,
    },
    errorBlock: {
      gap: spacing.xs,
    },
    footerLinks: {
      flexDirection: "row",
      gap: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xl,
    },
    footerLink: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 13,
      color: c.ink2,
      textDecorationLine: "underline",
    },
  });
}
