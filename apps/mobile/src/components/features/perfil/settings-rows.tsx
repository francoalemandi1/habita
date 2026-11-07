import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Bell, CalendarClock, Pencil, Wrench } from "lucide-react-native";
import { ListRow } from "@/components/ds";
import { ThemeRow } from "./theme-row";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";

export interface SettingsRowsProps {
  onEditNamePress: () => void;
}

/** §5.3 Perfil — Disponibilidad, Avisos, Apariencia and the kept Servicios row. */
export function SettingsRows({ onEditNamePress }: SettingsRowsProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>AJUSTES</Text>
      <ListRow icon={Pencil} title="Editar nombre" onPress={onEditNamePress} />
      <ListRow
        icon={CalendarClock}
        title="Disponibilidad"
        onPress={() => router.push("/(app)/perfil/disponibilidad")}
      />
      <ListRow icon={Bell} title="Avisos" onPress={() => router.push("/(app)/perfil/avisos")} />
      {/* Mirrors PLATA_ROUTES.servicios (@habita/contracts) with the mobile route-group prefix */}
      <ListRow icon={Wrench} title="Servicios" onPress={() => router.push("/(app)/plata/servicios")} />
      <View style={styles.themeRow}>
        <Text style={styles.themeLabel}>Apariencia</Text>
        <ThemeRow />
      </View>
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
    themeRow: {
      paddingVertical: spacing.md,
      gap: spacing.sm,
    },
    themeLabel: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 15,
      color: c.ink,
    },
  });
}
