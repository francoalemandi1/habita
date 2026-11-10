import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ShoppingBasket } from "lucide-react-native";
import { StoreChip } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { formatRelativeAge } from "@/lib/casa-cart";
import { radii as radius } from "@habita/design-tokens";

import type { ThemeColors } from "@/theme";
import type { SavedCart } from "@habita/contracts";

export interface SuperCardProps {
  latestCart: SavedCart | null;
  /** Unchecked item count on the shared shopping list. */
  uncheckedCount: number;
  now: Date;
}

function formatAmount(value: number): string {
  return `$${Math.round(value).toLocaleString("es-AR")}`;
}

/** Casa "Súper" card (§5.3): latest saved cart, or an empty prompt. */
export function SuperCard({ latestCart, uncheckedCount, now }: SuperCardProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (uncheckedCount === 0 && !latestCart) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ver Súper"
        onPress={() => router.push("/(app)/super")}
        style={styles.card}
      >
        <View style={styles.empty}>
          <ShoppingBasket size={24} strokeWidth={1.75} color={colors.ink3} />
          <Text style={styles.emptyText}>Armá la lista y compará precios</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Ver Súper"
      onPress={() => router.push("/(app)/super")}
      style={styles.card}
    >
      <View style={styles.headerRow}>
        <Text style={styles.productLine}>{`${uncheckedCount} producto${uncheckedCount === 1 ? "" : "s"}`}</Text>
        {latestCart ? <StoreChip storeName={latestCart.storeName} /> : null}
      </View>
      {latestCart ? (
        <>
          <Text style={styles.total}>{formatAmount(latestCart.totalPrice)}</Text>
          <Text style={styles.age}>{formatRelativeAge(latestCart.savedAt, now)}</Text>
        </>
      ) : null}
    </Pressable>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.card,
      padding: spacing.xl,
      gap: spacing.sm,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    productLine: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 14,
      color: c.ink,
      flex: 1,
    },
    total: {
      fontFamily: fontFamilyForWeight(700),
      fontSize: 22,
      color: c.ink,
    },
    age: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.ink2,
    },
    empty: {
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.md,
    },
    emptyText: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 14,
      color: c.ink2,
      textAlign: "center",
    },
  });
}
