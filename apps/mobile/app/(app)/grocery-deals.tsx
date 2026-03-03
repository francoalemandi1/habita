import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, ChevronDown, ChevronUp, RefreshCw, Tag } from "lucide-react-native";
import { useGroceryDeals } from "@/hooks/use-grocery-deals";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { colors, fontFamily, spacing, typography } from "@/theme";

import type { GroceryCategory, StoreCluster, ProductPrice } from "@/hooks/use-grocery-deals";

const CATEGORIES: { value: GroceryCategory; label: string; emoji: string }[] = [
  { value: "almacen",          label: "Almacén",        emoji: "🛒" },
  { value: "frutas_verduras",  label: "Frutas y Verd.", emoji: "🥦" },
  { value: "carnes",           label: "Carnes",          emoji: "🥩" },
  { value: "lacteos",          label: "Lácteos",         emoji: "🥛" },
  { value: "panaderia_dulces", label: "Panadería",       emoji: "🍞" },
  { value: "bebidas",          label: "Bebidas",         emoji: "🥤" },
  { value: "limpieza",         label: "Limpieza",        emoji: "🧹" },
  { value: "perfumeria",       label: "Perfumería",      emoji: "🧴" },
];

function ProductRow({ product }: { product: ProductPrice }) {
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

function StoreCard({ cluster, rank }: { cluster: StoreCluster; rank: number }) {
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
              <Text style={styles.storeProductCount}>{cluster.productCount} productos encontrados</Text>
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
            {cluster.products.map((p, i) => (
              <ProductRow key={p.productName} product={p} />
            ))}
            {cluster.totalEstimatedSavings > 0 ? (
              <Text style={styles.totalSavings}>
                Ahorro estimado total: ${cluster.totalEstimatedSavings.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
              </Text>
            ) : null}
          </View>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function GroceryDealsScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const initialCategory = (params.category as GroceryCategory | undefined) ?? "almacen";

  const [selectedCategory, setSelectedCategory] = useState<GroceryCategory>(initialCategory);
  const dealsM = useGroceryDeals();

  const handleSearch = (category: GroceryCategory, forceRefresh = false) => {
    setSelectedCategory(category);
    dealsM.mutate({ category, city: "Buenos Aires", country: "AR", forceRefresh });
  };

  // Auto-trigger search when arriving with a pre-selected category from the dashboard
  useEffect(() => {
    if (params.category) {
      handleSearch(initialCategory);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clusters = dealsM.data?.clusters ?? [];
  const recommendation = dealsM.data?.recommendation;
  const notFound = dealsM.data?.productsNotFound ?? [];
  const isCached = dealsM.data?.cached ?? false;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.backRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
          </Pressable>
          <Text style={styles.backTitle}>Ofertas del super</Text>
          <View style={styles.backBtn} />
        </View>
        <Text style={styles.subtitle}>Mejores precios por categoría en supermercados cercanos</Text>
      </View>

      <ScrollView
        bounces={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Category pills */}
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

        {/* Loading */}
        {dealsM.isPending ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Buscando las mejores ofertas...</Text>
          </View>
        ) : null}

        {/* Error */}
        {dealsM.isError ? (
          <Card style={styles.errorCard}>
            <CardContent><Text style={styles.errorText}>{getMobileErrorMessage(dealsM.error)}</Text></CardContent>
          </Card>
        ) : null}

        {/* Results */}
        {!dealsM.isPending && clusters.length > 0 ? (
          <View style={styles.resultsContainer}>
            <View style={styles.resultsHeader}>
              <Text style={styles.cacheLabel}>
                {isCached ? "📦 Resultados en caché" : "🔄 Resultados frescos"}
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
                  <Text style={styles.recommendationText}>💡 {recommendation}</Text>
                </CardContent>
              </Card>
            ) : null}

            {clusters.map((cluster, i) => (
              <StoreCard key={cluster.storeName} cluster={cluster} rank={i} />
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

        {/* Empty state */}
        {!dealsM.isPending && !dealsM.data && !dealsM.isError ? (
          <EmptyState
            icon={<Tag size={32} color={colors.mutedForeground} />}
            title="Elegí una categoría"
            subtitle="Selecioná una categoría para ver las mejores ofertas del momento."
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs },
  backRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  backTitle: { ...typography.cardTitle },
  subtitle: { fontFamily: fontFamily.sans, fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 24, gap: spacing.md },
  categoryPills: { gap: spacing.sm, paddingBottom: 4, paddingHorizontal: 0 },
  categoryPill: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 20, backgroundColor: colors.muted },
  categoryPillActive: { backgroundColor: colors.primary },
  categoryEmoji: { fontFamily: fontFamily.sans, fontSize: 16 },
  categoryLabel: { fontFamily: fontFamily.sans, fontSize: 13, fontWeight: "600", color: colors.text },
  categoryLabelActive: { color: "#ffffff" },
  loadingContainer: { alignItems: "center", gap: spacing.sm, paddingTop: 40 },
  loadingText: { color: colors.mutedForeground },
  errorCard: { backgroundColor: colors.errorBg },
  errorText: { fontFamily: fontFamily.sans, color: colors.errorText, fontSize: 13 },
  resultsContainer: { gap: spacing.sm },
  resultsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cacheLabel: { fontFamily: fontFamily.sans, color: colors.mutedForeground, fontSize: 12 },
  recommendationCard: { backgroundColor: colors.primaryLight, borderLeftWidth: 3, borderLeftColor: colors.primary },
  recommendationText: { fontFamily: fontFamily.sans, fontSize: 13, color: colors.infoText },
  topStoreCard: { borderWidth: 2, borderColor: colors.primary },
  storeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  storeHeaderLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  storeMedal: { fontFamily: fontFamily.sans, fontSize: 20 },
  storeName: { fontFamily: fontFamily.sans, fontWeight: "700", color: colors.text, fontSize: 15 },
  storeProductCount: { fontFamily: fontFamily.sans, color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
  storeHeaderRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  discountBadge: { backgroundColor: colors.successBg },
  storeProducts: { marginTop: spacing.sm },
  totalSavings: { fontFamily: fontFamily.sans, color: colors.successText, fontSize: 12, fontWeight: "600", marginTop: spacing.sm },
  productRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  productInfo: { flex: 1, marginRight: spacing.sm },
  productName: { fontFamily: fontFamily.sans, fontSize: 13, color: colors.text, fontWeight: "500" },
  productDiscount: { fontFamily: fontFamily.sans, fontSize: 11, color: colors.successText, marginTop: 2 },
  productPrices: { alignItems: "flex-end" },
  productPrice: { fontWeight: "700", color: colors.text },
  productOriginalPrice: { fontFamily: fontFamily.sans, fontSize: 11, color: colors.mutedForeground, textDecorationLine: "line-through" },
  notFoundCard: { backgroundColor: colors.warningBg },
  notFoundText: { fontFamily: fontFamily.sans, color: colors.warningText, fontSize: 13, fontWeight: "600" },
});
