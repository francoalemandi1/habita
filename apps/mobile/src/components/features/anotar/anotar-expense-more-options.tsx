import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronDown, ChevronUp, Wallet } from "lucide-react-native";
import { Chip, TextField, Toggle } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { useFund } from "@/hooks/use-fund";
import { describeCustomSplit, isFundToggleVisible, resolveChargeToFund, summarizeCustomSplit } from "@/lib/anotar-draft-logic";
import type { ThemeColors } from "@/theme";
import type { ExpenseCategory, MemberSummary } from "@habita/contracts";

export type AnotarExpenseMoreOptionsFields = "splitType" | "customSplits" | "chargeToFund" | "notes";

interface AnotarExpenseMoreOptionsDraft {
  amount: number;
  category: ExpenseCategory;
  participantIds: string[];
  splitType: "EQUAL" | "CUSTOM";
  customSplits: Record<string, string>;
  /** null — user hasn't touched it; resolved with `resolveChargeToFund` for display/save. */
  chargeToFund: boolean | null;
  notes: string;
}

interface AnotarExpenseMoreOptionsProps {
  draft: AnotarExpenseMoreOptionsDraft;
  members: MemberSummary[];
  onChange: (next: Partial<Pick<AnotarExpenseMoreOptionsDraft, AnotarExpenseMoreOptionsFields>>) => void;
}

/** §5.3 Global "Anotar" — collapsed "Más opciones": dividir distinto, fondo común, nota. */
export function AnotarExpenseMoreOptions({ draft, members, onChange }: AnotarExpenseMoreOptionsProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);
  const { data: fund } = useFund();
  const fundToggleVisible = isFundToggleVisible(fund, draft.category);
  const resolvedChargeToFund = resolveChargeToFund(draft.chargeToFund, fundToggleVisible);
  const splitStatus = describeCustomSplit(summarizeCustomSplit(draft.amount, draft.customSplits, draft.participantIds));

  const setCustomAmount = (memberId: string, value: string) => {
    onChange({ customSplits: { ...draft.customSplits, [memberId]: value } });
  };

  return (
    <View style={styles.container}>
      <Pressable accessibilityRole="button" onPress={() => setExpanded((current) => !current)} style={styles.toggleRow} hitSlop={8}>
        {expanded ? <ChevronUp size={14} color={colors.ink2} /> : <ChevronDown size={14} color={colors.ink2} />}
        <Text style={styles.toggleLabel}>Más opciones</Text>
      </Pressable>

      {expanded ? (
        <View style={styles.content}>
          {!resolvedChargeToFund ? (
            <View style={styles.section}>
              <Chip
                label="Dividir distinto"
                tone={draft.splitType === "CUSTOM" ? "filterOn" : "filterOff"}
                onPress={() => onChange({ splitType: draft.splitType === "CUSTOM" ? "EQUAL" : "CUSTOM" })}
              />
              {draft.splitType === "CUSTOM" ? (
                <View style={styles.customSplitBox}>
                  {members.map((member) => (
                    <TextField
                      key={member.id}
                      label={member.name}
                      value={draft.customSplits[member.id] ?? ""}
                      onChangeText={(value) => setCustomAmount(member.id, value)}
                      keyboardType="decimal-pad"
                    />
                  ))}
                  <Text style={[styles.splitSummary, splitStatus.tone === "over" && styles.splitSummaryWarn]}>
                    {splitStatus.label}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {fundToggleVisible ? (
            <View style={styles.fundRow}>
              <View style={styles.fundLabel}>
                <Wallet size={16} color={colors.ink} />
                <Text style={styles.fundLabelText}>Pagado con el fondo</Text>
              </View>
              <Toggle
                value={resolvedChargeToFund}
                onValueChange={(chargeToFund) => onChange({ chargeToFund })}
                accessibilityLabel="Pagado con el fondo"
              />
            </View>
          ) : null}

          <TextField
            label="Nota"
            value={draft.notes}
            onChangeText={(notes) => onChange({ notes: notes.slice(0, 500) })}
            multiline
            numberOfLines={2}
          />
        </View>
      ) : null}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { gap: spacing.sm },
    toggleRow: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" },
    toggleLabel: { fontFamily: fontFamilyForWeight(600), fontSize: 13, color: c.ink2 },
    content: { gap: spacing.md },
    section: { gap: spacing.sm },
    customSplitBox: { gap: spacing.sm },
    splitSummary: { fontFamily: fontFamilyForWeight(400), fontSize: 13, color: c.ink2 },
    splitSummaryWarn: { color: c.ladrilloText },
    fundRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    fundLabel: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    fundLabelText: { fontFamily: fontFamilyForWeight(400), fontSize: 14, color: c.ink },
  });
}
