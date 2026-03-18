import { useMemo } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePreferences, useRemovePreference, useSetPreference } from "@/hooks/use-preferences";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useThemeColors } from "@/hooks/use-theme";
import { SecondaryHeader } from "@/components/ui/secondary-header";
import { fontFamily, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";
import type { MemberPreference, PreferenceValue } from "@/hooks/use-preferences";

const FREQ_LABELS: Record<string, string> = { DAILY: "Diaria", WEEKLY: "Semanal", BIWEEKLY: "Quincenal", MONTHLY: "Mensual", ONCE: "Una vez" };

interface TaskRowProps {
  pref: MemberPreference; onSet: (taskId: string, value: PreferenceValue) => void; onRemove: (taskId: string) => void; isLoading: boolean;
}

function TaskRow({ pref, onSet, onRemove, isLoading }: TaskRowProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isPreferred = pref.preference === "PREFERRED";
  const isDisliked = pref.preference === "DISLIKED";
  return (
    <View style={styles.taskRow}>
      <View style={styles.taskRowInfo}>
        <Text style={styles.taskRowName}>{pref.task.name}</Text>
        <Text style={styles.taskRowMeta}>{FREQ_LABELS[pref.task.frequency] ?? pref.task.frequency} \u00B7 Peso {pref.task.weight}</Text>
      </View>
      <View style={styles.taskRowActions}>
        <Pressable onPress={() => isPreferred ? onRemove(pref.taskId) : onSet(pref.taskId, "PREFERRED")} disabled={isLoading}
          style={[styles.prefBtn, isPreferred && styles.prefBtnActive]}>
          <Text style={styles.prefBtnText}>\uD83D\uDC4D</Text>
        </Pressable>
        <Pressable onPress={() => isDisliked ? onRemove(pref.taskId) : onSet(pref.taskId, "DISLIKED")} disabled={isLoading}
          style={[styles.prefBtn, isDisliked && styles.dislikeBtnActive]}>
          <Text style={styles.prefBtnText}>\uD83D\uDC4E</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function PreferencesScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const prefsQuery = usePreferences();
  const setM = useSetPreference();
  const removeM = useRemovePreference();
  const isLoading = setM.isPending || removeM.isPending;
  const handleSet = (taskId: string, preference: PreferenceValue) => setM.mutate({ taskId, preference });
  const handleRemove = (taskId: string) => removeM.mutate(taskId);
  const preferred = prefsQuery.data?.preferred ?? [];
  const disliked = prefsQuery.data?.disliked ?? [];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <SecondaryHeader title="Mis preferencias" />
      <ScrollView bounces={false} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={prefsQuery.isRefetching} onRefresh={() => void prefsQuery.refetch()} tintColor={colors.primary} />}
      >
        <Text style={styles.subtitle}>Indic\u00E1 qu\u00E9 tareas te gustan o evit\u00E1s. El algoritmo de asignaci\u00F3n las toma en cuenta.</Text>
        {prefsQuery.data && (
          <View style={styles.statRow}>
            <Card style={[styles.statCard, { borderColor: colors.successBg }]}><CardContent><Text style={[styles.statNum, { color: colors.successText }]}>{prefsQuery.data.stats.preferredCount}</Text><Text style={styles.statLabel}>\uD83D\uDC4D Me gustan</Text></CardContent></Card>
            <Card style={[styles.statCard, { borderColor: colors.errorBg }]}><CardContent><Text style={[styles.statNum, { color: colors.errorText }]}>{prefsQuery.data.stats.dislikedCount}</Text><Text style={styles.statLabel}>\uD83D\uDC4E Prefiero evitar</Text></CardContent></Card>
          </View>
        )}
        {prefsQuery.isLoading ? <SkeletonCard /> : null}
        {prefsQuery.isError ? <Card style={styles.errorCard}><CardContent><Text style={styles.errorText}>{getMobileErrorMessage(prefsQuery.error)}</Text></CardContent></Card> : null}
        {preferred.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.successText }]}>\uD83D\uDC4D Me gustan ({preferred.length})</Text>
            <Card><CardContent style={styles.taskList}>{preferred.map((pref) => <TaskRow key={pref.id} pref={pref} onSet={handleSet} onRemove={handleRemove} isLoading={isLoading} />)}</CardContent></Card>
          </View>
        )}
        {disliked.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.errorText }]}>\uD83D\uDC4E Prefiero evitar ({disliked.length})</Text>
            <Card><CardContent style={styles.taskList}>{disliked.map((pref) => <TaskRow key={pref.id} pref={pref} onSet={handleSet} onRemove={handleRemove} isLoading={isLoading} />)}</CardContent></Card>
          </View>
        )}
        {!prefsQuery.isLoading && preferred.length === 0 && disliked.length === 0 && !prefsQuery.isError ? (
          <EmptyState icon={<Text style={{ fontSize: 40 }}>\uD83C\uDFAF</Text>} title="Sin preferencias configuradas" subtitle={"Las preferencias aparecen ac\u00E1 cuando marc\u00E1s tareas desde la secci\u00F3n Tareas.\nEl \uD83D\uDC4D/\uD83D\uDC4E est\u00E1 disponible en el detalle de cada tarea."} />
        ) : null}
        {!prefsQuery.isLoading && (preferred.length > 0 || disliked.length > 0) ? (
          <Card style={styles.hintCard}><CardContent><Text style={styles.hintText}>\uD83D\uDCA1 Toc\u00E1 \uD83D\uDC4D o \uD83D\uDC4E para cambiar o eliminar una preferencia.</Text></CardContent></Card>
        ) : null}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 24 },
    subtitle: { fontFamily: fontFamily.sans, fontSize: 14, color: c.mutedForeground, marginBottom: spacing.md },
    statRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
    statCard: { flex: 1 },
    statNum: { fontFamily: fontFamily.sans, fontSize: 22, fontWeight: "800" },
    statLabel: { fontFamily: fontFamily.sans, fontSize: 12, color: c.mutedForeground, marginTop: 2 },
    errorCard: { backgroundColor: c.errorBg },
    errorText: { fontFamily: fontFamily.sans, color: c.errorText, fontSize: 14 },
    section: { marginBottom: spacing.md },
    sectionTitle: { fontWeight: "700", marginBottom: spacing.sm },
    taskList: { padding: 0 },
    taskRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border, gap: spacing.sm },
    taskRowInfo: { flex: 1 },
    taskRowName: { fontFamily: fontFamily.sans, fontWeight: "600", color: c.text, fontSize: 14 },
    taskRowMeta: { fontFamily: fontFamily.sans, color: c.mutedForeground, fontSize: 12, marginTop: 1 },
    taskRowActions: { flexDirection: "row", gap: spacing.sm },
    prefBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: c.muted },
    prefBtnActive: { backgroundColor: c.successBg, borderWidth: 1.5, borderColor: c.successText },
    dislikeBtnActive: { backgroundColor: c.errorBg, borderWidth: 1.5, borderColor: c.errorText },
    prefBtnText: { fontFamily: fontFamily.sans, fontSize: 16 },
    hintCard: { backgroundColor: c.primaryLight, borderLeftWidth: 3, borderLeftColor: c.primary },
    hintText: { fontFamily: fontFamily.sans, fontSize: 12, color: c.infoText },
  });
}
