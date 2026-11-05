import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Bookmark, BookmarkCheck, ChevronDown, Trophy } from "lucide-react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { radii as radius } from "@habita/design-tokens";
import { calcDiscountedPrice } from "@/lib/super-promo-logic";
import { PromoBanner } from "@/components/features/super/comparar/promo-banner";
import { ProductRow } from "@/components/features/super/comparar/product-row";

import type { ThemeColors } from "@/theme";
import type { AlternativeProduct, BankPromo } from "@habita/contracts";
import type { AdjustedStoreCart } from "@/lib/super-compare-logic";

function formatAmount(amount: number): string {
  return `$${amount.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

interface StoreCartCardProps {
  cart: AdjustedStoreCart;
  rank: number;
  promos: BankPromo[];
  isSaved: boolean;
  isSavePending: boolean;
  onToggleSave: () => void;
  onSwapProduct: (searchTerm: string, alternative: AlternativeProduct) => void;
  onFindAlternatives: (searchTerm: string, currentProductName: string, query: string, storeName: string) => Promise<AlternativeProduct[]>;
}

/** Store-cart card for the Comparar ranking (design handoff §5.3). */
export function StoreCartCard({
  cart,
  rank,
  promos,
  isSaved,
  isSavePending,
  onToggleSave,
  onSwapProduct,
  onFindAlternatives,
}: StoreCartCardProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPromoId, setSelectedPromoId] = useState<string | null>(null);
  const isWinner = rank === 0;

  const selectedPromo = selectedPromoId ? promos.find((p) => p.id === selectedPromoId) : null;
  const discountedTotal = selectedPromo
    ? calcDiscountedPrice(cart.totalPrice, selectedPromo.discountPercent, selectedPromo.capAmount)
    : null;

  return (
    <View style={[styles.card, isWinner && styles.cardWinner]}>
      <Pressable onPress={() => setIsOpen((v) => !v)} style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.nameBlock}>
            <Text style={styles.storeName} numberOfLines={1}>
              {cart.storeName}
            </Text>
            {isWinner ? (
              <View style={styles.winnerBadge}>
                <Trophy size={11} strokeWidth={1.75} color={colors.mantecaText} />
                <Text style={styles.winnerBadgeText}>Mejor precio</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.priceBlock}>
            {discountedTotal != null ? (
              <>
                <Text style={styles.totalStrike}>{formatAmount(cart.totalPrice)}</Text>
                <Text style={[styles.total, styles.totalDiscounted]}>{formatAmount(discountedTotal)}</Text>
              </>
            ) : (
              <Text style={[styles.total, isWinner && styles.totalWinner]}>{formatAmount(cart.totalPrice)}</Text>
            )}
          </View>
          <Pressable onPress={onToggleSave} disabled={isSavePending} hitSlop={8} style={styles.saveBtn}>
            {isSaved ? (
              <BookmarkCheck size={20} strokeWidth={1.75} color={colors.monte} />
            ) : (
              <Bookmark size={20} strokeWidth={1.75} color={colors.ink2} />
            )}
          </Pressable>
          <View style={isOpen ? styles.chevronOpen : undefined}>
            <ChevronDown size={18} strokeWidth={1.75} color={colors.ink2} />
          </View>
        </View>

        <Text style={styles.subText}>
          {cart.products.length} de {cart.totalSearched} producto{cart.totalSearched !== 1 ? "s" : ""}
          {cart.cheapestCount > 0 ? ` · ${cart.cheapestCount} al mejor precio` : ""}
        </Text>
      </Pressable>

      {promos.length > 0 ? (
        <PromoBanner promos={promos} selectedPromoId={selectedPromoId} onSelectPromo={setSelectedPromoId} />
      ) : null}

      {isOpen ? (
        <View style={styles.products}>
          {cart.products.map((product) => (
            <ProductRow
              key={product.searchTerm}
              product={product}
              onSwap={(alternative) => onSwapProduct(product.searchTerm, alternative)}
              onFindAlternatives={(searchTerm, currentProductName, query) =>
                onFindAlternatives(searchTerm, currentProductName, query, cart.storeName)
              }
            />
          ))}
        </View>
      ) : null}

      {cart.missingTerms.length > 0 ? (
        <View style={styles.missing}>
          <Text style={styles.missingTitle}>No encontrado</Text>
          <Text style={styles.missingText}>{cart.missingTerms.map((term) => `falta ${term}`).join(", ")}</Text>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: { backgroundColor: c.paper, borderRadius: radius.card, padding: spacing.md, gap: spacing.sm },
    cardWinner: { borderWidth: 1, borderColor: c.monte },
    header: { gap: 4 },
    headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    storeName: { fontFamily: fontFamilyForWeight(600), fontSize: 15, color: c.ink, flexShrink: 1 },
    nameBlock: { flex: 1, gap: 4 },
    winnerBadge: {
      flexDirection: "row",
      alignSelf: "flex-start",
      alignItems: "center",
      gap: 4,
      backgroundColor: c.mantecaSoft,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    winnerBadgeText: { fontFamily: fontFamilyForWeight(600), fontSize: 11, color: c.mantecaText },
    priceBlock: { alignItems: "flex-end" },
    total: { fontFamily: fontFamilyForWeight(700), fontSize: 18, color: c.ink, fontVariant: ["tabular-nums"] },
    totalWinner: { color: c.monte },
    totalStrike: { fontFamily: fontFamilyForWeight(400), fontSize: 12, color: c.ink3, textDecorationLine: "line-through" },
    totalDiscounted: { color: c.monte },
    saveBtn: { padding: 4 },
    chevronOpen: { transform: [{ rotate: "180deg" }] },
    subText: { fontFamily: fontFamilyForWeight(400), fontSize: 12, color: c.ink2 },
    products: { borderTopWidth: 1, borderTopColor: c.lineSoft, paddingTop: spacing.xs },
    missing: { backgroundColor: c.ladrilloSoft, borderRadius: radius.control, padding: spacing.sm, gap: 2 },
    missingTitle: { fontFamily: fontFamilyForWeight(600), fontSize: 12, color: c.ladrilloText },
    missingText: { fontFamily: fontFamilyForWeight(400), fontSize: 12, color: c.ladrilloText },
  });
}
