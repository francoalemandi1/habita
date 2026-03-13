import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamily, radius, spacing } from "@/theme";
import type { HouseholdHealthScore } from "@habita/contracts";
import type { ThemeColors } from "@/theme";

interface Props {
  data: HouseholdHealthScore | null;
  loading?: boolean;
}

function scoreAccentColor(score: number, c: ThemeColors): string {
  if (score >= 80) return c.successText;
  if (score >= 50) return c.warningText;
  return c.errorText;
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Excelente";
  if (score >= 60) return "Bien";
  if (score >= 40) return "Regular";
  return "Necesita atención";
}

export function HealthScoreCard({ data, loading }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (loading) {
    return (
      <View style={[styles.card, { alignItems: "center", justifyContent: "center", height: 110 }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!data) return null;

  const accent = scoreAccentColor(data.score, colors);

  const radius_ = 36;
  const circumference = 2 * Math.PI * radius_;
  const dashOffset = circumference - (data.score / 100) * circumference;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Estado del hogar</Text>
        <Text style={[styles.label, { color: accent }]}>{scoreLabel(data.score)}</Text>
      </View>

      <View style={styles.body}>
        {/* Arc ring */}
        <View style={styles.ringContainer}>
          <Svg width={90} height={90} style={{ transform: [{ rotate: "-90deg" }] }}>
            <Circle
              cx={45}
              cy={45}
              r={radius_}
              stroke={colors.muted}
              strokeWidth={9}
              fill="none"
            />
            <Circle
              cx={45}
              cy={45}
              r={radius_}
              stroke={accent}
              strokeWidth={9}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={dashOffset}
            />
          </Svg>
          <View style={styles.ringLabel}>
            <Text style={[styles.scoreNumber, { color: accent }]}>{data.score}</Text>
            <Text style={styles.scoreMax}>/ 100</Text>
          </View>
        </View>

        {/* Component breakdown */}
        <View style={styles.components}>
          <ComponentRow
            label="Tareas"
            score={data.components.tasks.score}
            total={data.components.tasks.total}
            detail={
              data.components.tasks.completedThisWeek > 0
                ? `${data.components.tasks.completedThisWeek} completadas`
                : data.components.tasks.overdueThisWeek > 0
                  ? `${data.components.tasks.overdueThisWeek} vencidas`
                  : "Sin asignaciones"
            }
            colors={colors}
          />
          <ComponentRow
            label="Gastos"
            score={data.components.expenses.score}
            total={data.components.expenses.total}
            detail={
              data.components.expenses.daysSinceLastExpense === 0
                ? "Registrado hoy"
                : `Hace ${data.components.expenses.daysSinceLastExpense}d`
            }
            colors={colors}
          />
          <ComponentRow
            label="Balance"
            score={data.components.balance.score}
            total={data.components.balance.total}
            detail={
              data.components.balance.totalUnsettledARS === 0
                ? "Todo saldado"
                : `$${data.components.balance.totalUnsettledARS.toLocaleString("es-AR")} pend.`
            }
            colors={colors}
          />
        </View>
      </View>
    </View>
  );
}

function ComponentRow({
  label,
  score,
  total,
  detail,
  colors,
}: {
  label: string;
  score: number;
  total: number;
  detail: string;
  colors: ThemeColors;
}) {
  const pct = Math.round((score / total) * 100);
  const barColor = pct >= 80 ? colors.successText : pct >= 50 ? colors.warningText : colors.errorText;

  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
        <Text style={{ fontFamily: fontFamily.sans, fontSize: 12, fontWeight: "600", color: colors.text }}>
          {label}
        </Text>
        <Text style={{ fontFamily: fontFamily.sans, fontSize: 11, color: colors.mutedForeground }}>
          {detail}
        </Text>
      </View>
      <View style={{ height: 5, backgroundColor: colors.muted, borderRadius: 3, overflow: "hidden" }}>
        <View
          style={{
            height: 5,
            width: `${pct}%`,
            backgroundColor: barColor,
            borderRadius: 3,
          }}
        />
      </View>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderRadius: radius.xl,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: c.border,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    title: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      color: c.text,
    },
    label: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      fontWeight: "600",
    },
    body: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    ringContainer: {
      width: 90,
      height: 90,
      position: "relative",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    ringLabel: {
      position: "absolute",
      alignItems: "center",
    },
    scoreNumber: {
      fontFamily: fontFamily.sans,
      fontSize: 22,
    },
    scoreMax: {
      fontFamily: fontFamily.sans,
      fontSize: 10,
      color: c.mutedForeground,
    },
    components: {
      flex: 1,
    },
  });
}
