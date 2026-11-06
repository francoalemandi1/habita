import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, RadioGroup, Sheet, TextField, useSnackbar } from "@/components/ds";
import { useCreateTransfer } from "@/hooks/use-transfers";
import { computeMemberDayLoad } from "@/lib/tareas-day-load";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";
import type { AssignmentSummary } from "@habita/contracts";

interface TransferSheetProps {
  visible: boolean;
  assignment: AssignmentSummary;
  members: Array<{ id: string; name: string }>;
  dayAssignments: Array<{ memberId: string; dueDate: string }>;
  onClose: () => void;
}

/** "Pasar tarea" sheet (handoff §5.3/§7 pattern C): radio + load, consequence copy, single CTA. */
export function TransferSheet({ visible, assignment, members, dayAssignments, onClose }: TransferSheetProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const snackbar = useSnackbar();
  const createTransfer = useCreateTransfer();
  const [toMemberId, setToMemberId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const candidates = members.filter((member) => member.id !== assignment.memberId);
  const dayLoad = useMemo(
    () => computeMemberDayLoad(dayAssignments, assignment.dueDate.slice(0, 10)),
    [dayAssignments, assignment.dueDate],
  );
  const toMemberName = candidates.find((m) => m.id === toMemberId)?.name ?? null;

  function handleClose(): void {
    setToMemberId(null);
    setReason("");
    setError(null);
    onClose();
  }

  async function handleSubmit(): Promise<void> {
    if (!toMemberId) {
      setError("Elegí a quién se la pasás.");
      return;
    }
    setError(null);
    try {
      await createTransfer.mutateAsync({
        assignmentId: assignment.id,
        toMemberId,
        reason: reason.trim() || undefined,
      });
      snackbar.show({ text: "Se le avisa a " + (toMemberName ?? "la persona"), tone: "navigation" });
      handleClose();
    } catch (err) {
      setError(getMobileErrorMessage(err));
    }
  }

  return (
    <Sheet visible={visible} onClose={handleClose} title="Pasar tarea">
      <View style={styles.body}>
        <RadioGroup
          accessibilityLabel="A quién se la pasás"
          options={candidates.map((member) => ({
            value: member.id,
            label: `${member.name} · ${dayLoad[member.id] ?? 0} tareas ese día`,
          }))}
          value={toMemberId}
          onValueChange={setToMemberId}
        />
        <TextField label="Mensaje (opcional)" value={reason} onChangeText={setReason} />
        {toMemberName ? (
          <Text style={styles.consequence}>
            {toMemberName} tiene que aceptar. Hasta entonces sigue siendo tuya.
          </Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label={toMemberName ? `Pedirle a ${toMemberName}` : "Pedirle"}
          onPress={() => void handleSubmit()}
          loading={createTransfer.isPending}
          disabled={!toMemberId}
        />
      </View>
    </Sheet>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    body: {
      gap: spacing.md,
      paddingBottom: spacing.lg,
    },
    consequence: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.ink2,
    },
    error: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 13,
      color: c.ladrilloText,
    },
  });
}
