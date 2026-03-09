import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
  ShoppingCart,
  Tag,
} from "lucide-react-native";
import { useGroceryDeals, useTopDeals } from "@/hooks/use-grocery-deals";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { useThemeColors } from "@/hooks/use-theme";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { fontFamily, spacing, typography } from "@/theme";

import type { ThemeColors } from "@/theme";
import type { GroceryCategory, StoreCluster, ProductPrice } from "@/hooks/use-grocery-deals";
import type { TopDealProduct } from "@habita/contracts";

// ============================================
// Catalog sub-view (category-based)
// ============================================

const CATEGORIES: { value: GroceryCategory; label: string; emoji: string }[] = [
  { value: "almacen", label: "Almacen", emoji: "🛒" },
  { value: "frutas_verduras", label: "Frutas y Verd.", emoji: "🥦" },
  { value: "carnes", label: "Carnes", emoji: "🥩" },
  { value: "lacteos", label: "Lacteos", emoji: "🥛" },
  { value: "panaderia_dulces", label: "Panaderia", emoji: "🍞" },
  { value: "bebidas", label: "Bebidas", emoji: "🥤" },
  { value: "limpieza", label: "Limpieza", emoji: "🧹" },
  { value: "perfumeria", label: "Perfumeria", emoji: "🧴" },
];

