import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { RadioGroup, Sheet, useSnackbar } from "@/components/ds";
import { useUpdateAssignment } from "@/hooks/use-assignments";
import { buildWeekStrip } from "@/lib/tareas-week-strip";
import { spacing } from "@/theme";

import type { AssignmentSummary } from "@habita/contracts";

interface ChangeDaySheetProps {
  visible: boolean;
  assignment: AssignmentSummary;
  onClose: () => void;
}

/** "Cambiar día" sheet (handoff §5.3 context menu): PATCH dueDate, pattern A. */
export function ChangeDaySheet({ visible, assignment, onClose }: ChangeDaySheetProps): React.JSX.Element {
  const snackbar = useSnackbar();
  const updateAssignment = useUpdateAssignment();
  const days = useMemo(() => buildWeekStrip(new Date(), []), []);

  function handlePick(dayKeyValue: string): void {
    updateAssignment.mutate(
      { assignmentId: assignment.id, dueDate: `${dayKeyValue}T09:00:00.000Z` },
      {
        onSuccess: () => snackbar.show({ text: "Día cambiado", actionLabel: "Deshacer", onAction: () => undoChange() }),
        onError: () => snackbar.show({ text: "No se pudo guardar", tone: "error" }),
      },
    );
    onClose();
  }

  function undoChange(): void {
    updateAssignment.mutate({ assignmentId: assignment.id, dueDate: assignment.dueDate });
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Cambiar día">
      <View style={styles.body}>
        <RadioGroup
          accessibilityLabel="Nuevo día"
          options={days.map((day) => ({ value: day.key, label: `${day.label} ${day.dayNumber}` }))}
          value={assignment.dueDate.slice(0, 10)}
          onValueChange={handlePick}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingBottom: spacing.lg,
  },
});
