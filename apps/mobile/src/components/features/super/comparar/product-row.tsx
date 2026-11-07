import { useMemo, useState } from "react";
import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowDownRight, ChevronDown, ExternalLink, Package } from "lucide-react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { radii as radius } from "@habita/design-tokens";

import type { ThemeColors } from "@/theme";
import type { AlternativeProduct } from "@habita/contracts";
import type { CartProduct } from "@habita/prices";

function formatPrice(price: number): string {
  return `$${price.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

function pickCheaperAlternative(product: CartProduct<unknown>): AlternativeProduct | null {
  return product.alternatives.reduce<AlternativeProduct | null>((best, alt) => {
    if (alt.price < product.price && (!best || alt.price < best.price)) return alt;
    return best;
  }, null);
}

interface ProductRowProps {
  product: CartProduct<unknown>;
  onSwap: (alternative: AlternativeProduct) => void;
  onFindAlternatives?: (searchTerm: string, currentProductName: string, query: string) => Promise<AlternativeProduct[]>;
}

/** A single product line inside an expanded store cart card. */
export function ProductRow({ product, onSwap, onFindAlternatives }: ProductRowProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchedAlternatives, setSearchedAlternatives] = useState<AlternativeProduct[] | null>(null);
  const cheaperAlt = pickCheaperAlternative(product);
  const attachedAlternatives = product.alternatives.filter((alt) => alt.link !== cheaperAlt?.link);
  const otherAlternatives = searchedAlternatives ?? attachedAlternatives;

  async function handleFindMore(): Promise<void> {
    if (!onFindAlternatives) return;
    setIsSearching(true);
    try {
      const found = await onFindAlternatives(product.searchTerm, product.productName, product.searchTerm);
      setSearchedAlternatives(found);
      setShowAlternatives(true);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <View style={styles.thumb}>
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={styles.thumbImage} resizeMode="contain" alt="" />
          ) : (
            <Package size={16} strokeWidth={1.75} color={colors.ink3} />
          )}
        </View>
        <Text style={styles.name} numberOfLines={2}>
          {product.productName}
        </Text>
        <View style={styles.priceCol}>
          {product.quantity > 1 ? <Text style={styles.qty}>x{product.quantity}</Text> : null}
          <Text style={[styles.price, product.isCheapest && styles.priceCheapest]}>{formatPrice(product.lineTotal)}</Text>
        </View>
        <Pressable onPress={() => void Linking.openURL(product.link)} hitSlop={8} style={styles.linkBtn}>
          <ExternalLink size={14} strokeWidth={1.75} color={colors.ink2} />
        </Pressable>
      </View>

      {cheaperAlt ? (
        <Pressable onPress={() => onSwap(cheaperAlt)} style={styles.cheaperRow}>
          <ArrowDownRight size={12} strokeWidth={1.75} color={colors.monte} />
          <Text style={styles.cheaperName} numberOfLines={1}>
            {cheaperAlt.productName}
          </Text>
          <Text style={styles.cheaperPrice}>{formatPrice(cheaperAlt.price)}</Text>
        </Pressable>
      ) : null}

      {otherAlternatives.length > 0 ? (
        <View>
          <Pressable onPress={() => setShowAlternatives((v) => !v)} style={styles.altsToggle}>
            <ChevronDown size={12} strokeWidth={1.75} color={colors.ink2} />
            <Text style={styles.altsToggleText}>
              {otherAlternatives.length} alternativa{otherAlternatives.length !== 1 ? "s" : ""}
            </Text>
          </Pressable>
          {showAlternatives ? (
            <View style={styles.altsList}>
              {otherAlternatives.map((alt) => (
                <Pressable key={alt.link} onPress={() => onSwap(alt)} style={styles.altRow}>
                  <Text style={styles.altName} numberOfLines={1}>
                    {alt.productName}
                  </Text>
                  <Text style={styles.altPrice}>{formatPrice(alt.price)}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ) : onFindAlternatives ? (
        <Pressable onPress={() => void handleFindMore()} disabled={isSearching} style={styles.altsToggle}>
          <ChevronDown size={12} strokeWidth={1.75} color={colors.ink2} />
          <Text style={styles.altsToggleText}>{isSearching ? "Buscando…" : "Buscar alternativas"}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrapper: { paddingVertical: spacing.sm, gap: spacing.xs },
    row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    thumb: {
      width: 32,
      height: 32,
      borderRadius: radius.control,
      backgroundColor: c.sand,
      alignItems: "center",
      justifyContent: "center",
    },
    thumbImage: { width: 24, height: 24 },
    name: { flex: 1, fontFamily: fontFamilyForWeight(500), fontSize: 14, color: c.ink },
    priceCol: { alignItems: "flex-end" },
    qty: { fontFamily: fontFamilyForWeight(400), fontSize: 11, color: c.ink2 },
    price: { fontFamily: fontFamilyForWeight(600), fontSize: 14, color: c.ink, fontVariant: ["tabular-nums"] },
    priceCheapest: { color: c.monte },
    linkBtn: { padding: 4 },
    cheaperRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      backgroundColor: c.monteSoft,
      borderRadius: radius.control,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      marginLeft: 40,
    },
    cheaperName: { flex: 1, fontFamily: fontFamilyForWeight(400), fontSize: 12, color: c.monte },
    cheaperPrice: { fontFamily: fontFamilyForWeight(600), fontSize: 12, color: c.monte },
    altsToggle: { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: 40, paddingVertical: 2 },
    altsToggleText: { fontFamily: fontFamilyForWeight(500), fontSize: 12, color: c.ink2 },
    altsList: { marginLeft: 40, gap: 4, paddingTop: 2 },
    altRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 4 },
    altName: { flex: 1, fontFamily: fontFamilyForWeight(400), fontSize: 12, color: c.ink2 },
    altPrice: { fontFamily: fontFamilyForWeight(600), fontSize: 12, color: c.ink },
  });
}
