import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Button, Chip } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { createUniqueId } from "@/lib/unique-id";
import { TASK_FREQUENCY_LABELS, dueDateToIsoStartOfDay } from "@/lib/anotar-draft-logic";
import { AnotarTaskFieldEditor } from "./anotar-task-field-editor";
import { AnotarTaskMoreOptions } from "./anotar-task-more-options";
import type { AnotarTaskField } from "./anotar-task-field-editor";
import type { ThemeColors } from "@/theme";
import type { MemberSummary } from "@habita/contracts";
import type { AnotarSaveInput } from "@/hooks/use-anotar-save";
import type { TaskDraft } from "@/lib/anotar-draft-logic";

interface AnotarTaskPreviewProps {
  draft: TaskDraft;
  onChangeDraft: (next: Partial<TaskDraft>) => void;
  members: MemberSummary[];
  isSaving: boolean;
  onSave: (input: AnotarSaveInput) => Promise<boolean>;
  onSaved: (wasQueued: boolean) => void;
}

/** §6.22 Composer preview — task card with editable chips (handoff §5.3 Global). Controlled by the parent. */
export function AnotarTaskPreview({ draft, onChangeDraft, members, isSaving, onSave, onSaved }: AnotarTaskPreviewProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [editingField, setEditingField] = useState<AnotarTaskField | null>(null);
  const [error, setError] = useState<string | null>(null);

  const assigneeLabel = draft.assigneeId
    ? members.find((m) => m.id === draft.assigneeId)?.name ?? "Que lo decida el reparto"
    : "Que lo decida el reparto";

  const handleSave = async () => {
    setError(null);
    const dueDateIso = dueDateToIsoStartOfDay(draft.dueDate);
    if (!dueDateIso) {
      setError("Usá fecha con formato YYYY-MM-DD.");
      return;
    }
    try {
      const wasQueued = await onSave({
        kind: "task",
        name: draft.name,
        frequency: draft.frequency,
        weight: draft.weight,
        dueDateIso,
        assigneeMemberId: draft.assigneeId,
        description: draft.description,
        isRotating: draft.isRotating,
        idempotencyKey: createUniqueId(),
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved(wasQueued);
    } catch (saveError) {
      setError(getMobileErrorMessage(saveError));
    }
  };

  if (editingField) {
    return (
      <AnotarTaskFieldEditor
        field={editingField}
        draft={draft}
        members={members}
        onChangeDraft={onChangeDraft}
        onDone={() => setEditingField(null)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Chip label="Tarea" tone="onDay" />
      <Text style={styles.title}>{draft.name}</Text>

      <View style={styles.chipsRow}>
        <Chip label={assigneeLabel} tone="filterOff" onPress={() => setEditingField("assignee")} />
        <Chip label={draft.dueDate} tone="filterOff" onPress={() => setEditingField("dueDate")} />
        <Chip label={TASK_FREQUENCY_LABELS[draft.frequency]} tone="filterOff" onPress={() => setEditingField("frequency")} />
      </View>

      <AnotarTaskMoreOptions
        draft={{ description: draft.description, weight: draft.weight, isRotating: draft.isRotating }}
        onChange={onChangeDraft}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button label="Guardar tarea" loadingLabel="Guardando" loading={isSaving} onPress={() => void handleSave()} />
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: spacing.sm,
      paddingTop: spacing.sm,
    },
    title: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 16,
      color: c.ink,
    },
    chipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    error: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.ladrilloText,
    },
  });
}
