import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Banner, Button, SegmentedControl } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { useAnotarClassicSave } from "@/hooks/use-anotar-classic-save";
import { todayIsoDate } from "@/lib/anotar-draft-logic";
import { AnotarClassicExpenseFields } from "./anotar-classic-expense-fields";
import { AnotarClassicTaskFields } from "./anotar-classic-task-fields";
import { AnotarClassicItemFields } from "./anotar-classic-item-fields";
import type { ClassicExpenseState } from "./anotar-classic-expense-fields";
import type { ClassicTaskState } from "./anotar-classic-task-fields";
import type { ClassicItemState } from "./anotar-classic-item-fields";
import type { ThemeColors } from "@/theme";
import type { MemberSummary } from "@habita/contracts";
import type { AnotarSaveInput } from "@/hooks/use-anotar-save";
import type { AnotarKind } from "./anotar-unknown";
import type { ExpenseCategory } from "@habita/contracts";

export type AnotarClassicReason = "ai_unavailable" | "rate_limited" | "manual";

interface AnotarClassicFormProps {
  initialKind: AnotarKind;
  initialText: string;
  initialAmount?: string;
  initialCategory?: ExpenseCategory;
  reason: AnotarClassicReason;
  members: MemberSummary[];
  /** null until the current member's id has loaded — Save stays disabled for expenses until then. */
  currentMemberId: string | null;
  isSaving: boolean;
  onSave: (input: AnotarSaveInput) => Promise<void>;
  onSaved: () => void;
}

const BANNER_TEXT: Record<AnotarClassicReason, string | null> = {
  ai_unavailable: "Sin IA por ahora · completalo a mano",
  rate_limited: "Esperá un momento para seguir interpretando",
  manual: null,
};

/** §5.3 Global "Anotar" — manual fallback when AI is unavailable, rate-limited, or the kind is unknown. */
export function AnotarClassicForm({
  initialKind,
  initialText,
  initialAmount,
  initialCategory,
  reason,
  members,
  currentMemberId,
  isSaving,
  onSave,
  onSaved,
}: AnotarClassicFormProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [kind, setKind] = useState<AnotarKind>(initialKind);

  const [expense, setExpense] = useState<ClassicExpenseState>({
    title: initialKind === "expense" ? initialText : "",
    amount: initialAmount ?? "",
    category: initialCategory ?? "OTHER",
    payerId: currentMemberId,
    participantIds: members.map((m) => m.id),
    date: todayIsoDate(),
  });
  const [task, setTask] = useState<ClassicTaskState>({
    name: initialKind === "task" ? initialText : "",
    assigneeId: null,
    date: todayIsoDate(),
  });
  const [item, setItem] = useState<ClassicItemState>({
    name: initialKind === "item" ? initialText : "",
    quantity: 1,
  });

  const { error, handleSave } = useAnotarClassicSave({
    onSave,
    onSaved: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved();
    },
  });

  const saveLabel = kind === "expense" ? "Guardar gasto" : kind === "task" ? "Guardar tarea" : "Sumar a la lista";
  const moreOptionsHref = kind === "expense" ? "/(app)/new-expense" : kind === "task" ? "/(app)/new-task" : null;

  return (
    <View style={styles.container}>
      {BANNER_TEXT[reason] ? <Banner tone="info" text={BANNER_TEXT[reason] ?? ""} /> : null}

      <SegmentedControl
        accessibilityLabel="Tipo"
        options={[
          { value: "expense", label: "Gasto" },
          { value: "task", label: "Tarea" },
          { value: "item", label: "Compra" },
        ]}
        value={kind}
        onValueChange={setKind}
      />

      {kind === "expense" && (
        <AnotarClassicExpenseFields state={expense} members={members} onChange={(next) => setExpense((prev) => ({ ...prev, ...next }))} />
      )}
      {kind === "task" && (
        <AnotarClassicTaskFields state={task} members={members} onChange={(next) => setTask((prev) => ({ ...prev, ...next }))} />
      )}
      {kind === "item" && (
        <AnotarClassicItemFields state={item} onChange={(next) => setItem((prev) => ({ ...prev, ...next }))} />
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label={saveLabel}
        loadingLabel="Guardando"
        loading={isSaving}
        disabled={kind === "expense" && !expense.payerId}
        onPress={() => void handleSave(kind, expense, task, item)}
      />

      {moreOptionsHref ? (
        <Text style={styles.moreOptions} onPress={() => router.push(moreOptionsHref)}>
          Más opciones
        </Text>
      ) : null}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: spacing.md,
      paddingTop: spacing.sm,
    },
    error: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.ladrilloText,
    },
    moreOptions: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 14,
      color: c.monte,
      textAlign: "center",
    },
  });
}
