import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Chip, TextField, Toggle } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { CATEGORY_LABELS } from "@/lib/plata-categories";
import { EXPENSE_CATEGORIES } from "@/lib/plata-expense-category";
import { frequencyLabel, RECURRING_FREQUENCIES } from "@/lib/plata-servicios-logic";

import type { ThemeColors } from "@/theme";
import type { ExpenseCategory } from "@habita/contracts";
import type { RecurringFrequency } from "@/lib/plata-servicios-logic";
import type { PlataMember } from "@/components/features/plata/plata-view-props";

const CATEGORY_OPTIONS = EXPENSE_CATEGORIES;
const FREQUENCY_OPTIONS = RECURRING_FREQUENCIES;

export interface ServiceFormState {
  title: string;
  provider: string;
  accountNumber: string;
  amount: string;
  category: ExpenseCategory;
  frequency: RecurringFrequency;
  dayOfMonth: string;
  paidById: string;
  autoGenerate: boolean;
  notes: string;
}

interface ServiceFormFieldsProps {
  state: ServiceFormState;
  onChange: (patch: Partial<ServiceFormState>) => void;
  members: PlataMember[];
}

/** Service create/edit form fields, split out so the Sheet stays under 200 lines. */
export function ServiceFormFields({ state, onChange, members }: ServiceFormFieldsProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.content}>
      <TextField label="Nombre" placeholder="Edenor, Netflix, Alquiler" value={state.title} onChangeText={(v) => onChange({ title: v })} />
      <TextField label="Proveedor (opcional)" value={state.provider} onChangeText={(v) => onChange({ provider: v })} />
      <TextField label="Nro de cliente (opcional)" value={state.accountNumber} onChangeText={(v) => onChange({ accountNumber: v })} />
      <TextField label="Último monto (opcional)" keyboardType="decimal-pad" value={state.amount} onChangeText={(v) => onChange({ amount: v })} />

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Categoría</Text>
        <View style={styles.chipGrid}>
          {CATEGORY_OPTIONS.map((category) => (
            <Chip
              key={category}
              label={CATEGORY_LABELS[category]}
              tone={state.category === category ? "filterOn" : "filterOff"}
              onPress={() => onChange({ category })}
            />
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Frecuencia</Text>
        <View style={styles.chipGrid}>
          {FREQUENCY_OPTIONS.map((freq) => (
            <Chip
              key={freq}
              label={frequencyLabel(freq)}
              tone={state.frequency === freq ? "filterOn" : "filterOff"}
              onPress={() => onChange({ frequency: freq })}
            />
          ))}
        </View>
      </View>

      {state.frequency !== "WEEKLY" && (
        <TextField label="Día del mes (1-28)" keyboardType="number-pad" value={state.dayOfMonth} onChangeText={(v) => onChange({ dayOfMonth: v })} />
      )}

      {members.length > 1 && (
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>¿Quién paga?</Text>
          <View style={styles.chipGrid}>
            {members.map((member) => (
              <Chip
                key={member.id}
                label={member.name}
                tone={state.paidById === member.id ? "filterOn" : "filterOff"}
                onPress={() => onChange({ paidById: member.id })}
              />
            ))}
          </View>
        </View>
      )}

      <View style={styles.autoGenerateRow}>
        <View style={styles.autoGenerateText}>
          <Text style={styles.fieldLabel}>Registrar automáticamente</Text>
          <Text style={styles.autoGenerateHint}>Genera el gasto cada {frequencyLabel(state.frequency).toLowerCase()}</Text>
        </View>
        <Toggle
          value={state.autoGenerate}
          onValueChange={(checked) => onChange({ autoGenerate: checked })}
          accessibilityLabel="Registrar automáticamente"
        />
      </View>

      <TextField label="Notas (opcional)" value={state.notes} onChangeText={(v) => onChange({ notes: v })} />
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    content: { gap: spacing.lg },
    field: { gap: spacing.sm },
    fieldLabel: { fontFamily: fontFamilyForWeight(600), fontSize: 13, color: c.ink },
    chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    autoGenerateRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: spacing.md,
    },
    autoGenerateText: { flex: 1, gap: 2 },
    autoGenerateHint: { fontFamily: fontFamilyForWeight(400), fontSize: 13, color: c.ink2 },
  });
}
