import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { StyledTextInput } from "@/components/ui/text-input";
import { fontFamily, radius, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";

interface ProductItem {
  id: string;
  name: string;
  category: string;
}

interface ProductAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelectProduct: (name: string) => void;
  onSubmitEditing: () => void;
  products: ProductItem[];
  placeholder?: string;
  maxSuggestions?: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  almacen: "Almacén",
  frutas_verduras: "Frutas y verduras",
  carnes: "Carnes",
  lacteos: "Lácteos",
  panaderia_dulces: "Panadería",
  bebidas: "Bebidas",
  limpieza: "Limpieza",
  perfumeria: "Perfumería",
};

export function ProductAutocomplete({
  value,
  onChangeText,
  onSelectProduct,
  onSubmitEditing,
  products,
  placeholder,
  maxSuggestions = 6,
}: ProductAutocompleteProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [isFocused, setIsFocused] = useState(false);

  const suggestions = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (query.length < 2) return [];
    return products
      .filter((p) => p.name.toLowerCase().includes(query))
      .slice(0, maxSuggestions);
  }, [value, products, maxSuggestions]);

  const showDropdown = isFocused && suggestions.length > 0;

  return (
    <View style={styles.container}>
      <StyledTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 150)}
        onSubmitEditing={onSubmitEditing}
        returnKeyType="done"
        autoCorrect={false}
      />
      {showDropdown ? (
        <View style={styles.dropdown}>
          {suggestions.map((item, index) => (
            <Pressable
              key={item.id}
              style={[styles.item, index === suggestions.length - 1 && styles.itemLast]}
              onPress={() => {
                onSelectProduct(item.name);
                setIsFocused(false);
              }}
            >
              <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.itemCategory}>
                {CATEGORY_LABELS[item.category] ?? item.category}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      position: "relative",
      zIndex: 10,
    },
    dropdown: {
      position: "absolute",
      top: "100%",
      left: 0,
      right: 0,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
      marginTop: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      maxHeight: 240,
      overflow: "hidden",
    },
    item: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    itemLast: {
      borderBottomWidth: 0,
    },
    itemName: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      color: c.text,
      flex: 1,
    },
    itemCategory: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      color: c.mutedForeground,
      marginLeft: spacing.sm,
    },
  });
}
