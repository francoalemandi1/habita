import { ScrollView, StyleSheet } from "react-native";
import { Chip } from "@/components/ds";
import { spacing } from "@/theme";
import { PLANES_CATEGORY_LABELS } from "@/lib/planes-logic";

import type { EventCategory } from "@habita/contracts";

export interface PlanesFiltersProps {
  categories: EventCategory[];
  activeCategory: EventCategory | null;
  onSelect: (category: EventCategory | null) => void;
}

/** Category filter chips (handoff §6.8) — labels only, no per-category colors. */
export function PlanesFilters({ categories, activeCategory, onSelect }: PlanesFiltersProps): React.JSX.Element | null {
  if (categories.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      <Chip label="Todos" tone={activeCategory === null ? "filterOn" : "filterOff"} onPress={() => onSelect(null)} />
      {categories.map((category) => (
        <Chip
          key={category}
          label={PLANES_CATEGORY_LABELS[category]}
          tone={activeCategory === category ? "filterOn" : "filterOff"}
          onPress={() => onSelect(activeCategory === category ? null : category)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingVertical: 2,
  },
});
