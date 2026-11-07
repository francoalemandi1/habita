import { useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Dices } from "lucide-react-native";
import { EmptyState, ListRow, ScreenHeader, useSnackbar } from "@/components/ds";
import { useMembers } from "@/hooks/use-members";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { useThemeColors } from "@/hooks/use-theme";
import { useRotations, useToggleRotation } from "@/hooks/use-rotations";
import { useTasks } from "@/hooks/use-task-management";
import { spacing } from "@/theme";
import { RotacionRow } from "@/components/features/tareas/rotaciones/rotacion-row";
import { SorteoSheet } from "@/components/features/tareas/rotaciones/sorteo-sheet";

import type { ThemeColors } from "@/theme";

/** /tareas/rotaciones (handoff §5.2/§5.3): rotating tasks + "Sortear una tarea" card. */
export default function RotacionesScreen(): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { sorteo } = useLocalSearchParams<{ sorteo?: string }>();
  const { me, activeHouseholdId } = useMobileAuth();
  const membersQuery = useMembers();
  const tasksQuery = useTasks();
  const rotationsQuery = useRotations();
  const toggleRotation = useToggleRotation();
  const snackbar = useSnackbar();
  const [sorteoOpen, setSorteoOpen] = useState(sorteo === "1");
  const [sorteoTaskId, setSorteoTaskId] = useState<string | null>(tasksQuery.data?.tasks[0]?.id ?? null);

  const currentMemberId = me?.members.find((m) => m.householdId === activeHouseholdId)?.id ?? "";
  const members = (membersQuery.data?.members ?? []).map((m) => ({ id: m.id, name: m.id === currentMemberId ? "Vos" : m.name }));
  const rotations = rotationsQuery.data?.rotations ?? [];

  function handleToggle(taskId: string, isActive: boolean): void {
    toggleRotation.mutate({ taskId, isActive }, {
      onError: () => snackbar.show({ text: "No se pudo guardar", tone: "error" }),
    });
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader variant="detail" title="Rotaciones" backLabel="Tareas" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {rotations.length === 0 ? (
          <EmptyState title="Sin rotaciones" description="Marcá una tarea para que rote entre todos." />
        ) : (
          rotations.map((rotation) => (
            <RotacionRow
              key={rotation.id}
              rotation={rotation}
              currentMemberId={currentMemberId}
              onToggle={(isActive) => handleToggle(rotation.taskId, isActive)}
            />
          ))
        )}

        <View style={styles.sorteoCard}>
          <ListRow
            icon={Dices}
            title="Sortear una tarea"
            meta="Elegí al azar quién la hace"
            onPress={() => {
              setSorteoTaskId(tasksQuery.data?.tasks[0]?.id ?? null);
              setSorteoOpen(true);
            }}
          />
        </View>
      </ScrollView>

      {sorteoOpen && sorteoTaskId ? (
        <SorteoSheet visible members={members} taskId={sorteoTaskId} onClose={() => setSorteoOpen(false)} />
      ) : null}
    </SafeAreaView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.paper,
    },
    content: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxl,
    },
    sorteoCard: {
      marginTop: spacing.md,
    },
  });
}
