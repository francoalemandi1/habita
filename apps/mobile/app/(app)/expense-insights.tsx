import { RefreshControl, SafeAreaView, ScrollView, Text, View } from "react-native";
import { useExpenseInsights } from "@/hooks/use-expense-insights";
import { getMobileErrorMessage } from "@/lib/mobile-error";

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
  if (status === "well_below") return "#065f46";
  if (status === "above_average") return "#b91c1c";
  return "#1f2937";
}

function tipColor(tip: SpendingTip): string {
  if (tip.severity === "critica") return "#fee2e2";
  if (tip.severity === "alerta") return "#fef3c7";
  return "#e0f2fe";
}

export default function ExpenseInsightsScreen() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useExpenseInsights();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff", padding: 20 }}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetch();
            }}
          />
        }
      >
        <Text style={{ fontSize: 20, fontWeight: "700" }}>Insights financieros</Text>
        <Text style={{ marginTop: 4, color: "#6b7280" }}>
          Estado del mes y oportunidades de ahorro.
        </Text>

        {isLoading ? <Text style={{ marginTop: 20, color: "#6b7280" }}>Analizando gastos...</Text> : null}

        {isError ? (
          <Text style={{ marginTop: 20, color: "#b91c1c" }}>{getMobileErrorMessage(error)}</Text>
        ) : null}

        {data ? (
          <View style={{ marginTop: 16, gap: 10 }}>
            <View style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 12 }}>
              <Text style={{ color: "#6b7280", fontSize: 12 }}>Estado del mes</Text>
              <Text style={{ marginTop: 3, fontSize: 20, fontWeight: "700", color: statusColor(data.monthStatus) }}>
                {statusLabel(data.monthStatus)}
              </Text>
              <Text style={{ marginTop: 3, color: "#374151" }}>
                Proyeccion variable: {data.variableVsAverageTrend === "up" ? "+" : "-"}
                {data.variableVsAveragePercent}% vs promedio.
              </Text>
            </View>

            <View style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 12 }}>
              <Text style={{ color: "#6b7280", fontSize: 12 }}>Total del mes</Text>
              <Text style={{ marginTop: 3, fontSize: 22, fontWeight: "700", color: "#111111" }}>
                {formatAmount(data.thisMonthTotal)}
              </Text>
              <Text style={{ marginTop: 2, color: "#374151" }}>
                Proyectado: {formatAmount(data.projectedTotal)}
              </Text>
            </View>

            <View style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 12 }}>
              <Text style={{ color: "#6b7280", fontSize: 12 }}>Tips accionables</Text>
              {data.spendingTips.length === 0 ? (
                <Text style={{ marginTop: 6, color: "#6b7280" }}>Todavia no hay sugerencias para este mes.</Text>
              ) : (
                data.spendingTips.map((tip) => (
                  <View
                    key={tip.id}
                    style={{
                      marginTop: 8,
                      borderRadius: 10,
                      padding: 10,
                      backgroundColor: tipColor(tip),
                    }}
                  >
                    <Text style={{ fontWeight: "700" }}>
                      {tip.emoji} {tip.message}
                    </Text>
                  </View>
                ))
              )}
            </View>

            <View style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 12 }}>
              <Text style={{ color: "#6b7280", fontSize: 12 }}>Categorias variables</Text>
              {data.categoryBreakdown.slice(0, 5).map((category) => (
                <View
                  key={category.category}
                  style={{ marginTop: 8, flexDirection: "row", justifyContent: "space-between" }}
                >
                  <Text style={{ color: "#111111", fontWeight: "600" }}>{category.category}</Text>
                  <Text style={{ color: "#111111" }}>{formatAmount(category.amount)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
