import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useSuggestTasks } from "@/hooks/use-suggest-tasks";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StyledTextInput } from "@/components/ui/text-input";
import { colors, fontFamily, spacing, typography } from "@/theme";
import type { SuggestedTask, TaskCategory } from "@/hooks/use-suggest-tasks";

const FREQ_LABELS: Record<SuggestedTask["frequency"], string> = {
  DAILY: "Diaria", WEEKLY: "Semanal", BIWEEKLY: "Quincenal", MONTHLY: "Mensual",
};

function CategorySection({ category }: { category: TaskCategory }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <View style={styles.categorySection}>
      <Pressable onPress={() => setExpanded((v) => !v)} style={styles.categoryHeader}>
        <View style={styles.categoryHeaderLeft}>
          <Text style={styles.categoryIcon}>{category.icon}</Text>
          <Text style={styles.categoryLabel}>{category.label}</Text>
          <View style={styles.categoryCount}><Text style={styles.categoryCountText}>{category.tasks.length}</Text></View>
        </View>
        <Text style={styles.categoryChevron}>{expanded ? "\u25B2" : "\u25BC"}</Text>
      </Pressable>
      {expanded && (
        <View style={styles.taskList}>
          {category.tasks.map((task, i) => (
            <View key={i} style={styles.taskItem}>
              <Text style={styles.taskIcon}>{task.icon}</Text>
              <View style={styles.taskInfo}>
                <Text style={styles.taskName}>{task.name}</Text>
                <View style={styles.taskMeta}>
                  <Text style={styles.taskMetaText}>{FREQ_LABELS[task.frequency]}</Text>
                  <Text style={styles.taskMetaText}>~{task.estimatedMinutes} min · Peso {task.weight}</Text>
                </View>
                {task.reason ? <Text style={styles.taskReason}>\u2728 {task.reason}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function SuggestTasksScreen() {
  const [hasChildren, setHasChildren] = useState(false);
  const [hasPets, setHasPets] = useState(false);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const suggestM = useSuggestTasks();

  const handleGenerate = () => {
    suggestM.mutate({ hasChildren, hasPets, location: location.trim() || undefined, householdDescription: description.trim() || undefined });
  };

  const categories = suggestM.data?.categories ?? [];
  const insights = suggestM.data?.insights ?? [];
  const totalTasks = categories.reduce((sum, c) => sum + c.tasks.length, 0);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.backRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text style={styles.backTitle}>Sugerencias de tareas</Text>
        <View style={styles.backBtn} />
      </View>
      <ScrollView bounces={false} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>Contános sobre tu hogar y te sugerimos el catálogo ideal de tareas.</Text>
        <Card style={styles.formCard}>
          <CardContent>
            {[
              { label: "Hay niños en el hogar", value: hasChildren, onToggle: setHasChildren, emoji: "\uD83D\uDC76" },
              { label: "Hay mascotas", value: hasPets, onToggle: setHasPets, emoji: "\uD83D\uDC3E" },
            ].map((row, i) => (
              <View key={row.label} style={[styles.toggleRow, i > 0 && styles.toggleRowBorder]}>
                <View style={styles.toggleLabel}><Text style={styles.toggleEmoji}>{row.emoji}</Text><Text style={styles.toggleText}>{row.label}</Text></View>
                <Switch value={row.value} onValueChange={row.onToggle} trackColor={{ false: colors.border, true: colors.primary }} />
              </View>
            ))}
          </CardContent>
        </Card>
        <StyledTextInput label="Ciudad / zona (opcional)" placeholder="ej: Buenos Aires, Palermo" value={location} onChangeText={setLocation} style={styles.field} />
        <StyledTextInput label="Descripción del hogar (opcional)" placeholder="ej: Apartamento de 3 ambientes..." value={description} onChangeText={setDescription} multiline numberOfLines={3} style={[styles.field, { minHeight: 80, textAlignVertical: "top" }]} />
        <Button onPress={handleGenerate} loading={suggestM.isPending} style={styles.generateButton}>
          {suggestM.isPending ? "Generando sugerencias..." : "Sugerir tareas \u2728"}
        </Button>
        {suggestM.isError ? (
          <Card style={styles.errorCard}><CardContent><Text style={styles.errorText}>{getMobileErrorMessage(suggestM.error)}</Text></CardContent></Card>
        ) : null}
        {insights.length > 0 ? (
          <Card style={styles.insightsCard}><CardContent>{insights.map((insight, i) => <Text key={i} style={styles.insightText}>\u2728 {insight}</Text>)}</CardContent></Card>
        ) : null}
        {categories.length > 0 ? (
          <View style={styles.results}>
            <Text style={styles.resultsTitle}>{totalTasks} tareas sugeridas en {categories.length} categorías</Text>
            {categories.map((cat) => <CategorySection key={cat.name} category={cat} />)}
          </View>
        ) : null}
        {!suggestM.isPending && !suggestM.data && !suggestM.isError ? (
          <EmptyState icon={<Text style={{ fontSize: 48 }}>\uD83C\uDFE0</Text>} title="Tu catálogo personalizado" subtitle={"Configurá tu hogar y generamos\nun catálogo de tareas personalizado."} />
        ) : null}
        <View style={{ height: 40 }} />
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
  formCard: { marginBottom: spacing.md },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.sm },
  toggleRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  toggleLabel: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  toggleEmoji: { fontFamily: fontFamily.sans, fontSize: 18 },
  toggleText: { fontFamily: fontFamily.sans, fontSize: 14, color: colors.text },
  field: { marginBottom: spacing.md },
  generateButton: { marginBottom: spacing.md, width: "100%" },
  errorCard: { backgroundColor: colors.errorBg, marginBottom: spacing.md },
  errorText: { fontFamily: fontFamily.sans, color: colors.errorText, fontSize: 13 },
  insightsCard: { backgroundColor: "#f5f3ff", borderLeftWidth: 3, borderLeftColor: "#7c3aed", marginBottom: spacing.md },
  insightText: { fontFamily: fontFamily.sans, color: "#5b21b6", fontSize: 13, marginBottom: 4 },
  results: { marginBottom: spacing.xl },
  resultsTitle: { fontFamily: fontFamily.sans, fontWeight: "700", color: colors.text, fontSize: 16, marginBottom: spacing.md },
  categorySection: { marginBottom: spacing.md },
  categoryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm },
  categoryHeaderLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  categoryIcon: { fontFamily: fontFamily.sans, fontSize: 20 },
  categoryLabel: { fontFamily: fontFamily.sans, fontWeight: "700", color: colors.text, fontSize: 15 },
  categoryCount: { backgroundColor: colors.muted, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  categoryCountText: { fontFamily: fontFamily.sans, fontSize: 11, color: colors.mutedForeground },
  categoryChevron: { color: colors.mutedForeground },
  taskList: { gap: spacing.sm },
  taskItem: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, backgroundColor: colors.muted, borderRadius: 10, padding: 12 },
  taskIcon: { fontFamily: fontFamily.sans, fontSize: 18, marginTop: 1 },
  taskInfo: { flex: 1 },
  taskName: { fontFamily: fontFamily.sans, fontWeight: "600", color: colors.text, fontSize: 14 },
  taskMeta: { flexDirection: "row", gap: spacing.sm, marginTop: 4 },
  taskMetaText: { fontFamily: fontFamily.sans, fontSize: 11, color: colors.mutedForeground },
  taskReason: { fontFamily: fontFamily.sans, fontSize: 11, color: "#7c3aed", marginTop: 3 },
});
