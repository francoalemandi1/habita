import { useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useSuggestTasks } from "@/hooks/use-suggest-tasks";
import { useCreateTask } from "@/hooks/use-task-management";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { useThemeColors } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StyledTextInput } from "@/components/ui/text-input";
import { SecondaryHeader } from "@/components/ui/secondary-header";
import { fontFamily, spacing } from "@/theme";
import { Check } from "lucide-react-native";

import type { ThemeColors } from "@/theme";
import type { SuggestedTask, TaskCategoryGroup } from "@/hooks/use-suggest-tasks";

const FREQ_LABELS: Record<SuggestedTask["frequency"], string> = {
  DAILY: "Diaria", WEEKLY: "Semanal", BIWEEKLY: "Quincenal", MONTHLY: "Mensual", ONCE: "Única",
};

const taskKey = (catName: string, taskName: string) => `${catName}::${taskName}`;

function CategorySection({
  category,
  selectedKeys,
  onToggle,
}: {
  category: TaskCategoryGroup;
  selectedKeys: Set<string>;
  onToggle: (catName: string, taskName: string) => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
          {category.tasks.map((task, i) => {
            const key = taskKey(category.name, task.name);
            const selected = selectedKeys.has(key);
            return (
              <Pressable
                key={i}
                onPress={() => onToggle(category.name, task.name)}
                style={[styles.taskItem, selected && styles.taskItemSelected]}
              >
                <Text style={styles.taskIcon}>{task.icon}</Text>
                <View style={styles.taskInfo}>
                  <Text style={styles.taskName}>{task.name}</Text>
                  <View style={styles.taskMeta}>
                    <Text style={styles.taskMetaText}>{FREQ_LABELS[task.frequency]}</Text>
                    <Text style={styles.taskMetaText}>~{task.estimatedMinutes} min · Peso {task.weight}</Text>
                  </View>
                  {task.reason ? <Text style={styles.taskReason}>{"\u2728"} {task.reason}</Text> : null}
                </View>
                <View style={[styles.taskCheck, selected && styles.taskCheckSelected]}>
                  {selected ? <Check size={12} color="#fff" strokeWidth={3} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function SuggestTasksScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  // Tab bar: 58px bar + 8px paddingTop + platform bottom padding
  const tabBarHeight = 58 + 8 + (Platform.OS === "ios" ? 24 : 12);
  const stickyBottom = tabBarHeight + insets.bottom;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [hasChildren, setHasChildren] = useState(false);
  const [hasPets, setHasPets] = useState(false);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [addResult, setAddResult] = useState<{ added: number; errors: number } | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const suggestM = useSuggestTasks();
  const createTask = useCreateTask();

  const handleGenerate = () => {
    setSelectedKeys(new Set());
    setAddResult(null);
    suggestM.mutate({ hasChildren, hasPets, location: location.trim() || undefined, householdDescription: description.trim() || undefined });
  };

  const toggleTask = (catName: string, taskName: string) => {
    const key = taskKey(catName, taskName);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleAddSelected = async () => {
    if (!suggestM.data) return;
    setAddLoading(true);
    setAddResult(null);

    const toAdd = suggestM.data.categories.flatMap((cat) =>
      cat.tasks
        .filter((t) => selectedKeys.has(taskKey(cat.name, t.name)))
        .map((t) => ({
          name: t.name,
          frequency: t.frequency,
          weight: t.weight,
          estimatedMinutes: t.estimatedMinutes,
          isRouletteEligible: false,
        }))
    );

    const results = await Promise.allSettled(
      toAdd.map((task) => createTask.mutateAsync(task))
    );

    const added = results.filter((r) => r.status === "fulfilled").length;
    const errors = results.filter((r) => r.status === "rejected").length;
    setAddResult({ added, errors });
    if (added > 0) setSelectedKeys(new Set());
    setAddLoading(false);
  };

  const categories = suggestM.data?.categories ?? [];
  const insights = suggestM.data?.insights ?? [];
  const totalTasks = categories.reduce((sum, c) => sum + c.tasks.length, 0);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <SecondaryHeader title="Sugerencias de tareas" />
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

        {addResult ? (
          <Card style={addResult.errors > 0 ? styles.warnCard : styles.successCard}>
            <CardContent>
              <Text style={addResult.errors > 0 ? styles.warnText : styles.successText}>
                {addResult.added > 0 ? `✓ ${addResult.added} ${addResult.added === 1 ? "tarea agregada" : "tareas agregadas"} al listado. ` : ""}
                {addResult.errors > 0 ? `${addResult.errors} no ${addResult.errors === 1 ? "pudo" : "pudieron"} agregarse (puede que ya existan).` : ""}
              </Text>
            </CardContent>
          </Card>
        ) : null}

        {insights.length > 0 ? (
          <Card style={styles.insightsCard}><CardContent>{insights.map((insight, i) => <Text key={i} style={styles.insightText}>{"\u2728"} {insight}</Text>)}</CardContent></Card>
        ) : null}

        {categories.length > 0 ? (
          <View style={styles.results}>
            <Text style={styles.resultsTitle}>{totalTasks} tareas sugeridas en {categories.length} categorías</Text>
            <Text style={styles.resultsHint}>Tocá las que quieras agregar a tu listado</Text>
            {categories.map((cat) => (
              <CategorySection
                key={cat.name}
                category={cat}
                selectedKeys={selectedKeys}
                onToggle={toggleTask}
              />
            ))}
          </View>
        ) : null}

        {!suggestM.isPending && !suggestM.data && !suggestM.isError ? (
          <EmptyState icon={<Text style={{ fontSize: 48 }}>{"\uD83C\uDFE0"}</Text>} title="Tu catálogo personalizado" subtitle={"Configurá tu hogar y generamos\nun catálogo de tareas personalizado."} />
        ) : null}

        <View style={{ height: selectedKeys.size > 0 ? 100 : 40 }} />
      </ScrollView>

      {/* Sticky add bar */}
      {selectedKeys.size > 0 && (
        <View style={[styles.stickyBar, { bottom: stickyBottom }]}>
          <Button onPress={() => void handleAddSelected()} loading={addLoading} style={styles.addButton}>
            {addLoading
              ? "Agregando..."
              : `Agregar ${selectedKeys.size} ${selectedKeys.size === 1 ? "tarea" : "tareas"} al listado`}
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 24 },
    subtitle: { fontFamily: fontFamily.sans, fontSize: 14, color: c.mutedForeground, marginBottom: spacing.md },
    formCard: { marginBottom: spacing.md },
    toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.sm },
    toggleRowBorder: { borderTopWidth: 1, borderTopColor: c.border },
    toggleLabel: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    toggleEmoji: { fontFamily: fontFamily.sans, fontSize: 18 },
    toggleText: { fontFamily: fontFamily.sans, fontSize: 14, color: c.text },
    field: { marginBottom: spacing.md },
    generateButton: { marginBottom: spacing.md, width: "100%" },
    errorCard: { backgroundColor: c.errorBg, marginBottom: spacing.md },
    errorText: { fontFamily: fontFamily.sans, color: c.errorText, fontSize: 13 },
    successCard: { backgroundColor: "#f0fdf4", borderLeftWidth: 3, borderLeftColor: "#16a34a", marginBottom: spacing.md },
    successText: { fontFamily: fontFamily.sans, color: "#15803d", fontSize: 13 },
    warnCard: { backgroundColor: "#fefce8", borderLeftWidth: 3, borderLeftColor: "#ca8a04", marginBottom: spacing.md },
    warnText: { fontFamily: fontFamily.sans, color: "#92400e", fontSize: 13 },
    insightsCard: { backgroundColor: "#f5f3ff", borderLeftWidth: 3, borderLeftColor: "#7c3aed", marginBottom: spacing.md },
    insightText: { fontFamily: fontFamily.sans, color: "#5b21b6", fontSize: 13, marginBottom: 4 },
    results: { marginBottom: spacing.xl },
    resultsTitle: { fontFamily: fontFamily.sans, fontWeight: "700", color: c.text, fontSize: 16, marginBottom: 4 },
    resultsHint: { fontFamily: fontFamily.sans, fontSize: 12, color: c.mutedForeground, marginBottom: spacing.md },
    categorySection: { marginBottom: spacing.md },
    categoryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm },
    categoryHeaderLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    categoryIcon: { fontFamily: fontFamily.sans, fontSize: 20 },
    categoryLabel: { fontFamily: fontFamily.sans, fontWeight: "700", color: c.text, fontSize: 15 },
    categoryCount: { backgroundColor: c.muted, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
    categoryCountText: { fontFamily: fontFamily.sans, fontSize: 11, color: c.mutedForeground },
    categoryChevron: { color: c.mutedForeground },
    taskList: { gap: spacing.sm },
    taskItem: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, backgroundColor: c.muted, borderRadius: 10, padding: 12 },
    taskItemSelected: { backgroundColor: `${c.primary}15`, borderWidth: 1, borderColor: `${c.primary}40` },
    taskIcon: { fontFamily: fontFamily.sans, fontSize: 18, marginTop: 1 },
    taskInfo: { flex: 1 },
    taskName: { fontFamily: fontFamily.sans, fontWeight: "600", color: c.text, fontSize: 14 },
    taskMeta: { flexDirection: "row", gap: spacing.sm, marginTop: 4 },
    taskMetaText: { fontFamily: fontFamily.sans, fontSize: 11, color: c.mutedForeground },
    taskReason: { fontFamily: fontFamily.sans, fontSize: 11, color: "#7c3aed", marginTop: 3 },
    taskCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: c.border, alignItems: "center", justifyContent: "center", marginTop: 1 },
    taskCheckSelected: { backgroundColor: c.primary, borderColor: c.primary },
    stickyBar: { position: "absolute", left: 0, right: 0, backgroundColor: c.background, borderTopWidth: 1, borderTopColor: c.border, padding: spacing.lg },
    addButton: { width: "100%" },
  });
}
