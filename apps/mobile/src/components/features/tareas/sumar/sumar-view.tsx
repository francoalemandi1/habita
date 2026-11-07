import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check, Plus } from "lucide-react-native";
import { Button, Chip, EmptyState } from "@/components/ds";
import { useCreateTask } from "@/hooks/use-task-management";
import { useSuggestTasks } from "@/hooks/use-suggest-tasks";
import { openAnotar } from "@/lib/anotar-store";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";
import type { TaskCategoryGroup } from "@habita/contracts";

const AMBIENT_CHIPS = [
  { key: "children", label: "Hay niños", hasChildren: true, hasPets: false },
  { key: "pets", label: "Hay mascotas", hasChildren: false, hasPets: true },
];

function taskKey(categoryName: string, taskName: string): string {
  return `${categoryName}::${taskName}`;
}

interface CategorySectionProps {
  category: TaskCategoryGroup;
  selectedKeys: Set<string>;
  onToggleTask: (categoryName: string, taskName: string) => void;
}

function CategorySection({ category, selectedKeys, onToggleTask }: CategorySectionProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.category}>
      <Text style={styles.categoryLabel}>{category.label}</Text>
      {category.tasks.map((task) => {
        const key = taskKey(category.name, task.name);
        const selected = selectedKeys.has(key);
        return (
          <Pressable key={key} onPress={() => onToggleTask(category.name, task.name)} style={styles.taskRow}>
            <Text style={styles.taskName}>{task.name}</Text>
            <View style={[styles.toggleCircle, selected && styles.toggleCircleSelected]}>
              {selected ? <Check size={12} color={colors.paper} strokeWidth={3} /> : <Plus size={12} color={colors.ink2} />}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Tareas "Sumar" (handoff §5.3, replaces suggest-tasks.tsx + task-catalog.tsx). */
export function SumarView(): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const suggestTasks = useSuggestTasks();
  const createTask = useCreateTask();
  const [ambient, setAmbient] = useState<{ hasChildren: boolean; hasPets: boolean }>({ hasChildren: false, hasPets: false });
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const categories = suggestTasks.data?.categories ?? [];

  function handleAmbientToggle(hasChildren: boolean, hasPets: boolean): void {
    const next = { hasChildren, hasPets };
    setAmbient(next);
    suggestTasks.mutate(next);
  }

  function toggleTask(categoryName: string, taskName: string): void {
    const key = taskKey(categoryName, taskName);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSumar(): Promise<void> {
    const toAdd = categories.flatMap((category) =>
      category.tasks
        .filter((task) => selectedKeys.has(taskKey(category.name, task.name)))
        .map((task) => ({
          name: task.name,
          frequency: task.frequency,
          weight: task.weight,
          estimatedMinutes: task.estimatedMinutes,
          isRouletteEligible: false,
        })),
    );
    await Promise.allSettled(toAdd.map((task) => createTask.mutateAsync(task)));
    setSelectedKeys(new Set());
  }

  return (
    <View style={styles.container}>
      <View style={styles.chipRow}>
        {AMBIENT_CHIPS.map((chip) => (
          <Chip
            key={chip.key}
            label={chip.label}
            tone={ambient.hasChildren === chip.hasChildren && ambient.hasPets === chip.hasPets ? "onDay" : "filterOff"}
            onPress={() => handleAmbientToggle(chip.hasChildren, chip.hasPets)}
          />
        ))}
      </View>

      {suggestTasks.isPending ? null : categories.length === 0 ? (
        <EmptyState title="Sumá tareas" description="Elegí un chip de ambiente para ver sugerencias." />
      ) : (
        categories.map((category) => (
          <CategorySection key={category.name} category={category} selectedKeys={selectedKeys} onToggleTask={toggleTask} />
        ))
      )}

      <View style={styles.footer}>
        {selectedKeys.size > 0 ? (
          <Button label={`Sumar ${selectedKeys.size} tareas`} onPress={() => void handleSumar()} loading={createTask.isPending} />
        ) : null}
        <Pressable onPress={() => openAnotar({ kind: "task" })}>
          <Text style={styles.createLink}>Crear una tarea propia</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
    },
    chipRow: {
      flexDirection: "row",
      gap: spacing.sm,
      paddingTop: spacing.sm,
    },
    category: {
      gap: spacing.xs,
    },
    categoryLabel: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 11,
      letterSpacing: 0.9,
      textTransform: "uppercase",
      color: c.ink3,
    },
    taskRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: 48,
    },
    taskName: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 15,
      color: c.ink,
      flex: 1,
    },
    toggleCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: c.line,
      alignItems: "center",
      justifyContent: "center",
    },
    toggleCircleSelected: {
      backgroundColor: c.monte,
      borderColor: c.monte,
    },
    footer: {
      paddingVertical: spacing.xl,
      gap: spacing.md,
      alignItems: "center",
    },
    createLink: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 14,
      color: c.monte,
      textDecorationLine: "underline",
    },
  });
}
