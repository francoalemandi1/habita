import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { Trash2 } from "lucide-react-native";
import { Dialog, useSnackbar } from "@/components/ds";
import { useDeleteExpense } from "@/hooks/use-expenses";
import { cancelDelete, scheduleDelete } from "@/lib/deferred-delete";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";

const DEFERRED_DELETE_MS = 5000;

interface DeleteExpenseButtonProps {
  expenseId: string;
  hasLaterSettlement: boolean;
  otherMemberName: string;
}

/** "Eliminar gasto" — pattern A (deferred) when open, pattern D (confirm dialog) once liquidated. */
export function DeleteExpenseButton({
  expenseId,
  hasLaterSettlement,
  otherMemberName,
}: DeleteExpenseButtonProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const snackbar = useSnackbar();
  const deleteExpense = useDeleteExpense();
  const [dialogOpen, setDialogOpen] = useState(false);

  function showError(retry: () => void): void {
    snackbar.show({ text: "No se pudo eliminar", tone: "error", actionLabel: "Reintentar", onAction: retry });
  }

  function handleDeleteA(): void {
    scheduleDelete({
      id: expenseId,
      delayMs: DEFERRED_DELETE_MS,
      run: () => {
        deleteExpense.mutateAsync(expenseId).catch(() => showError(handleDeleteA));
      },
    });

    snackbar.show({ text: "Gasto eliminado", actionLabel: "Deshacer", onAction: () => cancelDelete(expenseId) });
    router.back();
  }

  function handleDeleteD(): void {
    setDialogOpen(false);
    deleteExpense
      .mutateAsync(expenseId)
      .then(() => {
        snackbar.show({ text: "Gasto eliminado" });
        router.back();
      })
      .catch(() => showError(handleDeleteD));
  }

  if (hasLaterSettlement) {
    return (
      <>
        <Pressable accessibilityRole="button" style={styles.row} onPress={() => setDialogOpen(true)}>
          <Trash2 size={16} strokeWidth={1.75} color={colors.ladrillo} />
          <Text style={styles.label}>Eliminar gasto</Text>
        </Pressable>
        <Dialog
          visible={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title="¿Eliminar este gasto?"
          body={`Esto reabre los saldos entre Vos y ${otherMemberName}.`}
          actionLabel="Eliminar"
          onConfirm={handleDeleteD}
        />
      </>
    );
  }

  return (
    <Pressable accessibilityRole="button" style={styles.row} onPress={handleDeleteA}>
      <Trash2 size={16} strokeWidth={1.75} color={colors.ladrillo} />
      <Text style={styles.label}>Eliminar gasto</Text>
    </Pressable>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      alignSelf: "flex-start",
    },
    label: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 15,
      color: c.ladrillo,
      textDecorationLine: "underline",
    },
  });
}
