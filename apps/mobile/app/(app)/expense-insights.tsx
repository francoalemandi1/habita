import { useMemo } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, BarChart3 } from "lucide-react-native";
import { useExpenseInsights } from "@/hooks/use-expense-insights";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamily, spacing, typography } from "@/theme";

import type { ThemeColors } from "@/theme";
import type { ExpenseInsightsResponse, SpendingTip } from "@habita/contracts";

function formatAmount(amount: number): string {
  return `$${amount.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

function statusLabel(status: ExpenseInsightsResponse["monthStatus"]): string {
  if (status === "well_below") return "Muy por debajo del promedio";
  if (status === "above_average") return "Por arriba del promedio";
  return "Mes estable";
}

function statusColor(status: ExpenseInsightsResponse["monthStatus"], c: ThemeColors): string {
  if (status === "well_below") return c.successText;
  if (status === "above_average") return c.errorText;
  return c.text;
}

function tipBgColor(tip: SpendingTip, c: ThemeColors): string {
  if (tip.severity === "critica") return c.errorBg;
  if (tip.severity === "alerta") return c.warningBg;
  return c.infoBg;
}

export default function ExpenseInsightsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { data, isLoading, isError, error, refetch, isRefetching } = useExpenseInsights();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.backRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text style={[styles.backTitle, { color: colors.text }]}>Insights financieros</Text>
        <View style={styles.backBtn} />
      </View>
      <ScrollView bounces={false} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.primary} />}
      >
        <Text style={styles.subtitle}>Estado del mes y oportunidades de ahorro.</Text>
        {isLoading ? (
          <View style={styles.loadingList}><SkeletonCard /><SkeletonCard /></View>
        ) : isError ? (
          <Card style={styles.errorCard}><CardContent><Text style={styles.errorText}>{getMobileErrorMessage(error)}</Text></CardContent></Card>
        ) : !data ? (
          <EmptyState icon={<BarChart3 size={32} color={colors.mutedForeground} />} title="Sin datos a\u00FAn" subtitle="Registr\u00E1 gastos para ver los insights del mes" />
        ) : (
          <View style={styles.cards}>
            <Card>
              <CardContent>
                <Text style={styles.cardLabel}>Estado del mes</Text>
                <Text style={[styles.statusText, { color: statusColor(data.monthStatus, colors) }]}>{statusLabel(data.monthStatus)}</Text>
                <Text style={styles.trendText}>Proyecci\u00F3n variable: {data.variableVsAverageTrend === "up" ? "+" : "-"}{data.variableVsAveragePercent}% vs promedio.</Text>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Text style={styles.cardLabel}>Total del mes</Text>
                <Text style={styles.totalText}>{formatAmount(data.thisMonthTotal)}</Text>
                <Text style={styles.projectedText}>Proyectado: {formatAmount(data.projectedTotal)}</Text>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Text style={[styles.cardLabel, { marginBottom: spacing.sm }]}>Tips accionables</Text>
                {data.spendingTips.length === 0 ? (
                  <Text style={styles.noTipsText}>Todav\u00EDa no hay sugerencias para este mes.</Text>
                ) : (
                  data.spendingTips.map((tip) => (
                    <View key={tip.id} style={[styles.tipCard, { backgroundColor: tipBgColor(tip, colors) }]}>
                      <Text style={styles.tipText}>{tip.emoji} {tip.message}</Text>
                    </View>
                  ))
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Text style={[styles.cardLabel, { marginBottom: spacing.sm }]}>Categor\u00EDas variables</Text>
                {data.categoryBreakdown.slice(0, 5).map((category) => (
                  <View key={category.category} style={styles.categoryRow}>
                    <Text style={styles.categoryName}>{category.category}</Text>
                    <Text style={styles.categoryAmount}>{formatAmount(category.amount)}</Text>
                  </View>
                ))}
              </CardContent>
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    backRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.card, alignItems: "center", justifyContent: "center" },
    backTitle: { ...typography.cardTitle },
    scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 24 },
    subtitle: { fontFamily: fontFamily.sans, fontSize: 14, color: c.mutedForeground, marginBottom: spacing.md },
    loadingList: { gap: spacing.md },
    errorCard: { backgroundColor: c.errorBg },
    errorText: { fontFamily: fontFamily.sans, color: c.errorText, fontSize: 14 },
    cards: { gap: spacing.md },
    cardLabel: { fontFamily: fontFamily.sans, fontSize: 12, color: c.mutedForeground },
    statusText: { fontFamily: fontFamily.sans, fontSize: 20, fontWeight: "700", marginTop: 3 },
    trendText: { fontFamily: fontFamily.sans, fontSize: 13, color: c.text, marginTop: 3 },
    totalText: { fontFamily: fontFamily.sans, fontSize: 22, fontWeight: "700", color: c.text, marginTop: 3 },
    projectedText: { fontFamily: fontFamily.sans, fontSize: 13, color: c.mutedForeground, marginTop: 2 },
    noTipsText: { fontFamily: fontFamily.sans, fontSize: 13, color: c.mutedForeground },
    tipCard: { borderRadius: 10, padding: spacing.sm, marginBottom: spacing.xs },
    tipText: { fontFamily: fontFamily.sans, fontWeight: "700", fontSize: 13, color: c.text },
    categoryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
    categoryName: { fontFamily: fontFamily.sans, fontSize: 14, fontWeight: "600", color: c.text },
    categoryAmount: { fontFamily: fontFamily.sans, fontSize: 14, color: c.text },
  });
}
