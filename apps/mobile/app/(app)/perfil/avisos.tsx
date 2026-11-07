import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ScreenHeader } from "@/components/ds";
import { useMemberSettings } from "@/hooks/use-member-settings";
import { PushStatusSection } from "@/components/features/perfil/push-status-section";
import { NotificationCategoryToggles } from "@/components/features/perfil/notification-category-toggles";
import { QuietHoursSection } from "@/components/features/perfil/quiet-hours-section";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";

export default function ConfiguracionAvisosScreen(): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const settingsQuery = useMemberSettings();
  const member = settingsQuery.data?.member ?? null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader variant="detail" title="Avisos" backLabel="Perfil" onBack={() => router.back()} />
      <ScrollView bounces={false} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <PushStatusSection />

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CATEGORÍAS</Text>
          <NotificationCategoryToggles />
        </View>

        <QuietHoursSection
          quietHoursStart={member?.quietHoursStart ?? null}
          quietHoursEnd={member?.quietHoursEnd ?? null}
        />
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
