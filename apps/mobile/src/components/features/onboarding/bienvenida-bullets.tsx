import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ClipboardList, Receipt, ShoppingCart } from "lucide-react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing, typography } from "@/theme";

import type { ThemeColors } from "@/theme";
import type { LucideIcon } from "lucide-react-native";

interface Bullet {
  icon: LucideIcon;
  label: string;
}

const BULLETS: Bullet[] = [
  { icon: ClipboardList, label: "Repartí las tareas del hogar" },
  { icon: Receipt, label: "Llevá las cuentas claras" },
  { icon: ShoppingCart, label: "Ahorrá en el súper" },
];

/** Three bullets with a Manteca icon, per handoff §5.3 Bienvenida. */
export function BienvenidaBullets() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.list}>
      {BULLETS.map(({ icon: Icon, label }) => (
        <View key={label} style={styles.row}>
          <View style={styles.iconWrap}>
            <Icon size={18} color={colors.mantecaText} strokeWidth={1.75} />
          </View>
          <Text style={styles.label}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    list: { gap: spacing.md, width: "100%" },
    row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.mantecaSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    label: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: typography.t2.fontSize,
      color: c.paper,
      flexShrink: 1,
    },
  });
}
