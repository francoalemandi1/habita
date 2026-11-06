import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button, Skeleton, TextField, useSnackbar } from "@/components/ds";
import { useAbsences, useCreateAbsence, useDeleteAbsence } from "@/hooks/use-absences";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";

/** §5.3 Disponibilidad — ausencias, backed by the existing /api/absences endpoints. */
export function AbsencesSection(): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const absencesQuery = useAbsences();
  const createAbsence = useCreateAbsence();
  const deleteAbsence = useDeleteAbsence();
  const snackbar = useSnackbar();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const handleCreate = () => {
    if (!startDate || !endDate) return;
    createAbsence.mutate(
      { startDate, endDate, reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          setStartDate("");
          setEndDate("");
          setReason("");
        },
        onError: (error) => {
          snackbar.show({ text: getMobileErrorMessage(error), tone: "error" });
        },
      },
    );
  };

  const upcoming = [...(absencesQuery.data?.current ?? []), ...(absencesQuery.data?.upcoming ?? [])];

  return (
    <View style={styles.section}>
      {absencesQuery.isLoading ? <Skeleton height={56} /> : null}

      {upcoming.map((absence) => (
        <View key={absence.id} style={styles.row}>
          <View style={styles.info}>
            <Text style={styles.dateRange}>
              {new Date(absence.startDate).toLocaleDateString("es-AR")} – {new Date(absence.endDate).toLocaleDateString("es-AR")}
            </Text>
            {absence.reason ? <Text style={styles.reason}>{absence.reason}</Text> : null}
          </View>
          <Pressable onPress={() => deleteAbsence.mutate(absence.id)}>
            <Text style={styles.remove}>Eliminar</Text>
          </Pressable>
        </View>
      ))}

      <View style={styles.form}>
        <TextField label="Desde (AAAA-MM-DD)" value={startDate} onChangeText={setStartDate} placeholder="2026-12-01" />
        <TextField label="Hasta (AAAA-MM-DD)" value={endDate} onChangeText={setEndDate} placeholder="2026-12-10" />
        <TextField label="Motivo (opcional)" value={reason} onChangeText={setReason} placeholder="Viaje" />
        <Button
          label="Agregar ausencia"
          onPress={handleCreate}
          disabled={!startDate || !endDate || createAbsence.isPending}
          loading={createAbsence.isPending}
        />
      </View>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    section: {
      gap: spacing.md,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.lineSoft,
    },
    info: {
      flex: 1,
    },
    dateRange: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 14,
      color: c.ink,
    },
    reason: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 12,
      color: c.ink2,
      marginTop: 1,
    },
    remove: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 13,
      color: c.ladrilloText,
    },
    form: {
      gap: spacing.md,
      marginTop: spacing.sm,
    },
  });
}
