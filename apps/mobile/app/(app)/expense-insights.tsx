import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, BarChart3 } from "lucide-react-native";
import { useExpenseInsights } from "@/hooks/use-expense-insights";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { colors, fontFamily, spacing, typography } from "@/theme";
import type { ExpenseInsightsResponse, SpendingTip } from "@habita/contracts";

function formatAmount(amount: number): string {
  return `$${amount.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

function statusLabel(status: ExpenseInsightsResponse["monthStatus"]): string {
  if (status === "well_below") return "Muy por debajo del promedio";
  if (status === "above_average") return "Por arriba del promedio";
  return "Mes estable";
}

function statusColor(status: ExpenseInsightsResponse["monthStatus"]): string {
  if (status === "well_below") return colors.successText; if (status === "above_average") return colors.errorText; return colors.text;
}

function tipBgColor(tip: SpendingTip): string {
  if (tip.severity === "critica") return colors.errorBg; if (tip.severity === "alerta") return colors.warningBg; return colors.infoBg;
}

export default function ExpenseInsightsScreen() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useExpenseInsights();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.backRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text style={styles.backTitle}>Insights financieros</Text>
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
          <EmptyState icon={<BarChart3 size={32} color={colors.mutedForeground} />} title="Sin datos aún" subtitle="Registrá gastos para ver los insights del mes" />
        ) : (
          <View style={styles.cards}>
            <Card>
              <CardContent>
                <Text style={styles.cardLabel}>Estado del mes</Text>
                <Text style={[styles.statusText, { color: statusColor(data.monthStatus) }]}>{statusLabel(data.monthStatus)}</Text>
                <Text style={styles.trendText}>Proyección variable: {data.variableVsAverageTrend === "up" ? "+" : "-"}{data.variableVsAveragePercent}% vs promedio.</Text>
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
                  <Text style={styles.noTipsText}>Todavía no hay sugerencias para este mes.</Text>
                ) : (
                  data.spendingTips.map((tip) => (
                    <View key={tip.id} style={[styles.tipCard, { backgroundColor: tipBgColor(tip) }]}>
                      <Text style={styles.tipText}>{tip.emoji} {tip.message}</Text>
                    </View>
                  ))
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Text style={[styles.cardLabel, { marginBottom: spacing.sm }]}>Categorías variables</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  backRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  backTitle: { ...typography.cardTitle },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 24 },
  subtitle: { fontFamily: fontFamily.sans, fontSize: 14, color: colors.mutedForeground, marginBottom: spacing.md },
  loadingList: { gap: spacing.md },
  errorCard: { backgroundColor: colors.errorBg },
  errorText: { fontFamily: fontFamily.sans, color: colors.errorText, fontSize: 14 },
  cards: { gap: spacing.md },
  cardLabel: { fontFamily: fontFamily.sans, fontSize: 12, color: colors.mutedForeground },
  statusText: { fontFamily: fontFamily.sans, fontSize: 20, fontWeight: "700", marginTop: 3 },
  trendText: { fontFamily: fontFamily.sans, fontSize: 13, color: colors.text, marginTop: 3 },
  totalText: { fontFamily: fontFamily.sans, fontSize: 22, fontWeight: "700", color: colors.text, marginTop: 3 },
  projectedText: { fontFamily: fontFamily.sans, fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  noTipsText: { fontFamily: fontFamily.sans, fontSize: 13, color: colors.mutedForeground },
  tipCard: { borderRadius: 10, padding: spacing.sm, marginBottom: spacing.xs },
  tipText: { fontFamily: fontFamily.sans, fontWeight: "700", fontSize: 13, color: colors.text },
  categoryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  categoryName: { fontFamily: fontFamily.sans, fontSize: 14, fontWeight: "600", color: colors.text },
  categoryAmount: { fontFamily: fontFamily.sans, fontSize: 14, color: colors.text },
});
