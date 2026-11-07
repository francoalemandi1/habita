import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check, Package, Plus } from "lucide-react-native";
import { StoreChip } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { radii as radius } from "@habita/design-tokens";

import type { ThemeColors } from "@/theme";
import type { TopDealProduct } from "@habita/contracts";

interface OfertaCardProps {
  deal: TopDealProduct;
  inList: boolean;
  onAdd: () => void;
}

/**
 * NOTE: `TopDealProduct` has no `imageUrl` field, so the design handoff's
 * product photo is a placeholder icon box instead — matches the web version.
 */
export function OfertaCard({ deal, inList, onAdd }: OfertaCardProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <View style={styles.image}>
        <Package size={28} strokeWidth={1.75} color={colors.ink3} />
      </View>
      <View style={styles.row}>
        <StoreChip storeName={deal.store} />
        {deal.savingsPercent != null && deal.savingsPercent > 0 ? (
          <View style={styles.discountTag}>
            <Text style={styles.discountText}>-{deal.savingsPercent.toFixed(0)}%</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {deal.productName}
      </Text>
      <View style={styles.footer}>
        <Text style={styles.price}>{deal.price}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={inList ? "En tu lista" : `Agregar ${deal.productName} a la lista`}
          disabled={inList}
          onPress={onAdd}
          style={[styles.addBtn, inList && styles.addBtnDone]}
        >
          {inList ? (
            <Check size={14} strokeWidth={2} color={colors.monte} />
          ) : (
            <Plus size={14} strokeWidth={2} color={colors.paper} />
          )}
          {inList ? <Text style={styles.addBtnTextDone}>En tu lista</Text> : null}
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: { flex: 1, backgroundColor: c.paper, borderRadius: radius.card, padding: spacing.sm, gap: spacing.sm },
    image: {
      height: 88,
      borderRadius: radius.control,
      backgroundColor: c.sand,
      alignItems: "center",
      justifyContent: "center",
    },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    discountTag: { backgroundColor: c.mantecaSoft, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
    discountText: { fontFamily: fontFamilyForWeight(700), fontSize: 11, color: c.mantecaText },
    name: { fontFamily: fontFamilyForWeight(500), fontSize: 13, color: c.ink, minHeight: 32 },
    footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    price: { fontFamily: fontFamilyForWeight(700), fontSize: 15, color: c.ink },
    addBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      height: 32,
      borderRadius: 999,
      backgroundColor: c.monte,
      paddingHorizontal: 10,
    },
    addBtnDone: { backgroundColor: c.monteSoft },
    addBtnTextDone: { fontFamily: fontFamilyForWeight(600), fontSize: 12, color: c.monte },
  });
}
