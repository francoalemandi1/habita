import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { CATEGORY_ICONS, CATEGORY_LABELS } from "@/lib/plata-categories";

import type { ThemeColors } from "@/theme";
import type { CategoryBar } from "@/lib/plata-como-venimos-logic";

function formatArs(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-AR")}`;
}

/** Per-category bars for the "Mes" segment; the rising category renders in Ladrillo (§9.1). */
export function CategoryBars({ bars }: { bars: CategoryBar[] }): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.list}>
      {bars.map((bar) => {
        const Icon = CATEGORY_ICONS[bar.category];
        return (
          <View key={bar.category} style={styles.row}>
            <Icon size={16} strokeWidth={1.75} color={colors.ink2} />
            <View style={styles.barColumn}>
              <View style={styles.labelRow}>
                <Text style={styles.label} numberOfLines={1}>{CATEGORY_LABELS[bar.category]}</Text>
                <Text style={styles.amount}>{formatArs(bar.amount)}</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${bar.widthPercent}%`, backgroundColor: bar.isRising ? colors.ladrillo : colors.monte }]} />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    list: { gap: spacing.sm },
    row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    barColumn: { flex: 1, gap: 4 },
    labelRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
    label: { fontFamily: fontFamilyForWeight(400), fontSize: 14, color: c.ink, flexShrink: 1 },
    amount: { fontFamily: fontFamilyForWeight(500), fontSize: 13, color: c.ink },
    track: { height: 8, borderRadius: 4, backgroundColor: c.sand, overflow: "hidden" },
    fill: { height: "100%", borderRadius: 4 },
  });
}
