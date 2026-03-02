import { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useGroceryDeals } from "@/hooks/use-grocery-deals";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { semanticColors } from "@habita/design-tokens";

import type { GroceryCategory, StoreCluster, ProductPrice } from "@/hooks/use-grocery-deals";

// ── Category config ─────────────────────────────────────────────────────────

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

// ── Product row ─────────────────────────────────────────────────────────────

function ProductRow({ product }: { product: ProductPrice }) {
  const handlePress = () => {
    if (product.sourceUrl) void Linking.openURL(product.sourceUrl);
  };

  return (
    <Pressable
      onPress={product.sourceUrl ? handlePress : undefined}
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
      }}
    >
      <View style={{ flex: 1, marginRight: 10 }}>
        <Text style={{ fontSize: 13, color: "#111", fontWeight: "500" }} numberOfLines={2}>
          {product.productName}
        </Text>
        {product.discount && product.discount !== "0%" && (
          <Text style={{ fontSize: 11, color: "#16a34a", marginTop: 2 }}>
            ↓ {product.discount}
          </Text>
        )}
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={{ fontWeight: "700", color: "#111" }}>{product.price}</Text>
        {product.originalPrice && (
          <Text style={{ fontSize: 11, color: "#9ca3af", textDecorationLine: "line-through" }}>
            {product.originalPrice}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

// ── Store cluster card ──────────────────────────────────────────────────────

function StoreCard({ cluster, rank }: { cluster: StoreCluster; rank: number }) {
  const [expanded, setExpanded] = useState(rank === 0); // first store open by default

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <View
      style={{
        borderWidth: rank === 0 ? 2 : 1,
        borderColor: rank === 0 ? semanticColors.primary : "#e5e7eb",
        borderRadius: 14,
        marginBottom: 12,
        overflow: "hidden",
        backgroundColor: rank === 0 ? "#f0f9ff" : "#fff",
      }}
    >
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={{ padding: 14 }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 20 }}>{medals[rank] ?? `#${rank + 1}`}</Text>
            <View>
              <Text style={{ fontWeight: "700", color: "#111", fontSize: 15 }}>
                {cluster.storeName}
              </Text>
              <Text style={{ color: "#6b7280", fontSize: 12 }}>
                {cluster.productCount} productos encontrados
              </Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            {cluster.averageDiscountPercent > 0 && (
              <View style={{ backgroundColor: "#dcfce7", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ color: "#16a34a", fontWeight: "700", fontSize: 13 }}>
                  -{cluster.averageDiscountPercent.toFixed(0)}% prom.
                </Text>
              </View>
            )}
            <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 3 }}>
              {expanded ? "▲" : "▼"}
            </Text>
          </View>
        </View>
      </Pressable>

      {expanded && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          {cluster.products.map((p, i) => (
            <ProductRow key={i} product={p} />
          ))}
          {cluster.totalEstimatedSavings > 0 && (
            <Text style={{ color: "#16a34a", fontSize: 12, fontWeight: "600", marginTop: 8 }}>
              Ahorro estimado total: ${cluster.totalEstimatedSavings.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────

export default function GroceryDealsScreen() {
  const [selectedCategory, setSelectedCategory] = useState<GroceryCategory>("almacen");
  const dealsM = useGroceryDeals();

  const handleSearch = (category: GroceryCategory, forceRefresh = false) => {
    setSelectedCategory(category);
    dealsM.mutate({ category, city: "Buenos Aires", country: "AR", forceRefresh });
  };

  const clusters = dealsM.data?.clusters ?? [];
  const recommendation = dealsM.data?.recommendation;
  const notFound = dealsM.data?.productsNotFound ?? [];
  const isCached = dealsM.data?.cached ?? false;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff", padding: 20 }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#111" }}>Ofertas del super</Text>
        <Text style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
          Mejores precios por categoría en supermercados cercanos
        </Text>

        {/* Category pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 14 }}
          contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
        >
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.value}
              onPress={() => handleSearch(cat.value)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 20,
                backgroundColor:
                  selectedCategory === cat.value && dealsM.data
                    ? semanticColors.primary
                    : "#f3f4f6",
              }}
            >
              <Text style={{ fontSize: 16 }}>{cat.emoji}</Text>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color:
                    selectedCategory === cat.value && dealsM.data ? "#fff" : "#374151",
                }}
              >
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Loading */}
        {dealsM.isPending && (
          <View style={{ marginTop: 40, alignItems: "center", gap: 12 }}>
            <ActivityIndicator size="large" color={semanticColors.primary} />
            <Text style={{ color: "#6b7280" }}>Buscando las mejores ofertas...</Text>
          </View>
        )}

        {/* Error */}
        {dealsM.isError && (
          <View style={{ backgroundColor: "#fee2e2", borderRadius: 10, padding: 12, marginTop: 16 }}>
            <Text style={{ color: "#b91c1c", fontSize: 13 }}>
              {getMobileErrorMessage(dealsM.error)}
            </Text>
          </View>
        )}

        {/* Results */}
        {!dealsM.isPending && clusters.length > 0 && (
          <View style={{ marginTop: 16 }}>
            {/* Cached indicator + refresh */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ color: "#6b7280", fontSize: 12 }}>
                {isCached ? "📦 Resultados en caché" : "🔄 Resultados frescos"}
              </Text>
              <Pressable
                onPress={() => handleSearch(selectedCategory, true)}
                style={{
                  backgroundColor: "#f3f4f6",
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                }}
              >
                <Text style={{ fontSize: 12, color: "#374151" }}>Actualizar</Text>
              </Pressable>
            </View>

            {/* Recommendation */}
            {recommendation && (
              <View
                style={{
                  backgroundColor: "#eff6ff",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 14,
                  borderLeftWidth: 3,
                  borderLeftColor: semanticColors.primary,
                }}
              >
                <Text style={{ fontSize: 13, color: "#1e40af" }}>💡 {recommendation}</Text>
              </View>
            )}

            {clusters.map((cluster, i) => (
              <StoreCard key={cluster.storeName} cluster={cluster} rank={i} />
            ))}

            {notFound.length > 0 && (
              <View style={{ backgroundColor: "#fef9c3", borderRadius: 10, padding: 12 }}>
                <Text style={{ color: "#854d0e", fontSize: 13, fontWeight: "600" }}>
                  Sin resultados: {notFound.join(", ")}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Empty state */}
        {!dealsM.isPending && !dealsM.data && !dealsM.isError && (
          <View style={{ marginTop: 40, alignItems: "center" }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🏷</Text>
            <Text style={{ color: "#6b7280", textAlign: "center", fontSize: 14 }}>
              Elegí una categoría para ver{"\n"}las mejores ofertas del momento.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
