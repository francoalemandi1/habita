import { useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Button, ScreenHeader, SegmentedControl } from "@/components/ds";
import { useMarkAllNotificationsRead, useNotifications } from "@/hooks/use-notifications";
import { useRespondTransfer, useTransfers } from "@/hooks/use-transfers";
import { usePushPermissionSheet } from "@/hooks/use-push-opt-in";
import { ParaResolverSection } from "@/components/features/avisos/para-resolver-section";
import { NovedadesList } from "@/components/features/avisos/novedades-list";
import { PushPermissionSheet } from "@/components/features/avisos/push-permission-sheet";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";

type AvisosTab = "todas" | "sinLeer";

const TABS: Array<{ value: AvisosTab; label: string }> = [
  { value: "todas", label: "Todas" },
  { value: "sinLeer", label: "Sin leer" },
];

export default function AvisosScreen(): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [tab, setTab] = useState<AvisosTab>("todas");

  const notificationsQuery = useNotifications(tab === "sinLeer");
  const markAllRead = useMarkAllNotificationsRead();
  const pendingTransfersQuery = useTransfers("received");
  const respondTransfer = useRespondTransfer();

  const notifications = notificationsQuery.data?.notifications ?? [];
  const pendingTransfers = (pendingTransfersQuery.data?.transfers ?? []).filter((t) => t.status === "PENDING");

  const pushSheet = usePushPermissionSheet(pendingTransfers.length);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader
        variant="detail"
        title="Avisos"
        backLabel="Casa"
        onBack={() => router.back()}
        action={<Button label="Marcar todas" variant="link" size="sm" onPress={() => markAllRead.mutate()} />}
      />

      <View style={styles.tabs}>
        <SegmentedControl options={TABS} value={tab} onValueChange={setTab} accessibilityLabel="Filtrar avisos" />
      </View>

      <ScrollView
        bounces={false}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={notificationsQuery.isRefetching}
            onRefresh={() => void notificationsQuery.refetch()}
            tintColor={colors.monte}
          />
        }
      >
        <ParaResolverSection
          transfers={pendingTransfers}
          isResponding={respondTransfer.isPending}
          onAccept={(transferId) => respondTransfer.mutate({ transferId, action: "ACCEPT" })}
          onReject={(transferId) => respondTransfer.mutate({ transferId, action: "REJECT" })}
        />

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Novedades</Text>
          <NovedadesList
            isLoading={notificationsQuery.isLoading}
            isError={notificationsQuery.isError}
            onRetry={() => void notificationsQuery.refetch()}
            notifications={notifications}
          />
        </View>

        <Button
          label="Elegir qué avisos recibir"
          variant="link"
          onPress={() => router.push("/(app)/perfil/avisos")}
          style={styles.settingsLink}
        />
      </ScrollView>

      <PushPermissionSheet
        visible={pushSheet.visible}
        onActivate={() => void pushSheet.activate()}
        onDismiss={() => void pushSheet.dismiss()}
      />
    </SafeAreaView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.paper,
    },
    tabs: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.sm,
    },
    scrollContent: {
      paddingHorizontal: spacing.xl,
      paddingBottom: 40,
      gap: spacing.sm,
    },
    section: {
      gap: spacing.sm,
    },
    sectionLabel: {
      fontFamily: fontFamilyForWeight(700),
      fontSize: 12,
      letterSpacing: 0.6,
      color: c.ink2,
      textTransform: "uppercase",
    },
    settingsLink: {
      alignSelf: "center",
      marginTop: spacing.md,
    },
  });
}
