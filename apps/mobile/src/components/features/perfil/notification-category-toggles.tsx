import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Toggle, useSnackbar } from "@/components/ds";
import { useNotificationPreferences, useToggleNotificationPreference } from "@/hooks/use-notification-preferences";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";

/** §5.3 Configuración de avisos — toggles per category, pattern A. */
export function NotificationCategoryToggles(): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const prefsQuery = useNotificationPreferences();
  const togglePref = useToggleNotificationPreference();
  const snackbar = useSnackbar();

  const handleToggle = (category: string, enabled: boolean) => {
    togglePref.mutate(
      { category, enabled },
      {
        onError: () => {
          snackbar.show({
            text: "No se pudo guardar",
            tone: "error",
            actionLabel: "Reintentar",
            onAction: () => handleToggle(category, enabled),
          });
        },
      },
    );
  };

  if (prefsQuery.isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={colors.ink2} />
      </View>
    );
  }

  if (!prefsQuery.data) {
    return <Text style={styles.error}>No se pudieron cargar las categorías.</Text>;
  }

  return (
    <View style={styles.list}>
      {prefsQuery.data.map((pref) => (
        <View key={pref.category} style={styles.row}>
          <Text style={styles.label}>{pref.label}</Text>
          <Toggle
            value={pref.enabled}
            onValueChange={(enabled) => handleToggle(pref.category, enabled)}
            accessibilityLabel={pref.label}
          />
        </View>
      ))}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    list: {
      gap: spacing.sm,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.lineSoft,
    },
    label: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 15,
      color: c.ink,
      flex: 1,
    },
    loading: {
      paddingVertical: spacing.lg,
      alignItems: "center",
    },
    error: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 14,
      color: c.ink2,
    },
  });
}
