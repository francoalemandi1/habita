import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Banner, Button, EmptyState, Skeleton } from "@/components/ds";
import { usePlanHistory } from "@/hooks/use-plans";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";
import type { PlanSummary } from "@/hooks/use-plans";

const STATUS_LABELS: Record<PlanSummary["status"], string> = {
  PENDING: "Pendiente",
  APPLIED: "Aplicado",
  COMPLETED: "Finalizado",
  EXPIRED: "Expirado",
  REJECTED: "Rechazado",
};

function durationLabel(days: number): string {
  if (days === 7) return "1 semana";
  return `${days} días`;
}

/** Plan historial (handoff §5.2 /tareas/plan/historial, replaces plans.tsx). */
export function PlanHistorialView(): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const plansQuery = usePlanHistory();
  const plans = plansQuery.data ?? [];

  if (plansQuery.isLoading) {
    return (
      <View style={styles.container}>
        <Skeleton height={80} />
        <Skeleton height={80} />
      </View>
    );
  }

  if (plansQuery.isError) {
    return (
      <View style={styles.container}>
        <Banner tone="attention" text="No pudimos cargar el historial." />
        <Button label="Reintentar" variant="link" onPress={() => void plansQuery.refetch()} />
      </View>
    );
  }

  if (plans.length === 0) {
    return <EmptyState title="Sin planes anteriores" description="Cuando apliques un plan, va a aparecer acá." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {plans.map((plan) => (
        <View key={plan.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Plan de {durationLabel(plan.durationDays)}</Text>
            <Text style={styles.cardStatus}>{STATUS_LABELS[plan.status]}</Text>
          </View>
          <Text style={styles.cardMeta}>
            {new Date(plan.createdAt).toLocaleDateString("es-AR")} · {plan.assignments.length} tareas · {plan.balanceScore}% equidad
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
    },
    content: {
      gap: spacing.md,
      paddingBottom: spacing.xxl,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: spacing.lg,
      gap: 4,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    cardTitle: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 15,
      color: c.ink,
    },
    cardStatus: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 13,
      color: c.ink2,
    },
    cardMeta: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.ink2,
    },
  });
}
