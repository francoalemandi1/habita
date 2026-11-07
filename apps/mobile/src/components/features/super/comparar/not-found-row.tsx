import { useMemo } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { ExternalLink, SearchX } from "lucide-react-native";
import { groupNotFoundSuggestions } from "@habita/domain";
import { StoreChip } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { radii as radius } from "@habita/design-tokens";

import type { ThemeColors } from "@/theme";
import type { NotFoundSuggestion } from "@habita/contracts";

interface NotFoundRowProps {
  notFound: string[];
  suggestions: NotFoundSuggestion[] | undefined;
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

/**
 * Terms no store matched. Without this row they vanished from the comparison;
 * near-miss products are a hint to rephrase the item, not part of any cart.
 */
export function NotFoundRow({ notFound, suggestions }: NotFoundRowProps): React.JSX.Element | null {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (notFound.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SearchX size={14} strokeWidth={1.75} color={colors.ink2} />
        <Text style={styles.headerText}>No encontramos</Text>
      </View>
      {groupNotFoundSuggestions(notFound, suggestions).map((group) => (
        <View key={group.term} style={styles.group}>
          <Text style={styles.term}>{group.term}</Text>
          <Text style={styles.hint}>
            {group.suggestions.length === 0 ? "Sin productos parecidos. Probá con otro nombre." : "¿Era alguno de estos?"}
          </Text>
          {group.suggestions.map((suggestion) => (
            <Pressable
              key={suggestion.link}
              onPress={() => void Linking.openURL(suggestion.link)}
              style={({ pressed }) => [styles.suggestion, pressed && styles.suggestionPressed]}
            >
              <StoreChip storeName={suggestion.storeName} />
              <Text style={styles.productName} numberOfLines={1}>
                {suggestion.productName}
              </Text>
              <Text style={styles.price}>{formatCurrency(suggestion.price)}</Text>
              <ExternalLink size={14} strokeWidth={1.75} color={colors.ink3} />
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { backgroundColor: c.sand, borderRadius: radius.control, padding: spacing.md, gap: spacing.md },
    header: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
    headerText: { fontFamily: fontFamilyForWeight(500), fontSize: 13, color: c.ink2 },
    group: { gap: spacing.xs },
    term: { fontFamily: fontFamilyForWeight(500), fontSize: 14, color: c.ink },
    hint: { fontFamily: fontFamilyForWeight(400), fontSize: 12, color: c.ink3 },
    suggestion: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: c.paper,
      borderRadius: radius.control,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
    },
    suggestionPressed: { opacity: 0.7 },
    productName: { flex: 1, fontFamily: fontFamilyForWeight(400), fontSize: 13, color: c.ink },
    price: { fontFamily: fontFamilyForWeight(600), fontSize: 13, color: c.ink },
  });
}
