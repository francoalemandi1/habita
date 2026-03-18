import { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bell, BellOff } from "lucide-react-native";
import { Linking } from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { useNotificationPreferences, useToggleNotificationPreference } from "@/hooks/use-notification-preferences";
import { getPushPermissionStatus } from "@/lib/push-notifications";
import { Card, CardContent } from "@/components/ui/card";
import { ScreenHeader } from "@/components/features/screen-header";
import { fontFamily, radius, spacing, typography } from "@/theme";

import { useEffect, useState } from "react";

import type { ThemeColors } from "@/theme";

export default function NotificationSettingsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const prefsQuery = useNotificationPreferences();
  const togglePref = useToggleNotificationPreference();

  const [pushGranted, setPushGranted] = useState<boolean | null>(null);

  useEffect(() => {
    void getPushPermissionStatus().then((status) => {
      setPushGranted(status === "granted");
    });
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader />
      <ScrollView bounces={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Notificaciones</Text>

        {/* Push permission status banner */}
        <View style={[styles.statusBanner, pushGranted ? styles.statusGranted : styles.statusDenied]}>
          {pushGranted ? (
            <Bell size={18} color={colors.successText} />
          ) : (
            <BellOff size={18} color={colors.warningText} />
          )}
          <View style={styles.statusTextContainer}>
            <Text style={[styles.statusTitle, pushGranted ? { color: colors.successText } : { color: colors.warningText }]}>
              {pushGranted === null
                ? "Verificando permisos..."
                : pushGranted
                  ? "Notificaciones activadas"
                  : "Notificaciones desactivadas"}
            </Text>
            {pushGranted === false ? (
              <Pressable onPress={() => void Linking.openSettings()}>
                <Text style={styles.statusLink}>Activar en Ajustes del dispositivo</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CATEGORÍAS</Text>
          <Text style={styles.sectionHint}>
            Elegí qué tipo de notificaciones push querés recibir. Las notificaciones dentro de la app siempre se muestran.
          </Text>
          <Card>
            <CardContent style={styles.sectionContent}>
              {prefsQuery.isLoading ? (
                <View style={styles.loading}>
                  <ActivityIndicator size="small" color={colors.mutedForeground} />
                </View>
              ) : prefsQuery.data ? (
                prefsQuery.data.map((pref, index) => (
                  <View
                    key={pref.category}
                    style={[
                      styles.prefRow,
                      index < prefsQuery.data.length - 1 && styles.prefRowBorder,
                    ]}
                  >
                    <Text style={styles.prefLabel}>{pref.label}</Text>
                    <Switch
                      value={pref.enabled}
                      onValueChange={(enabled) => {
                        togglePref.mutate({ category: pref.category, enabled });
                      }}
                      trackColor={{
                        false: colors.muted,
                        true: colors.primary,
                      }}
                      thumbColor={colors.white}
                    />
                  </View>
                ))
              ) : (
                <Text style={styles.errorText}>No se pudieron cargar las preferencias.</Text>
              )}
            </CardContent>
          </Card>
        </View>

        <Text style={styles.footerHint}>
          Máximo 3 notificaciones push por día, entre 8:00 y 21:00 hs.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: 24,
    },
    title: {
      ...typography.pageTitle,
      color: c.text,
      marginTop: spacing.md,
      marginBottom: spacing.lg,
    },
    statusBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.xl,
      marginBottom: spacing.lg,
    },
    statusGranted: {
      backgroundColor: c.successBg,
    },
    statusDenied: {
      backgroundColor: c.warningBg,
    },
    statusTextContainer: {
      flex: 1,
    },
    statusTitle: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      fontWeight: "600",
    },
    statusLink: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.primary,
      fontWeight: "600",
      marginTop: 2,
    },
    section: {
      marginBottom: spacing.lg,
    },
    sectionLabel: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      fontWeight: "700",
      color: c.mutedForeground,
      letterSpacing: 0.8,
      marginBottom: spacing.xs,
      paddingLeft: spacing.xs,
    },
    sectionHint: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
      marginBottom: spacing.sm,
      paddingLeft: spacing.xs,
    },
    sectionContent: {
      padding: 0,
      paddingVertical: 0,
    },
    prefRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 13,
      paddingHorizontal: spacing.md,
    },
    prefRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    prefLabel: {
      fontFamily: fontFamily.sans,
      fontSize: 15,
      fontWeight: "500",
      color: c.text,
      flex: 1,
    },
    loading: {
      paddingVertical: spacing.lg,
      alignItems: "center",
    },
    errorText: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      color: c.mutedForeground,
      padding: spacing.md,
      textAlign: "center",
    },
    footerHint: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
      textAlign: "center",
      paddingHorizontal: spacing.md,
    },
  });
}
