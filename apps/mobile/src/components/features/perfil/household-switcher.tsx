import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Home } from "lucide-react-native";
import { Badge, ListRow } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";

export interface HouseholdOption {
  id: string;
  name: string;
}

export interface HouseholdSwitcherProps {
  households: HouseholdOption[];
  activeHouseholdId: string | null;
  onSelect: (householdId: string) => void;
}

/** Kept from the legacy Perfil — switching between households someone belongs to. */
export function HouseholdSwitcher({ households, activeHouseholdId, onSelect }: HouseholdSwitcherProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>MIS CASAS</Text>
      {households.map((household) => {
        const isActive = household.id === activeHouseholdId;
        return (
          <ListRow
            key={household.id}
            icon={Home}
            title={household.name}
            onPress={() => onSelect(household.id)}
            trailing={isActive ? <Badge label="Activa" tone="monte" /> : undefined}
          />
        );
      })}
      <ListRow title="Unirme a otro hogar" onPress={() => router.push("/(auth)/join")} />
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    section: {
      marginTop: spacing.lg,
    },
    sectionLabel: {
      fontFamily: fontFamilyForWeight(700),
      fontSize: 11,
      letterSpacing: 0.8,
      color: c.ink2,
      marginBottom: spacing.xs,
    },
  });
}
