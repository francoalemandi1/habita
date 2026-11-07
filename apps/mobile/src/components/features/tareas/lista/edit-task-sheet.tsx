import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, SegmentedControl, Sheet, TextField, useSnackbar } from "@/components/ds";
import { useUpdateTask } from "@/hooks/use-task-management";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { spacing } from "@/theme";

import type { TaskFrequency, TaskSummary } from "@habita/contracts";

interface EditTaskSheetProps {
  visible: boolean;
  task: TaskSummary;
  onClose: () => void;
}

const FREQUENCY_OPTIONS: Array<{ value: TaskFrequency; label: string }> = [
  { value: "DAILY", label: "Diaria" },
  { value: "WEEKLY", label: "Semanal" },
  { value: "MONTHLY", label: "Mensual" },
];

/** "Editar" sheet (handoff §5.3): rename a task and adjust its frequency, pattern B. */
export function EditTaskSheet({ visible, task, onClose }: EditTaskSheetProps): React.JSX.Element {
  const updateTask = useUpdateTask();
  const snackbar = useSnackbar();
  const [name, setName] = useState(task.name);
  const [frequency, setFrequency] = useState<TaskFrequency>(task.frequency);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(): Promise<void> {
    if (name.trim().length < 2) {
      setError("El nombre es muy corto.");
      return;
    }
    setError(null);
    try {
      await updateTask.mutateAsync({ taskId: task.id, name: name.trim(), frequency });
      snackbar.show({ text: "Tarea actualizada" });
      onClose();
    } catch (err) {
      setError(getMobileErrorMessage(err));
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Editar tarea">
      <View style={styles.body}>
        <TextField label="Nombre" value={name} onChangeText={setName} error={error ?? undefined} />
        <SegmentedControl
          accessibilityLabel="Frecuencia"
          options={FREQUENCY_OPTIONS}
          value={FREQUENCY_OPTIONS.some((o) => o.value === frequency) ? frequency : "WEEKLY"}
          onValueChange={setFrequency}
        />
        <Button label="Guardar" onPress={() => void handleSave()} loading={updateTask.isPending} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
});
