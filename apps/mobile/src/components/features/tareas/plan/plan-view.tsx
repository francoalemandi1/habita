import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, EmptyState } from "@/components/ds";
import { mobileApi } from "@/lib/api";
import { useAiJobStatus } from "@/hooks/use-ai-job-status";
import { useApplyWeeklyPlan, useDiscardWeeklyPlan, usePreviewWeeklyPlan } from "@/hooks/use-weekly-plan";
import { useTasks } from "@/hooks/use-task-management";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { buildMinutesByTaskName, getPlanWeekRange, groupPlanByMember } from "@/lib/tareas-plan";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { PlanPersonCard } from "./plan-person-card";

import type { ThemeColors } from "@/theme";
import type { PlanPreviewResponse } from "@habita/contracts";

/** Plan semanal full-screen flow (handoff §5.3): one card per person, notes, "Otra" + "Aplicar plan". */
export function PlanView(): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const previewPlan = usePreviewWeeklyPlan();
  const applyPlan = useApplyWeeklyPlan();
  const discardPlan = useDiscardWeeklyPlan();
  const tasksQuery = useTasks();
  const [planResult, setPlanResult] = useState<PlanPreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasStartedRef = useRef(false);

  const { isRunning, refetchStatus } = useAiJobStatus({
    jobType: "PREVIEW_PLAN",
    onComplete: async (jobId) => {
      try {
        const result = await mobileApi.get<{ resultData: PlanPreviewResponse }>(`/api/ai/job-result/${jobId}`);
        setPlanResult(result.resultData);
      } catch {
        setError("No pudimos cargar el plan generado");
      }
    },
    onError: (message) => setError(message ?? "No pudimos armar el plan"),
  });

  // Only the async mutation lives here (no setState before the first `await`),
  // so the mount effect below never calls setState synchronously — resetting
  // `error`/`planResult` for a retry is the caller's job (see handleDiscardAndRetry).
  const runPreview = useCallback(async (): Promise<void> => {
    try {
      const { startDate, endDate } = getPlanWeekRange(new Date());
      await previewPlan.mutateAsync({ startDate, endDate });
      await refetchStatus();
    } catch (err) {
      setError(getMobileErrorMessage(err));
    }
  }, [previewPlan, refetchStatus]);

  useEffect(() => {
    if (hasStartedRef.current) return;
    // Deferred: runPreview() eventually calls setState (on error), and that
    // must happen from a callback, not synchronously inside the effect body.
    // The guard flips inside the callback: a StrictMode double mount clears the
    // first timer, so flipping it earlier would skip the preview entirely.
    const timer = setTimeout(() => {
      hasStartedRef.current = true;
      void runPreview();
    }, 0);
    return () => clearTimeout(timer);
  }, [runPreview]);

  async function handleApply(): Promise<void> {
    if (!planResult) return;
    try {
      await applyPlan.mutateAsync({ planId: planResult.plan.id, assignments: planResult.plan.assignments });
      router.back();
    } catch (err) {
      setError(getMobileErrorMessage(err));
    }
  }

  function handleDiscardAndRetry(): void {
    if (planResult) {
      discardPlan.mutateAsync(planResult.plan.id).catch((err) => {
        console.warn("[PlanView] failed to discard the previous plan before retrying", err);
      });
    }
    setError(null);
    setPlanResult(null);
    void runPreview();
  }

  const isLoading = previewPlan.isPending || isRunning;
  const plan = planResult?.plan;
  const byMember = useMemo(() => groupPlanByMember(plan?.assignments ?? []), [plan]);
  const minutesByTaskName = useMemo(() => buildMinutesByTaskName(tasksQuery.data?.tasks ?? []), [tasksQuery.data]);
  const range = plan ? `${new Date(plan.startDate).toLocaleDateString("es-AR")} → ${new Date(plan.endDate).toLocaleDateString("es-AR")}` : "";

  if (isLoading) {
    return <EmptyState title="Armando el plan" description="Podés seguir usando la app mientras tanto." />;
  }

  if (error && !plan) {
    return (
      <EmptyState
        title="Hoy no podemos armar el plan automático"
        description="Podés repartir con rotaciones o asignar a mano."
        actionLabel="Repartir con rotaciones"
        onAction={() => router.replace("/(app)/tareas/rotaciones")}
      />
    );
  }

  if (!plan) return <View style={styles.container} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Plan de la semana</Text>
      <Text style={styles.subtitle}>{range} · {plan.assignments.length} tareas</Text>

      {Array.from(byMember.entries()).map(([memberId, assignments]) => (
        <PlanPersonCard key={memberId} assignments={assignments} minutesByTaskName={minutesByTaskName} />
      ))}

      {plan.notes.length > 0 ? (
        <View style={styles.notes}>
          {plan.notes.map((note) => (
            <Text key={note} style={styles.noteText}>· {note}</Text>
          ))}
        </View>
      ) : null}

      <View style={styles.footer}>
        <Button label="Otra" variant="secondary" onPress={handleDiscardAndRetry} style={styles.footerButton} />
        <Button label="Aplicar plan" onPress={() => void handleApply()} loading={applyPlan.isPending} style={styles.footerButton} />
      </View>
      <Pressable onPress={() => router.push("/(app)/tareas/plan/historial")}>
        <Text style={styles.historialLink}>Ver historial de planes</Text>
      </Pressable>
    </ScrollView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.paper,
    },
    content: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxl,
      gap: spacing.md,
    },
    title: {
      fontFamily: fontFamilyForWeight(700),
      fontSize: 32,
      color: c.ink,
    },
    subtitle: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 15,
      color: c.ink2,
    },
    notes: {
      gap: 4,
    },
    noteText: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.ink2,
    },
    footer: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    footerButton: {
      flex: 1,
    },
    historialLink: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 13,
      color: c.ink2,
      textAlign: "center",
      textDecorationLine: "underline",
    },
  });
}
