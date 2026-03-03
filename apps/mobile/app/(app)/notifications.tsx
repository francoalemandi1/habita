import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, Bell, CheckCheck } from "lucide-react-native";
import { useMarkAllNotificationsRead, useNotifications } from "@/hooks/use-notifications";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { TabBar } from "@/components/ui/tab-bar";
import { colors, fontFamily, spacing, typography } from "@/theme";

export default function NotificationsScreen() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const notificationsQuery = useNotifications(unreadOnly);
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = notificationsQuery.data?.notifications ?? [];
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.headerOuter}>
        <View style={styles.backRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
          </Pressable>
          <Text style={styles.backTitle}>Notificaciones</Text>
          <View style={styles.backBtn} />
        </View>
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
                    <Badge bgColor={colors.primary} textColor="#ffffff">
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerOuter: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  backRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  backTitle: { ...typography.cardTitle },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  subtitle: { fontFamily: fontFamily.sans, fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  tabBar: { marginHorizontal: spacing.lg, marginBottom: spacing.sm },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 24, gap: spacing.sm },
  loadingList: { gap: spacing.md },
  errorCard: { backgroundColor: colors.errorBg },
  errorText: { fontFamily: fontFamily.sans, color: colors.errorText, fontSize: 14 },
  notifCard: { marginBottom: 0 },
  notifCardUnread: { borderLeftWidth: 3, borderLeftColor: colors.primary },
  notifHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  notifTitle: { fontFamily: fontFamily.sans, fontWeight: "700", color: colors.text, fontSize: 14, flex: 1, marginRight: spacing.sm },
  notifMessage: { fontFamily: fontFamily.sans, color: colors.text, fontSize: 13, opacity: 0.8, marginBottom: spacing.xs },
  notifDate: { fontFamily: fontFamily.sans, color: colors.mutedForeground, fontSize: 11 },
});
