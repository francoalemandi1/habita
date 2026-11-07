import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ScreenHeader, Skeleton } from "@/components/ds";
import { useMemberSettings } from "@/hooks/use-member-settings";
import { DisponibilidadGrid } from "@/components/features/perfil/disponibilidad-grid";
import { PreferenciasList } from "@/components/features/perfil/preferencias-list";
import { AbsencesSection } from "@/components/features/perfil/absences-section";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";

export default function DisponibilidadScreen(): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const settingsQuery = useMemberSettings();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader variant="detail" title="Disponibilidad" backLabel="Perfil" onBack={() => router.back()} />
      <ScrollView bounces={false} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {settingsQuery.isLoading ? (
          <Skeleton height={200} />
        ) : (
          <DisponibilidadGrid grid={settingsQuery.data?.member?.availability ?? null} />
        )}
        <Text style={styles.hint}>El plan no te asigna tareas en los días que marques sin franjas.</Text>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PREFERENCIAS</Text>
          <PreferenciasList />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>AUSENCIAS</Text>
          <AbsencesSection />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.paper,
    },
    scrollContent: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      paddingBottom: 40,
      gap: spacing.lg,
    },
    hint: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.ink2,
    },
    section: {
      gap: spacing.sm,
    },
    sectionLabel: {
      fontFamily: fontFamilyForWeight(700),
      fontSize: 11,
      letterSpacing: 0.8,
      color: c.ink2,
    },
  });
}
