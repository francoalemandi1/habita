import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { buildMiniBars } from "@/lib/plata-gastos-logic";

import type { MonthTotalPoint } from "@/lib/plata-gastos-logic";

interface MiniBarsProps {
  monthlyHistory: readonly MonthTotalPoint[];
}

/** 6-month mini bars: current month in Monte, the rest in Línea (handoff §5.3). */
export function MiniBars({ monthlyHistory }: MiniBarsProps): React.JSX.Element | null {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(), []);

  if (monthlyHistory.length === 0) return null;

  const bars = buildMiniBars(monthlyHistory);
  const maxTotal = Math.max(...bars.map((bar) => bar.total), 1);

  return (
    <View style={styles.row}>
      {bars.map((bar) => (
        <View
          key={bar.month}
          style={[
            styles.bar,
            { backgroundColor: bar.isCurrent ? colors.monte : colors.line },
            { height: `${Math.max((bar.total / maxTotal) * 100, 4)}%` as `${number}%` },
          ]}
        />
      ))}
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "flex-end",
      height: 40,
      gap: 6,
    },
    bar: {
      flex: 1,
      borderTopLeftRadius: 4,
      borderTopRightRadius: 4,
    },
  });
}
