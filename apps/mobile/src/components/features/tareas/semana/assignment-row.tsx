import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CalendarClock, Pencil, Repeat, Send, Trash2 } from "lucide-react-native";
import { Avatar, Checkbox, ContextMenu, PendingDot, SwipeRow } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { toCheckboxState } from "@/lib/casa-week";

import type { ThemeColors } from "@/theme";
import type { AssignmentSummary } from "@habita/contracts";
import type { CheckboxState } from "@/components/ds";

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: "Diaria",
  WEEKLY: "Semanal",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
  ONCE: "Una vez",
};

interface AssignmentRowProps {
  assignment: AssignmentSummary;
  assigneeName: string;
  isAssigneeCurrentUser: boolean;
  requiresVerification: boolean;
  isRotating: boolean;
  pendingTransferToName: string | null;
  isPendingSync: boolean;
  onToggle: (next: CheckboxState) => void;
  onEdit: () => void;
  onChangeDay: () => void;
  onPass: () => void;
  onToggleRotation: () => void;
  onDelete: () => void;
}

/** A single Semana row: checkbox + name + meta + assignee avatar, swipeable + long-press menu (§6.12/§6.17). */
export function AssignmentRow({
  assignment,
  assigneeName,
  isAssigneeCurrentUser,
  requiresVerification,
  isRotating,
  pendingTransferToName,
  isPendingSync,
  onToggle,
  onEdit,
  onChangeDay,
  onPass,
  onToggleRotation,
  onDelete,
}: AssignmentRowProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const freqLabel = FREQUENCY_LABELS[assignment.task.frequency] ?? assignment.task.frequency;

  const row = (
    <View style={styles.row}>
      <Checkbox
        state={toCheckboxState(assignment.status, requiresVerification)}
        onToggle={onToggle}
        requiresVerification={requiresVerification}
        accessibilityLabel={assignment.task.name}
      />
      <View style={styles.textColumn}>
        <Text style={styles.name} numberOfLines={1}>
          {assignment.task.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {pendingTransferToName ? `Pedido a ${pendingTransferToName}` : freqLabel}
          {assignment.task.estimatedMinutes ? ` · ${assignment.task.estimatedMinutes} min` : ""}
        </Text>
      </View>
      {isPendingSync ? <PendingDot /> : null}
      <Avatar name={assigneeName} size={28} isCurrentUser={isAssigneeCurrentUser} />
    </View>
  );

  return (
    <SwipeRow onDone={() => onToggle("done")} onPass={onPass} onDelete={onDelete}>
      <ContextMenu
        items={[
          { key: "edit", label: "Editar", icon: Pencil, onPress: onEdit },
          { key: "change-day", label: "Cambiar día", icon: CalendarClock, onPress: onChangeDay },
          { key: "pass", label: "Pasar a alguien", icon: Send, onPress: onPass },
          {
            key: "rotation",
            label: isRotating ? "Quitar rotación" : "Hacer rotación",
            icon: Repeat,
            onPress: onToggleRotation,
          },
          { key: "delete", label: "Eliminar", icon: Trash2, onPress: onDelete, destructive: true },
        ]}
      >
        {row}
      </ContextMenu>
    </SwipeRow>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      minHeight: 60,
      paddingHorizontal: spacing.xl,
      backgroundColor: c.surface,
    },
    textColumn: {
      flex: 1,
      gap: 2,
    },
    name: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 16,
      color: c.ink,
    },
    meta: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.ink2,
    },
  });
}
