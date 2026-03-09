import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { BookOpen, ChevronDown, ChevronUp, Clock, UserCheck } from "lucide-react-native";
import { useTaskCatalog, useCreateTask, useCreateAssignment } from "@/hooks/use-task-management";
import { useMembers } from "@/hooks/use-members";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StyledTextInput } from "@/components/ui/text-input";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { useThemeColors } from "@/hooks/use-theme";
import { SecondaryHeader } from "@/components/ui/secondary-header";
import { fontFamily, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";
import type { CatalogTask } from "@/hooks/use-task-management";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function dueDateToIso(dateValue: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return null;
  const parsed = new Date(`${dateValue}T09:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

interface AssignSheetProps {
  task: CatalogTask;
  onClose: () => void;
}

function AssignSheet({ task, onClose }: AssignSheetProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const membersQuery = useMembers();
  const createTask = useCreateTask();
  const createAssignment = useCreateAssignment();

  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [dueDate, setDueDate] = useState(todayIsoDate());
  const [error, setError] = useState<string | null>(null);

  const members = membersQuery.data?.members ?? [];
  const isSubmitting = createTask.isPending || createAssignment.isPending;

  const handleAssign = async () => {
    setError(null);
    if (!selectedMemberId) { setError("Seleccion\u00E1 un miembro."); return; }
    const dueDateIso = dueDateToIso(dueDate);
    if (!dueDateIso) { setError("Fecha inv\u00E1lida."); return; }

    try {
      const created = await createTask.mutateAsync({
        name: task.name,
        frequency: task.defaultFrequency as "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "ONCE",
        weight: task.defaultWeight,
        estimatedMinutes: task.estimatedMinutes ?? undefined,
        minAge: task.minAge ?? undefined,
        isRouletteEligible: false,
      });
      await createAssignment.mutateAsync({
        taskId: created.task.id,
        memberId: selectedMemberId,
        dueDate: dueDateIso,
      });
      router.replace("/(app)/tasks");
    } catch (err) {
      setError(getMobileErrorMessage(err));
    }
  };

  return (
    <BottomSheet visible onClose={onClose}>
      <Text style={styles.sheetTitle}>{task.name}</Text>
      {task.estimatedMinutes ? (
        <View style={styles.taskMeta}>
          <Clock size={14} color={colors.mutedForeground} />
          <Text style={styles.taskMetaText}>~{task.estimatedMinutes} min \u00B7 Peso {task.defaultWeight}</Text>
        </View>
      ) : null}

      <Text style={styles.fieldLabel}>Asignar a</Text>
      {membersQuery.isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      ) : (
        <View style={styles.memberList}>
          {members.map((member) => (
            <Button
              key={member.id}
              variant={member.id === selectedMemberId ? "default" : "outline"}
              onPress={() => setSelectedMemberId(member.id)}
              style={styles.memberButton}
            >
              <UserCheck size={14} color={member.id === selectedMemberId ? "#fff" : colors.mutedForeground} />
              {member.name}
            </Button>
          ))}
        </View>
      )}

      <Text style={styles.fieldLabel}>Vencimiento</Text>
      <StyledTextInput
        value={dueDate}
        onChangeText={setDueDate}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
        style={styles.dateInput}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.sheetActions}>
        <Button variant="outline" onPress={onClose} style={styles.cancelButton}>Cancelar</Button>
        <Button
          loading={isSubmitting}
          disabled={!selectedMemberId || isSubmitting}
          onPress={() => void handleAssign()}
          style={styles.assignButton}
        >
          Asignar
        </Button>
      </View>
    </BottomSheet>
  );
}

export default function TaskCatalogScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { data, isLoading, isError, error } = useTaskCatalog();
  const [search, setSearch] = useState("");
  const [selectedTask, setSelectedTask] = useState<CatalogTask | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!data) return [];
    const query = search.trim().toLowerCase();
    if (!query) return data.categories;

    return data.categories
      .map((cat) => ({ ...cat, tasks: cat.tasks.filter((t) => t.name.toLowerCase().includes(query)) }))
      .filter((cat) => cat.tasks.length > 0);
  }, [data, search]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <SecondaryHeader title="Catálogo de tareas" />
      <View style={styles.header}>
        <StyledTextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar tarea..."
          style={styles.searchInput}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <Card style={styles.errorCard}>
          <CardContent><Text style={styles.errorText}>{getMobileErrorMessage(error)}</Text></CardContent>
        </Card>
      ) : (
        <ScrollView
          bounces={false}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {filtered.map((category) => {
            const isExpanded = expandedCategories.has(category.category);
            return (
              <View key={category.category} style={styles.categoryContainer}>
                <Button
                  variant="outline"
                  onPress={() => toggleCategory(category.category)}
                  style={styles.categoryHeader}
                >
                  <Text style={styles.categoryLabel}>{category.icon} {category.label}</Text>
                  <View style={styles.categoryRight}>
                    <Text style={styles.categoryCount}>{category.tasks.length} tareas</Text>
                    {isExpanded
                      ? <ChevronUp size={16} color={colors.mutedForeground} />
                      : <ChevronDown size={16} color={colors.mutedForeground} />
                    }
                  </View>
                </Button>

                {isExpanded ? (
                  <Card style={styles.taskListCard}>
                    {category.tasks.map((task, index) => (
                      <View
                        key={task.name}
                        style={[styles.taskRow, index < category.tasks.length - 1 && styles.taskBorder]}
                      >
                        <View style={styles.taskInfo}>
                          <Text style={styles.taskName}>{task.name}</Text>
                          {task.estimatedMinutes ? (
                            <View style={styles.taskMeta}>
                              <Clock size={11} color={colors.mutedForeground} />
                              <Text style={styles.taskMetaSmall}>~{task.estimatedMinutes} min</Text>
                            </View>
                          ) : null}
                        </View>
                        <Button size="sm" onPress={() => setSelectedTask(task)}>Asignar</Button>
                      </View>
                    ))}
                  </Card>
                ) : null}
              </View>
            );
          })}

          {!isLoading && filtered.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={32} color={colors.mutedForeground} />}
              title="Sin resultados"
              subtitle={`No hay tareas que coincidan con "${search}".`}
            />
          ) : null}
        </ScrollView>
      )}

      {selectedTask ? (
        <AssignSheet task={selectedTask} onClose={() => setSelectedTask(null)} />
      ) : null}
    </SafeAreaView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
    searchInput: { marginBottom: 0 },
    loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 24, gap: spacing.xs },
    errorCard: { backgroundColor: c.errorBg, margin: spacing.lg },
    errorText: { fontFamily: fontFamily.sans, color: c.errorText, fontSize: 13 },
    categoryContainer: { gap: spacing.xs },
    categoryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    categoryLabel: { fontFamily: fontFamily.sans, fontWeight: "700", color: c.text, fontSize: 14 },
    categoryRight: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
    categoryCount: { fontFamily: fontFamily.sans, fontSize: 12, color: c.mutedForeground },
    taskListCard: { marginTop: 2 },
    taskRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm },
    taskBorder: { borderBottomWidth: 1, borderBottomColor: c.border },
    taskInfo: { flex: 1, marginRight: spacing.sm },
    taskName: { fontFamily: fontFamily.sans, color: c.text, fontWeight: "500", fontSize: 14 },
    taskMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
    taskMetaText: { fontFamily: fontFamily.sans, fontSize: 13, color: c.mutedForeground },
    taskMetaSmall: { fontFamily: fontFamily.sans, fontSize: 11, color: c.mutedForeground },
    loading: { marginVertical: spacing.lg },
    memberList: { gap: spacing.xs, marginBottom: spacing.md },
    memberButton: { justifyContent: "flex-start" },
    sheetTitle: { fontFamily: fontFamily.sans, fontSize: 17, fontWeight: "700", color: c.text, marginBottom: spacing.xs },
    fieldLabel: { fontFamily: fontFamily.sans, fontSize: 13, fontWeight: "600", color: c.text, marginBottom: spacing.xs, marginTop: spacing.sm },
    dateInput: { marginBottom: spacing.sm },
    sheetActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
    cancelButton: { flex: 1 },
    assignButton: { flex: 2 },
  });
}
