import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Trash2 } from "lucide-react-native";
import { StoreChip } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { formatCartAge, isCartStale } from "@habita/prices";

import type { ThemeColors } from "@/theme";
import type { SavedCart } from "@habita/contracts";
import type { SavedCartRefreshResult } from "@/hooks/use-saved-cart-refresh";

interface SavedCartRowProps {
  cart: SavedCart;
  refreshResult?: SavedCartRefreshResult;
  onDelete: () => void;
}

function formatPrice(amount: number): string {
  return `$${amount.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

export function SavedCartRow({ cart, refreshResult, onDelete }: SavedCartRowProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const stale = isCartStale(cart.refreshedAt);

  return (
    <View style={styles.row}>
      <StoreChip storeName={cart.storeName} />
      <View style={styles.body}>
        <Text style={styles.total}>{formatPrice(cart.totalPrice)}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {formatCartAge(cart.savedAt)}
          {refreshResult?.unavailable ? (
            <Text style={styles.stale}> · {cart.storeName} no responde ahora</Text>
          ) : null}
          {refreshResult && !refreshResult.unavailable && refreshResult.changedCount > 0 ? (
            <Text>
              {" "}
              · cambió el precio de {refreshResult.changedCount} producto{refreshResult.changedCount === 1 ? "" : "s"}
            </Text>
          ) : null}
          {!refreshResult && stale ? <Text style={styles.stale}> · precios viejos</Text> : null}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Eliminar carrito de ${cart.storeName}`}
        hitSlop={8}
        onPress={onDelete}
        style={styles.deleteBtn}
      >
        <Trash2 size={16} strokeWidth={1.75} color={colors.ink3} />
      </Pressable>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.lineSoft,
    },
    body: { flex: 1, gap: 2 },
    total: { fontFamily: fontFamilyForWeight(600), fontSize: 15, color: c.ink },
    meta: { fontFamily: fontFamilyForWeight(400), fontSize: 13, color: c.ink2 },
    stale: { color: c.ladrilloText },
    deleteBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  });
}
