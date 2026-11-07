import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Toggle } from "@/components/ds";
import { useMembers } from "@/hooks/use-members";
import { useThemeColors } from "@/hooks/use-theme";
import { buildRotationPattern } from "@/lib/tareas-rotation-pattern";
import { fontFamilyForWeight, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";
import type { RotationSummary } from "@/hooks/use-rotations";

interface RotacionRowProps {
  rotation: RotationSummary;
  currentMemberId: string;
  onToggle: (isActive: boolean) => void;
}

/** A rotating task row (handoff §5.3): toggle (pattern A) + member-order pattern text. */
export function RotacionRow({ rotation, currentMemberId, onToggle }: RotacionRowProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const membersQuery = useMembers();
  const members = membersQuery.data?.members ?? [];
  const pattern = buildRotationPattern(members, currentMemberId, rotation.frequency);

  return (
    <View style={styles.row}>
      <View style={styles.textColumn}>
        <Text style={styles.name} numberOfLines={1}>{rotation.task.name}</Text>
        <Text style={styles.pattern} numberOfLines={1}>{pattern}</Text>
      </View>
      <Toggle value={rotation.isActive} onValueChange={onToggle} accessibilityLabel={`Rotación de ${rotation.task.name}`} />
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      minHeight: 60,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.lineSoft,
    },
    textColumn: {
      flex: 1,
      gap: 2,
    },
    name: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 15,
      color: c.ink,
    },
    pattern: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.ink2,
    },
  });
}
