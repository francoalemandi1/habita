import { ScrollView, StyleSheet } from "react-native";
import { Chip } from "@/components/ds";
import { spacing } from "@/theme";

interface RubroChipsProps {
  rubros: string[];
  active: string | null;
  onChange: (rubro: string | null) => void;
}

export function RubroChips({ rubros, active, onChange }: RubroChipsProps): React.JSX.Element {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      <Chip label="Todos" tone={active === null ? "filterOn" : "filterOff"} onPress={() => onChange(null)} />
      {rubros.map((rubro) => (
        <Chip
          key={rubro}
          label={rubro}
          tone={active === rubro ? "filterOn" : "filterOff"}
          onPress={() => onChange(active === rubro ? null : rubro)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.sm },
});
