import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, Plus } from "lucide-react-native";
import { TextField } from "@/components/ds";
import { useProductCatalog } from "@/hooks/use-shopping-plan";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";

const CATEGORY_LABELS: Record<string, string> = {
  almacen: "Almacén",
  frutas_verduras: "Frutas y Verduras",
  carnes: "Carnes",
  lacteos: "Lácteos",
  panaderia_dulces: "Panadería y Dulces",
  bebidas: "Bebidas",
  limpieza: "Limpieza",
  perfumeria: "Perfumería",
};

interface CatalogModalProps {
  visible: boolean;
  addedNames: string[];
  onClose: () => void;
  onAddTerm: (name: string) => void;
}

/** Full product catalog picker (design handoff §5.3) — taps add straight to the shared list. */
export function CatalogModal({ visible, addedNames, onClose, onAddTerm }: CatalogModalProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const catalog = useProductCatalog();
  const [search, setSearch] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  const addedSet = useMemo(() => new Set(addedNames.map((name) => name.toLowerCase())), [addedNames]);
  const products = useMemo(() => catalog.data?.products ?? [], [catalog.data]);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const groups = new Map<string, typeof products>();
    for (const product of products) {
      if (query && !product.name.toLowerCase().includes(query)) continue;
      const list = groups.get(product.category);
      if (list) list.push(product);
      else groups.set(product.category, [product]);
    }
    return groups;
  }, [products, search]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onShow={() => setSearch("")}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Catálogo</Text>
          <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
            <Text style={styles.closeText}>Listo</Text>
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <TextField label="Buscar" placeholder="Buscar producto…" value={search} onChangeText={setSearch} />
        </View>

        {catalog.isPending ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.monte} />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {[...filteredGroups.entries()].map(([category, items]) => (
              <View key={category} style={styles.category}>
                <Text style={styles.categoryLabel}>{CATEGORY_LABELS[category] ?? category}</Text>
                <View style={styles.chipRow}>
                  {items.map((product) => {
                    const isAdded = addedSet.has(product.name.toLowerCase());
                    return (
                      <Pressable
                        key={product.id}
                        onPress={() => !isAdded && onAddTerm(product.name)}
                        disabled={isAdded}
                        style={[styles.chip, isAdded && styles.chipAdded]}
                      >
                        {isAdded ? (
                          <Check size={11} strokeWidth={1.75} color={colors.monte} />
                        ) : (
                          <Plus size={11} strokeWidth={1.75} color={colors.ink2} />
                        )}
                        <Text style={[styles.chipText, isAdded && styles.chipTextAdded]} numberOfLines={1}>
                          {product.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.paper },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
    },
    title: { fontFamily: fontFamilyForWeight(700), fontSize: 18, color: c.ink },
    closeBtn: { padding: spacing.xs },
    closeText: { fontFamily: fontFamilyForWeight(600), fontSize: 15, color: c.monte },
    searchRow: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
    loading: { flex: 1, alignItems: "center", justifyContent: "center" },
    scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.lg },
    category: { gap: spacing.sm },
    categoryLabel: { fontFamily: fontFamilyForWeight(600), fontSize: 13, color: c.ink2 },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.line,
      paddingHorizontal: 10,
      paddingVertical: 6,
      maxWidth: 220,
    },
    chipAdded: { borderColor: c.monte, backgroundColor: c.monteSoft },
    chipText: { fontFamily: fontFamilyForWeight(500), fontSize: 13, color: c.ink2 },
    chipTextAdded: { color: c.monte },
  });
}
