import { useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bell, CheckCheck } from "lucide-react-native";
import { useMarkAllNotificationsRead, useNotifications } from "@/hooks/use-notifications";
import { useRespondTransfer, useTransfers } from "@/hooks/use-transfers";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { useThemeColors } from "@/hooks/use-theme";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { TabBar } from "@/components/ui/tab-bar";
import { SecondaryHeader } from "@/components/ui/secondary-header";
import { fontFamily, fontFamilyForWeight, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";

export default function NotificationsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const notificationsQuery = useNotifications(unreadOnly);
  const markAllRead = useMarkAllNotificationsRead();
  const pendingTransfersQuery = useTransfers("received");
  const respondTransfer = useRespondTransfer();

  const notifications = notificationsQuery.data?.notifications ?? [];
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;
  const pendingTransfers = (pendingTransfersQuery.data?.transfers ?? []).filter((t) => t.status === "PENDING");

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.headerOuter}>
        <SecondaryHeader title="Notificaciones" />
        <View style={styles.header}>
          <View>
            {unreadCount > 0 ? (
              <Text style={styles.subtitle}>{unreadCount} sin leer</Text>
            ) : null}
          </View>
          <Button
            variant="outline"
            size="sm"
            onPress={() => markAllRead.mutate()}
            loading={markAllRead.isPending}
          >
            Marcar todas
          </Button>
        </View>
      </View>

      <TabBar
        tabs={[{ label: "Todas" }, { label: "Sin leer" }]}
        activeIndex={unreadOnly ? 1 : 0}
        onTabPress={(i) => setUnreadOnly(i === 1)}
        style={styles.tabBar}
      />

      <ScrollView
        bounces={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={notificationsQuery.isRefetching}
            onRefresh={() => void notificationsQuery.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {pendingTransfers.length > 0 ? (
          <View style={styles.resolveSection}>
            <Text style={styles.sectionLabel}>Para resolver</Text>
            {pendingTransfers.map((transfer) => (
              <Card key={transfer.id} style={styles.transferCard}>
                <CardContent>
                  <View style={styles.notifHeader}>
                    <Text style={styles.notifTitle}>{transfer.assignment.task.name}</Text>
                  </View>
                  <Text style={styles.notifMessage}>{transfer.fromMember.name} te pide que la hagas vos.</Text>
                  <View style={styles.transferActions}>
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => respondTransfer.mutate({ transferId: transfer.id, action: "REJECT" })}
                    >
                      No puedo
                    </Button>
                    <Button
                      size="sm"
                      onPress={() => respondTransfer.mutate({ transferId: transfer.id, action: "ACCEPT" })}
                    >
                      Aceptar
                    </Button>
                  </View>
                </CardContent>
              </Card>
            ))}
          </View>
        ) : null}

        {notificationsQuery.isLoading ? (
          <View style={styles.loadingList}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : notificationsQuery.isError ? (
          <Card style={styles.errorCard}>
            <CardContent>
              <Text style={styles.errorText}>
                {getMobileErrorMessage(notificationsQuery.error)}
              </Text>
            </CardContent>
          </Card>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<Bell size={32} color={colors.mutedForeground} />}
            title="Sin notificaciones"
            subtitle={unreadOnly ? "No tenés notificaciones sin leer" : "Todo tranquilo por acá"}
          />
        ) : (
          notifications.map((notification) => (
            <Card
              key={notification.id}
              style={[styles.notifCard, !notification.isRead && styles.notifCardUnread]}
            >
              <CardContent>
                <View style={styles.notifHeader}>
                  <Text style={styles.notifTitle}>{notification.title}</Text>
                  {!notification.isRead ? (
                    <Badge bgColor={colors.primary} textColor={colors.white}>
                      Nueva
                    </Badge>
                  ) : null}
                </View>
                <Text style={styles.notifMessage}>{notification.message}</Text>
                <Text style={styles.notifDate}>
                  {new Date(notification.createdAt).toLocaleString("es-AR")}
                </Text>
              </CardContent>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    headerOuter: { paddingBottom: spacing.sm },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg },
    subtitle: { fontFamily: fontFamily.sans, fontSize: 13, color: c.mutedForeground, marginTop: 2 },
    tabBar: { marginHorizontal: spacing.lg, marginBottom: spacing.sm },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 24, gap: spacing.sm },
    loadingList: { gap: spacing.md },
    errorCard: { backgroundColor: c.errorBg },
    errorText: { fontFamily: fontFamily.sans, color: c.errorText, fontSize: 14 },
    resolveSection: { gap: spacing.sm, marginBottom: spacing.sm },
    sectionLabel: { fontFamily: fontFamilyForWeight(700), fontSize: 12, color: c.mutedForeground, textTransform: "uppercase" },
    transferCard: { borderLeftWidth: 3, borderLeftColor: c.primary },
    transferActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm, justifyContent: "flex-end" },
    notifCard: { marginBottom: 0 },
    notifCardUnread: { borderLeftWidth: 3, borderLeftColor: c.primary },
    notifHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
    notifTitle: { fontFamily: fontFamily.sans, fontWeight: "700", color: c.text, fontSize: 14, flex: 1, marginRight: spacing.sm },
    notifMessage: { fontFamily: fontFamily.sans, color: c.text, fontSize: 13, opacity: 0.8, marginBottom: spacing.xs },
    notifDate: { fontFamily: fontFamily.sans, color: c.mutedForeground, fontSize: 11 },
  });
}
