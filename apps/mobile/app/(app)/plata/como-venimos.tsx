import { useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LineChart } from "lucide-react-native";
import { Banner, Button, EmptyState, ScreenHeader, SegmentedControl, Skeleton } from "@/components/ds";
import { useExpenseInsights } from "@/hooks/use-expense-insights";
import { useThemeColors } from "@/hooks/use-theme";
import { spacing } from "@/theme";
import {
  buildCategoryBars,
  buildMonthTotalBars,
  COMO_VENIMOS_PERIODS,
  readTopGrowthCategory,
} from "@/lib/plata-como-venimos-logic";
import { CategoryBars } from "@/components/features/plata/como-venimos/category-bars";
import { MonthTotalBars } from "@/components/features/plata/como-venimos/month-total-bars";
import { TipCards } from "@/components/features/plata/como-venimos/tip-cards";

import type { ComoVenimosPeriod } from "@/lib/plata-como-venimos-logic";

/** §5.3 "Plata" — "Cómo venimos": segmented Mes/3 meses/Año, category bars and tips. */
export default function ComoVenimosScreen(): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(), []);
  const insightsQuery = useExpenseInsights();
  const [period, setPeriod] = useState<ComoVenimosPeriod>("mes");

  const data = insightsQuery.data;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.paper }]} edges={["top"]}>
      <ScreenHeader variant="detail" title="Cómo venimos" backLabel="Plata" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={insightsQuery.isRefetching} onRefresh={() => void insightsQuery.refetch()} tintColor={colors.monte} />}
      >
        {insightsQuery.isLoading ? (
          <View style={styles.loadingList}>
            <Skeleton height={40} />
            <Skeleton height={160} />
          </View>
        ) : insightsQuery.isError ? (
          <View style={styles.errorBlock}>
            <Banner tone="attention" text="No pudimos cargar cómo venimos." />
            <Button label="Reintentar" variant="link" onPress={() => void insightsQuery.refetch()} />
          </View>
        ) : !data || (data.thisMonthTotal === 0 && data.categoryBreakdown.length === 0) ? (
          <EmptyState icon={LineChart} title="Sin datos aún" description="Registrá gastos para ver cómo venimos este mes." />
        ) : (
          <View style={styles.content}>
            <SegmentedControl options={COMO_VENIMOS_PERIODS} value={period} onValueChange={setPeriod} accessibilityLabel="Período" />

            {period === "mes" ? (
              <CategoryBars bars={buildCategoryBars(data.categoryBreakdown, readTopGrowthCategory(data))} />
            ) : (
              <MonthTotalBars bars={buildMonthTotalBars(data.monthlyHistory, period)} />
            )}

            <TipCards tips={data.spendingTips} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles() {
  return StyleSheet.create({
    screen: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
    loadingList: { gap: spacing.md },
    errorBlock: { gap: spacing.xs },
    content: { gap: spacing.lg },
  });
}