function CatalogProductRow({ product }: { product: ProductPrice }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handlePress = () => {
    if (product.sourceUrl) void Linking.openURL(product.sourceUrl);
  };

  return (
    <Pressable
      onPress={product.sourceUrl ? handlePress : undefined}
      style={styles.productRow}
    >
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{product.productName}</Text>
        {product.discount && product.discount !== "0%" ? (
          <Text style={styles.productDiscount}>↓ {product.discount}</Text>
        ) : null}
      </View>
      <View style={styles.productPrices}>
        <Text style={styles.productPrice}>{product.price}</Text>
        {product.originalPrice ? (
          <Text style={styles.productOriginalPrice}>{product.originalPrice}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function CatalogStoreCard({ cluster, rank }: { cluster: StoreCluster; rank: number }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(rank === 0);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <Card style={rank === 0 ? styles.topStoreCard : undefined}>
      <CardContent>
        <Pressable onPress={() => setExpanded((v) => !v)} style={styles.storeHeader}>
          <View style={styles.storeHeaderLeft}>
            <Text style={styles.storeMedal}>{medals[rank] ?? `#${rank + 1}`}</Text>
            <View>
              <Text style={styles.storeName}>{cluster.storeName}</Text>
              <Text style={styles.storeProductCount}>{cluster.productCount} productos</Text>
            </View>
          </View>
          <View style={styles.storeHeaderRight}>
            {cluster.averageDiscountPercent > 0 ? (
              <Badge style={styles.discountBadge}>
                -{cluster.averageDiscountPercent.toFixed(0)}% prom.
              </Badge>
            ) : null}
            {expanded
              ? <ChevronUp size={16} color={colors.mutedForeground} />
              : <ChevronDown size={16} color={colors.mutedForeground} />
            }
          </View>
        </Pressable>

        {expanded ? (
          <View style={styles.storeProducts}>
            {cluster.products.map((p) => (
              <CatalogProductRow key={p.productName} product={p} />
            ))}
            {cluster.totalEstimatedSavings > 0 ? (
              <Text style={styles.totalSavings}>
                Ahorro estimado: ${cluster.totalEstimatedSavings.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
              </Text>
            ) : null}
          </View>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CatalogView({ onBack }: { onBack: () => void }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{ category?: string }>();
  const initialCategory = (params.category as GroceryCategory | undefined) ?? "almacen";

  const [selectedCategory, setSelectedCategory] = useState<GroceryCategory>(initialCategory);
  const dealsM = useGroceryDeals();

  const handleSearch = (category: GroceryCategory, forceRefresh = false) => {
    setSelectedCategory(category);
    dealsM.mutate({ category, forceRefresh });
  };

  const clusters = dealsM.data?.clusters ?? [];
  const recommendation = dealsM.data?.recommendation;
  const notFound = dealsM.data?.productsNotFound ?? [];
  const isCached = dealsM.data?.cached ?? false;

  return (
    <>
      <View style={styles.header}>
        <View style={styles.backRow}>
          <Pressable onPress={onBack} style={styles.backBtn} hitSlop={8}>
            <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
          </Pressable>
          <Text style={[styles.backTitle, { color: colors.text }]}>Catalogo de Ofertas</Text>
          <View style={styles.backBtn} />
        </View>
        <Text style={styles.subtitle}>Precios por categoria en supermercados</Text>
      </View>

      <ScrollView
        bounces={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryPills}
        >
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.value && !!dealsM.data;
            return (
              <Pressable
                key={cat.value}
                onPress={() => handleSearch(cat.value)}
                style={[styles.categoryPill, isActive && styles.categoryPillActive]}
              >
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {dealsM.isPending ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Buscando ofertas...</Text>
          </View>
        ) : null}

        {dealsM.isError ? (
          <Card style={styles.errorCard}>
            <CardContent><Text style={styles.errorText}>{getMobileErrorMessage(dealsM.error)}</Text></CardContent>
          </Card>
        ) : null}

        {!dealsM.isPending && clusters.length > 0 ? (
          <View style={styles.resultsContainer}>
            <View style={styles.resultsHeader}>
              <Text style={styles.cacheLabel}>
                {isCached ? "Resultados en cache" : "Resultados frescos"}
              </Text>
              <Button
                variant="outline"
                size="sm"
                onPress={() => handleSearch(selectedCategory, true)}
              >
                <RefreshCw size={14} color={colors.mutedForeground} />
                Actualizar
              </Button>
            </View>

            {recommendation ? (
              <Card style={styles.recommendationCard}>
                <CardContent>
                  <Text style={styles.recommendationText}>{recommendation}</Text>
                </CardContent>
              </Card>
            ) : null}

            {clusters.map((cluster, i) => (
              <CatalogStoreCard key={cluster.storeName} cluster={cluster} rank={i} />
            ))}

            {notFound.length > 0 ? (
              <Card style={styles.notFoundCard}>
                <CardContent>
                  <Text style={styles.notFoundText}>Sin resultados: {notFound.join(", ")}</Text>
                </CardContent>
              </Card>
            ) : null}
          </View>
        ) : null}

        {!dealsM.isPending && !dealsM.data && !dealsM.isError ? (
          <EmptyState
            icon={<Tag size={32} color={colors.mutedForeground} />}
            title="Elegi una categoria"
            subtitle="Selecciona una categoria para ver las mejores ofertas del momento."
          />
        ) : null}
      </ScrollView>
    </>
  );
}

// ============================================
// Top Deals sub-view (default)
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
        {isSelected ? <Check size={12} color="#fff" strokeWidth={3} /> : null}
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

function TopDealsView({ onShowCatalog }: { onShowCatalog: () => void }) {
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
      <View style={styles.header}>
        <View style={styles.backRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
          </Pressable>
          <Text style={[styles.backTitle, { color: colors.text }]}>Top Ofertas</Text>
          <Pressable onPress={onShowCatalog} hitSlop={8}>
            <Text style={styles.catalogLink}>Ver catalogo →</Text>
          </Pressable>
        </View>
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
            subtitle="Todavia no hay datos de precios para tu zona. Volve a intentar mas tarde."
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
            <ShoppingCart size={18} color="#fff" />
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
  const [showCatalog, setShowCatalog] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {showCatalog ? (
        <CatalogView onBack={() => setShowCatalog(false)} />
      ) : (
        <TopDealsView onShowCatalog={() => setShowCatalog(true)} />
      )}
    </SafeAreaView>
  );
}

// ============================================
// Styles
// ============================================

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs },
    backRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.card, alignItems: "center", justifyContent: "center" },
    backTitle: { ...typography.cardTitle },
    subtitle: { fontFamily: fontFamily.sans, fontSize: 13, color: c.mutedForeground, marginTop: 2 },
    catalogLink: { fontFamily: fontFamily.sans, fontSize: 13, fontWeight: "600", color: c.primary },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 100, gap: spacing.md },
    categoryPills: { gap: spacing.sm, paddingBottom: 4, paddingHorizontal: 0 },
    categoryPill: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 20, backgroundColor: c.muted },
    categoryPillActive: { backgroundColor: c.primary },
    categoryEmoji: { fontFamily: fontFamily.sans, fontSize: 16 },
    categoryLabel: { fontFamily: fontFamily.sans, fontSize: 13, fontWeight: "600", color: c.text },
    categoryLabelActive: { color: "#ffffff" },
    loadingContainer: { alignItems: "center", gap: spacing.sm, paddingTop: 40 },
    loadingText: { fontFamily: fontFamily.sans, color: c.mutedForeground, fontSize: 13 },
    errorCard: { backgroundColor: c.errorBg },
    errorText: { fontFamily: fontFamily.sans, color: c.errorText, fontSize: 13 },
    resultsContainer: { gap: spacing.sm },
    resultsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    cacheLabel: { fontFamily: fontFamily.sans, color: c.mutedForeground, fontSize: 12 },
    recommendationCard: { backgroundColor: c.primaryLight, borderLeftWidth: 3, borderLeftColor: c.primary },
    recommendationText: { fontFamily: fontFamily.sans, fontSize: 13, color: c.infoText },
    topStoreCard: { borderWidth: 2, borderColor: c.primary },
    storeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    storeHeaderLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    storeMedal: { fontFamily: fontFamily.sans, fontSize: 20 },
    storeName: { fontFamily: fontFamily.sans, fontWeight: "700", color: c.text, fontSize: 15 },
    storeProductCount: { fontFamily: fontFamily.sans, color: c.mutedForeground, fontSize: 12, marginTop: 2 },
    storeHeaderRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    discountBadge: { backgroundColor: c.successBg },
    storeProducts: { marginTop: spacing.sm },
    totalSavings: { fontFamily: fontFamily.sans, color: c.successText, fontSize: 12, fontWeight: "600", marginTop: spacing.sm },
    productRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: c.border },
    productInfo: { flex: 1, marginRight: spacing.sm },
    productName: { fontFamily: fontFamily.sans, fontSize: 13, color: c.text, fontWeight: "500" },
    productDiscount: { fontFamily: fontFamily.sans, fontSize: 11, color: c.successText, marginTop: 2 },
    productPrices: { alignItems: "flex-end" },
    productPrice: { fontFamily: fontFamily.sans, fontWeight: "700", color: c.text },
    productOriginalPrice: { fontFamily: fontFamily.sans, fontSize: 11, color: c.mutedForeground, textDecorationLine: "line-through" },
    notFoundCard: { backgroundColor: c.warningBg },
    notFoundText: { fontFamily: fontFamily.sans, color: c.warningText, fontSize: 13, fontWeight: "600" },
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
      color: "#fff",
    },
  });
}
