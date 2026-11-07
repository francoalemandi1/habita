import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { storeColors, storeColorFallback } from "@habita/design-tokens";
import { fontFamilyForWeight } from "@/theme";

export interface StoreChipProps {
  storeName: string;
}

/** §6.9 StoreChip — brand color from storeColors. Super-only. */
export function StoreChip({ storeName }: StoreChipProps): React.JSX.Element {
  const { bg, text } = useMemo(() => storeColors[storeName] ?? storeColorFallback, [storeName]);

  return (
    <View accessibilityRole="text" accessibilityLabel={storeName} style={[styles.base, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: text }]} numberOfLines={1}>
        {storeName}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  label: {
    fontFamily: fontFamilyForWeight(700),
    fontSize: 12,
    fontWeight: "700",
  },
});
