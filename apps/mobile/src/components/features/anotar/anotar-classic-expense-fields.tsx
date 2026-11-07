import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Chip, RadioGroup, TextField } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { expenseCategorySchema } from "@habita/contracts";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/anotar-draft-logic";
import { AnotarExpenseMoreOptions } from "./anotar-expense-more-options";
import type { ThemeColors } from "@/theme";
import type { ExpenseCategory, MemberSummary } from "@habita/contracts";

export interface ClassicExpenseState {
  title: string;
  amount: string;
  category: ExpenseCategory;
  /** null until the current member's id has loaded — the caller disables Save until then. */
  payerId: string | null;
  participantIds: string[];
  date: string;
  splitType: "EQUAL" | "CUSTOM";
  customSplits: Record<string, string>;
  /** null — user hasn't touched it; resolved with `resolveChargeToFund` for display/save. */
  chargeToFund: boolean | null;
  notes: string;
}

interface AnotarClassicExpenseFieldsProps {
  state: ClassicExpenseState;
  members: MemberSummary[];
  onChange: (next: Partial<ClassicExpenseState>) => void;
}

const CATEGORY_OPTIONS = expenseCategorySchema.options.map((value) => ({
  value,
  label: EXPENSE_CATEGORY_LABELS[value],
}));

export function AnotarClassicExpenseFields({ state, members, onChange }: AnotarClassicExpenseFieldsProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const toggleParticipant = (memberId: string) => {
    if (memberId === state.payerId) return;
    const next = state.participantIds.includes(memberId)
      ? state.participantIds.filter((id) => id !== memberId)
      : [...state.participantIds, memberId];
    onChange({ participantIds: next });
  };

  return (
    <View style={styles.container}>
      <TextField label="Descripción" value={state.title} onChangeText={(title) => onChange({ title })} />
      <TextField
        label="Monto"
        value={state.amount}
        onChangeText={(amount) => onChange({ amount })}
        keyboardType="decimal-pad"
      />

      <Text style={styles.sectionLabel}>Categoría</Text>
      <RadioGroup
        accessibilityLabel="Categoría"
        options={CATEGORY_OPTIONS}
        value={state.category}
        onValueChange={(category) => onChange({ category })}
      />

      <Text style={styles.sectionLabel}>¿Quién pagó?</Text>
      {state.payerId ? (
        <RadioGroup
          accessibilityLabel="Quién pagó"
          options={members.map((m) => ({ value: m.id, label: m.name }))}
          value={state.payerId}
          onValueChange={(payerId) =>
            onChange({
              payerId,
              participantIds: state.participantIds.includes(payerId) ? state.participantIds : [...state.participantIds, payerId],
            })
          }
        />
      ) : (
        <Text style={styles.loadingLabel}>Cargando miembros…</Text>
      )}

      <Text style={styles.sectionLabel}>¿Entre quiénes se divide?</Text>
      <View style={styles.chipsRow}>
        {members.map((m) => (
          <Chip
            key={m.id}
            label={m.name}
            tone={state.participantIds.includes(m.id) ? "filterOn" : "filterOff"}
            onPress={() => toggleParticipant(m.id)}
          />
        ))}
      </View>

      <TextField label="Fecha (YYYY-MM-DD)" value={state.date} onChangeText={(date) => onChange({ date })} autoCapitalize="none" />

      <AnotarExpenseMoreOptions
        draft={{
          amount: Number(state.amount.replace(",", ".")) || 0,
          category: state.category,
          participantIds: state.participantIds,
          splitType: state.splitType,
          customSplits: state.customSplits,
          chargeToFund: state.chargeToFund,
          notes: state.notes,
        }}
        members={members}
        onChange={onChange}
      />
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: spacing.md,
    },
    sectionLabel: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 13,
      color: c.ink,
    },
    loadingLabel: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.ink2,
    },
    chipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
  });
}
