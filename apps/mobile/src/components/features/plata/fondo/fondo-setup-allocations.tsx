import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { TextField } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import type { ThemeColors } from "@/theme";
import { formatCurrencyArs } from "@/lib/plata-money-saldos";

import type { PlataMember } from "../plata-view-props";

interface FondoSetupAllocationsProps {
  members: PlataMember[];
  allocations: Record<string, string>;
  onChange: (memberId: string, value: string) => void;
  allocationTotal: number;
  targetAmount: number;
}

/** Per-member monthly quota inputs, with a running total vs the monthly target. */
export function FondoSetupAllocations({
  members,
  allocations,
  onChange,
  allocationTotal,
  targetAmount,
}: FondoSetupAllocationsProps): React.JSX.Element | null {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (members.length === 0) return null;

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>Cuota mensual por miembro</Text>
      {members.map((member) => (
        <View key={member.id} style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>
            {member.name}
          </Text>
          <TextField
            label=""
            keyboardType="numeric"
            value={allocations[member.id] ?? ""}
            onChangeText={(value) => onChange(member.id, value)}
            placeholder="0"
            containerStyle={styles.input}
          />
        </View>
      ))}
      {targetAmount > 0 && (
        <Text style={styles.summary}>
          Total cuotas: {formatCurrencyArs(allocationTotal)} / {formatCurrencyArs(targetAmount)}
        </Text>
      )}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    field: {
      gap: spacing.sm,
    },
    fieldLabel: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 13,
      color: c.ink,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    name: {
      flex: 1,
      fontFamily: fontFamilyForWeight(400),
      fontSize: 15,
      color: c.ink,
    },
    input: {
      width: 90,
    },
    summary: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.ink2,
    },
  });
}
