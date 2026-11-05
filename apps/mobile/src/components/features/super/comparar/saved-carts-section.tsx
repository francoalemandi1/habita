import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Bookmark } from "lucide-react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { radii as radius } from "@habita/design-tokens";
import { useDeleteSavedCart, useSavedCarts } from "@/hooks/use-saved-carts";
import { useSavedCartAutoRefresh } from "@/hooks/use-saved-cart-refresh";
import { SavedCartRow } from "@/components/features/super/comparar/saved-cart-row";

import type { ThemeColors } from "@/theme";

/** "Carritos guardados" — auto-refreshes stale carts once per mount (design handoff §5.3). */
export function SavedCartsSection(): React.JSX.Element | null {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data: savedCarts } = useSavedCarts();
  const deleteSavedCart = useDeleteSavedCart();
  const { results } = useSavedCartAutoRefresh(savedCarts);

  if (!savedCarts || savedCarts.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Bookmark size={14} strokeWidth={1.75} color={colors.ink2} />
        <Text style={styles.headerText}>Carritos guardados</Text>
      </View>
      <View style={styles.list}>
        {savedCarts.map((cart) => (
          <SavedCartRow
            key={cart.id}
            cart={cart}
            refreshResult={results.find((result) => result.cartId === cart.id)}
            onDelete={() => void deleteSavedCart.mutateAsync(cart.id)}
          />
        ))}
      </View>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { gap: spacing.sm },
    header: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
    headerText: { fontFamily: fontFamilyForWeight(600), fontSize: 13, color: c.ink2 },
    list: { backgroundColor: c.paper, borderRadius: radius.card, paddingHorizontal: spacing.md },
  });
}
