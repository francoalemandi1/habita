import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { Button, Sheet } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { useCreateService, useDeleteService, useGenerateServiceExpense, useToggleServiceActive, useUpdateService } from "@/hooks/use-services";
import { toExpenseCategory } from "@/lib/plata-expense-category";
import { toRecurringFrequency } from "@/lib/plata-servicios-logic";
import { ServiceFormFields } from "./service-form-fields";

import type { ServiceFormState } from "./service-form-fields";
import type { ThemeColors } from "@/theme";
import type { SerializedService } from "@/hooks/use-services";
import type { RecurringFrequency } from "@/lib/plata-servicios-logic";
import type { PlataMember } from "@/components/features/plata/plata-view-props";

interface ServiceFormSheetProps {
  visible: boolean;
  onClose: () => void;
  members: PlataMember[];
  currentMemberId: string;
  existing?: SerializedService;
}

function initialState(currentMemberId: string, existing?: SerializedService): ServiceFormState {
  return {
    title: existing?.title ?? "",
    provider: existing?.provider ?? "",
    accountNumber: existing?.accountNumber ?? "",
    amount: existing?.lastAmount != null ? String(existing.lastAmount) : "",
    category: toExpenseCategory(existing?.category, "UTILITIES"),
    frequency: toRecurringFrequency(existing?.frequency, "MONTHLY"),
    dayOfMonth: existing?.dayOfMonth != null ? String(existing.dayOfMonth) : "1",
    paidById: existing?.paidById ?? currentMemberId,
    autoGenerate: existing?.autoGenerate ?? false,
    notes: existing?.notes ?? "",
  };
}

function nextDueDate(frequency: RecurringFrequency, dayOfMonth: string): Date {
  const now = new Date();
  const next = new Date(now);
  const parsedDay = parseInt(dayOfMonth, 10);
  if (frequency === "WEEKLY") {
    next.setDate(next.getDate() + 7);
  } else {
    next.setMonth(next.getMonth() + 1);
    if (!isNaN(parsedDay) && parsedDay >= 1 && parsedDay <= 28) next.setDate(parsedDay);
  }
  return next;
}

/** §7 pattern B — Servicio create/edit Sheet; existing services also get row actions. */
export function ServiceFormSheet({ visible, onClose, members, currentMemberId, existing }: ServiceFormSheetProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [state, setState] = useState<ServiceFormState>(() => initialState(currentMemberId, existing));
  const [error, setError] = useState<string | null>(null);
  const create = useCreateService();
  const update = useUpdateService();
  const generate = useGenerateServiceExpense();
  const toggleActive = useToggleServiceActive();
  const deleteService = useDeleteService();
  const isSaving = create.isPending || update.isPending;

  function patch(next: Partial<ServiceFormState>): void {
    setState((prev) => ({ ...prev, ...next }));
  }

  function handleClose(): void {
    onClose();
    setState(initialState(currentMemberId, existing));
    setError(null);
  }

  async function handleSubmit(): Promise<void> {
    if (!state.title.trim()) {
      setError("Completá el nombre del servicio.");
      return;
    }
    const parsedAmount = state.amount ? parseFloat(state.amount) : null;
    if (parsedAmount !== null && (isNaN(parsedAmount) || parsedAmount <= 0)) {
      setError("El monto debe ser un número positivo.");
      return;
    }
    setError(null);

    const basePayload = {
      title: state.title.trim(),
      provider: state.provider.trim() || undefined,
      accountNumber: state.accountNumber.trim() || undefined,
      lastAmount: parsedAmount ?? undefined,
      category: state.category,
      frequency: state.frequency,
      dayOfMonth: state.frequency !== "WEEKLY" ? parseInt(state.dayOfMonth, 10) || 1 : undefined,
      paidById: state.paidById,
      autoGenerate: state.autoGenerate,
      notes: state.notes.trim() || undefined,
    };

    try {
      if (existing) {
        await update.mutateAsync({ id: existing.id, payload: basePayload });
      } else {
        await create.mutateAsync({
          ...basePayload,
          splitType: "EQUAL",
          nextDueDate: nextDueDate(state.frequency, state.dayOfMonth).toISOString(),
        });
      }
      handleClose();
    } catch (error) {
      console.warn("ServiceFormSheet: failed to save service", error);
      setError("No se pudo guardar. Probá de nuevo.");
    }
  }

  async function handleDelete(): Promise<void> {
    if (!existing) return;
    await deleteService.mutateAsync(existing.id);
    handleClose();
  }

  return (
    <Sheet visible={visible} onClose={handleClose} title={existing ? "Editar servicio" : "Nuevo servicio"}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ServiceFormFields state={state} onChange={patch} members={members} />
        {error && <Text style={styles.error}>{error}</Text>}
        <Button label="Guardar" loading={isSaving} loadingLabel="Guardando" onPress={() => void handleSubmit()} style={styles.saveButton} />

        {existing && (
          <>
            <Button
              label="Registrar gasto"
              variant="secondary"
              loading={generate.isPending}
              loadingLabel="Registrando"
              onPress={() => void generate.mutateAsync(existing.id)}
              style={styles.actionButton}
            />
            <Button
              label={existing.isActive ? "Pausar" : "Reanudar"}
              variant="secondary"
              loading={toggleActive.isPending}
              onPress={() => void toggleActive.mutateAsync(existing)}
              style={styles.actionButton}
            />
            <Button
              label="Eliminar servicio"
              variant="destructive"
              loading={deleteService.isPending}
              onPress={() => void handleDelete()}
              style={styles.actionButton}
            />
          </>
        )}
      </ScrollView>
    </Sheet>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    error: { fontFamily: fontFamilyForWeight(400), fontSize: 13, color: c.ladrilloText, marginTop: spacing.sm },
    saveButton: { marginTop: spacing.lg },
    actionButton: { marginTop: spacing.sm },
  });
}
