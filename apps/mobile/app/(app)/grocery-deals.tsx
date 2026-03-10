import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  Check,
  ChevronDown,
  ExternalLink,
  ShoppingCart,
  Tag,
} from "lucide-react-native";
import { useTopDeals } from "@/hooks/use-grocery-deals";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { useThemeColors } from "@/hooks/use-theme";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SecondaryHeader } from "@/components/ui/secondary-header";
import { fontFamily, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";
import type { TopDealProduct } from "@habita/contracts";

// ============================================
// Top Deals sub-view
// ============================================

function TopDealRow({
  deal,
  isSelected,
  onToggle,
  colors,
}: {
  deal: TopDealProduct;
  isSelected: boolean;
  onToggle: () => void;
  colors: ThemeColors;
}) {
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      onPress={onToggle}
      style={[styles.dealRow, isSelected && { backgroundColor: colors.primary + "10" }]}
    >
      {/* Checkbox */}
      <View
        style={[
          styles.checkbox,
          isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
        ]}
      >
        {isSelected ? <Check size={12} color={colors.white} strokeWidth={3} /> : null}
      </View>

      {/* Product name + category */}
      <View style={styles.dealInfo}>
        <Text style={styles.dealName} numberOfLines={2}>{deal.productName}</Text>
        <Text style={styles.dealStore}>{deal.categoryLabel}</Text>
      </View>

      {/* Price + discount + link */}
      <View style={styles.dealPriceCol}>
        {deal.savingsPercent != null && deal.savingsPercent > 0 ? (
          <Text style={styles.dealDiscount}>-{deal.savingsPercent.toFixed(0)}%</Text>
        ) : null}
        <Text style={styles.dealPrice}>{deal.price}</Text>
        {deal.originalPrice ? (
          <Text style={styles.dealOriginalPrice}>{deal.originalPrice}</Text>
        ) : null}
      </View>

      {deal.sourceUrl ? (
        <Pressable
          onPress={(e) => { e.stopPropagation?.(); void Linking.openURL(deal.sourceUrl); }}
          hitSlop={8}
          style={styles.externalLinkBtn}
        >
          <ExternalLink size={15} color={colors.mutedForeground} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function TopDealsView() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data, isLoading, error } = useTopDeals();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toast = useToast();

  const deals = data?.topDeals ?? [];
  const totalDeals = data?.totalDeals ?? 0;

  // Group by store, ordered by best average discount
  const storeGroups = useMemo(() => {
    const map = new Map<string, TopDealProduct[]>();
    for (const deal of deals) {
      const existing = map.get(deal.store) ?? [];
      existing.push(deal);
      map.set(deal.store, existing);
    }
    return Array.from(map.entries())
      .map(([store, products]) => {
        const avgDiscount =
          products.reduce((s, p) => s + (p.savingsPercent ?? 0), 0) / products.length;
        return { store, products, avgDiscount };
      })
      .sort((a, b) => b.avgDiscount - a.avgDiscount);
  }, [deals]);

  const [expandedStores, setExpandedStores] = useState<Set<string>>(
    () => new Set(storeGroups.slice(0, 1).map((g) => g.store)),
  );

  const toggleStore = useCallback((store: string) => {
    setExpandedStores((prev) => {
      const next = new Set(prev);
      if (next.has(store)) next.delete(store);
      else next.add(store);
      return next;
    });
  }, []);

  const toggleDeal = useCallback((deal: TopDealProduct) => {
    const key = `${deal.productName}|${deal.store}`;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleAddToCart = useCallback(() => {
    const terms = deals
      .filter((d) => selected.has(`${d.productName}|${d.store}`))
      .map((d) => d.productName);

    if (terms.length === 0) return;

    setSelected(new Set());
    toast.success(`${terms.length} producto${terms.length !== 1 ? "s" : ""} agregado${terms.length !== 1 ? "s" : ""} al carrito`);

    router.push({
      pathname: "/compras",
      params: { addTerms: JSON.stringify(terms) },
    });
  }, [deals, selected, toast]);

  return (
    <>
      <SecondaryHeader title="Top Ofertas" />
      <View style={styles.header}>
        <Text style={styles.subtitle}>Mejores descuentos reales en supermercados</Text>
      </View>

      <ScrollView
        bounces={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Cargando mejores ofertas...</Text>
          </View>
        ) : null}

        {error && !isLoading ? (
          <Card style={styles.errorCard}>
            <CardContent>
              <Text style={styles.errorText}>{getMobileErrorMessage(error)}</Text>
            </CardContent>
          </Card>
        ) : null}

        {!isLoading && !error && deals.length === 0 ? (
          <EmptyState
            icon={<Tag size={32} color={colors.mutedForeground} />}
            title="Sin ofertas disponibles"
            subtitle="Todavía no hay datos de precios para tu zona. Volvé a intentar más tarde."
          />
        ) : null}

        {!isLoading && deals.length > 0 ? (
          <View style={styles.resultsContainer}>
            {totalDeals > deals.length ? (
              <Text style={styles.cacheLabel}>
                Mostrando las {deals.length} mejores de {totalDeals} ofertas
              </Text>
            ) : null}

            {storeGroups.map(({ store, products, avgDiscount }) => {
              const isExpanded = expandedStores.has(store);
              const storeSelectedCount = products.filter((d) =>
                selected.has(`${d.productName}|${d.store}`)
              ).length;

              return (
                <Card key={store}>
                  <CardContent style={{ padding: 0 }}>
                    {/* Store header */}
                    <View style={styles.storeGroupHeader}>
                      <View style={styles.storeGroupLeft}>
                        <Text style={styles.storeGroupName}>{store}</Text>
                        <Text style={styles.storeGroupMeta}>
                          {products.length} oferta{products.length !== 1 ? "s" : ""}
                          {storeSelectedCount > 0
                            ? ` · ${storeSelectedCount} selec.`
                            : ""}
                        </Text>
                      </View>
                      <View style={styles.storeGroupRight}>
                        {avgDiscount > 0 ? (
                          <Badge style={styles.discountBadge}>
                            -{avgDiscount.toFixed(0)}% prom.
                          </Badge>
                        ) : null}
                        <Pressable onPress={() => toggleStore(store)} hitSlop={8}>
                          <View style={styles.chevronBtn}>
                            <ChevronDown
                              size={16}
                              color={colors.mutedForeground}
                              style={isExpanded ? { transform: [{ rotate: "180deg" }] } : undefined}
                            />
                          </View>
                        </Pressable>
                      </View>
                    </View>

                    {/* Products */}
                    {isExpanded ? (
                      <View style={styles.storeGroupProducts}>
                        {products.map((deal, i) => {
                          const key = `${deal.productName}|${deal.store}`;
                          return (
                            <View
                              key={key}
                              style={i < products.length - 1 ? styles.dealRowBorder : undefined}
                            >
                              <TopDealRow
                                deal={deal}
                                isSelected={selected.has(key)}
                                onToggle={() => toggleDeal(deal)}
                                colors={colors}
                              />
                            </View>
                          );
                        })}
                      </View>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </View>
        ) : null}
      </ScrollView>

      {selected.size > 0 ? (
        <View style={styles.floatingBtnContainer}>
          <Button onPress={handleAddToCart} style={styles.floatingBtn}>
            <ShoppingCart size={18} color={colors.white} />
            <Text style={styles.floatingBtnText}>
              Agregar {selected.size} al carrito
            </Text>
          </Button>
        </View>
      ) : null}
    </>
  );
}

// ============================================
// Main screen
// ============================================

export default function GroceryDealsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <TopDealsView />
    </SafeAreaView>
  );
}

// ============================================
// Styles
// ============================================

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xs },
    subtitle: { fontFamily: fontFamily.sans, fontSize: 13, color: c.mutedForeground, marginTop: 2 },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 100, gap: spacing.md },
    loadingContainer: { alignItems: "center", gap: spacing.sm, paddingTop: 40 },
    loadingText: { fontFamily: fontFamily.sans, color: c.mutedForeground, fontSize: 13 },
    errorCard: { backgroundColor: c.errorBg },
    errorText: { fontFamily: fontFamily.sans, color: c.errorText, fontSize: 13 },
    resultsContainer: { gap: spacing.sm },
    cacheLabel: { fontFamily: fontFamily.sans, color: c.mutedForeground, fontSize: 12 },
    discountBadge: { backgroundColor: c.successBg },
    // Store group (top deals)
    storeGroupHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md },
    storeGroupLeft: { flex: 1 },
    storeGroupName: { fontFamily: fontFamily.sans, fontWeight: "700", color: c.text, fontSize: 15 },
    storeGroupMeta: { fontFamily: fontFamily.sans, fontSize: 12, color: c.mutedForeground, marginTop: 2 },
    storeGroupRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    chevronBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.muted, alignItems: "center", justifyContent: "center" },
    storeGroupProducts: { borderTopWidth: 1, borderTopColor: c.border },
    dealRowBorder: { borderBottomWidth: 1, borderBottomColor: c.border },
    // Deal row (flat)
    dealRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
    checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: c.mutedForeground, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    dealInfo: { flex: 1 },
    dealName: { fontFamily: fontFamily.sans, fontSize: 13, color: c.text, fontWeight: "500" },
    dealStore: { fontFamily: fontFamily.sans, fontSize: 11, color: c.mutedForeground, marginTop: 1 },
    dealPriceCol: { alignItems: "flex-end" },
    dealDiscount: { fontFamily: fontFamily.sans, fontSize: 10, fontWeight: "700", color: c.successText },
    dealPrice: { fontFamily: fontFamily.sans, fontWeight: "700", color: c.text, fontSize: 13 },
    dealOriginalPrice: { fontFamily: fontFamily.sans, fontSize: 11, color: c.mutedForeground, textDecorationLine: "line-through" },
    externalLinkBtn: { padding: 4 },
    floatingBtnContainer: {
      position: "absolute",
      bottom: spacing.lg,
      left: spacing.lg,
      right: spacing.lg,
      alignItems: "center",
    },
    floatingBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: 24,
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    floatingBtnText: {
      fontFamily: fontFamily.sans,
      fontSize: 15,
      fontWeight: "700",
      color: c.white,
    },
  });
}
