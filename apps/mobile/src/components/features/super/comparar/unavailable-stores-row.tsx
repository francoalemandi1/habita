import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { WifiOff } from "lucide-react-native";
import { StoreChip } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { radii as radius } from "@habita/design-tokens";

import type { ThemeColors } from "@/theme";

interface UnavailableStoresRowProps {
  stores: string[];
}

/** Stores that didn't respond — shown as "No respondió", never as "falta todo". */
export function UnavailableStoresRow({ stores }: UnavailableStoresRowProps): React.JSX.Element | null {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (stores.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <WifiOff size={14} strokeWidth={1.75} color={colors.ink2} />
        <Text style={styles.headerText}>No respondió</Text>
      </View>
      <View style={styles.chips}>
        {stores.map((store) => (
          <View key={store} style={styles.chipWrap}>
            <StoreChip storeName={store} />
          </View>
        ))}
      </View>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { backgroundColor: c.sand, borderRadius: radius.control, padding: spacing.md, gap: spacing.sm },
    header: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
    headerText: { fontFamily: fontFamilyForWeight(500), fontSize: 13, color: c.ink2 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    chipWrap: { opacity: 0.5 },
  });
}
