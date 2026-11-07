import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { monthKeyToLabel } from "@/lib/plata-gastos-logic";

import type { ThemeColors } from "@/theme";
import type { MonthTotalBar } from "@/lib/plata-como-venimos-logic";

function formatArs(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-AR")}`;
}

/**
 * Total-per-month bars for "3 meses" / "Año" — the API has no per-category
 * breakdown for past months, only month-level totals (see the stage report).
 */
export function MonthTotalBars({ bars }: { bars: MonthTotalBar[] }): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.list}>
      <Text style={styles.caption}>Total gastado por mes</Text>
      {bars.map((bar) => (
        <View key={bar.month} style={styles.row}>
          <Text style={styles.month}>{monthKeyToLabel(bar.month)}</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${bar.widthPercent}%` }]} />
          </View>
          <Text style={styles.total}>{formatArs(bar.total)}</Text>
        </View>
      ))}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    list: { gap: spacing.sm },
    caption: { fontFamily: fontFamilyForWeight(400), fontSize: 13, color: c.ink2 },
    row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    month: { width: 64, fontFamily: fontFamilyForWeight(400), fontSize: 13, color: c.ink2 },
    track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: c.sand, overflow: "hidden" },
    fill: { height: "100%", borderRadius: 4, backgroundColor: c.monte },
    total: { width: 88, textAlign: "right", fontFamily: fontFamilyForWeight(500), fontSize: 13, color: c.ink, fontVariant: ["tabular-nums"] },
  });
}
