import { useState } from "react";
import { Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { useMarkAllNotificationsRead, useNotifications } from "@/hooks/use-notifications";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { semanticColors } from "@habita/design-tokens";

export default function NotificationsScreen() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const notificationsQuery = useNotifications(unreadOnly);
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = notificationsQuery.data?.notifications ?? [];
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff", padding: 20 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View>
          <Text style={{ fontSize: 20, fontWeight: "700" }}>Notificaciones</Text>
          <Text style={{ marginTop: 4, color: "#6b7280" }}>{unreadCount} sin leer</Text>
        </View>
        <Pressable
          onPress={() => markAllRead.mutate()}
          style={{ borderRadius: 8, backgroundColor: "#f3f4f6", paddingHorizontal: 10, paddingVertical: 8 }}
        >
          <Text style={{ fontWeight: "700" }}>Marcar todas</Text>
        </Pressable>
      </View>

      <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
        <Pressable
          onPress={() => setUnreadOnly(false)}
          style={{
            borderRadius: 999,
            borderWidth: 1,
            borderColor: !unreadOnly ? semanticColors.primary : "#d1d5db",
            backgroundColor: !unreadOnly ? "#eff6ff" : "#ffffff",
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}
        >
          <Text style={{ fontWeight: "700", fontSize: 12 }}>Todas</Text>
        </Pressable>
        <Pressable
          onPress={() => setUnreadOnly(true)}
          style={{
            borderRadius: 999,
            borderWidth: 1,
            borderColor: unreadOnly ? semanticColors.primary : "#d1d5db",
            backgroundColor: unreadOnly ? "#eff6ff" : "#ffffff",
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}
        >
          <Text style={{ fontWeight: "700", fontSize: 12 }}>Sin leer</Text>
        </Pressable>
      </View>

      {notificationsQuery.isLoading ? (
        <Text style={{ marginTop: 16, color: "#6b7280" }}>Cargando notificaciones...</Text>
      ) : null}

      {notificationsQuery.isError ? (
        <Text style={{ marginTop: 16, color: "#b91c1c" }}>
          {getMobileErrorMessage(notificationsQuery.error)}
        </Text>
      ) : null}

      <ScrollView style={{ marginTop: 12 }}>
        {notifications.map((notification) => (
          <View
            key={notification.id}
            style={{
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 12,
              padding: 12,
              marginBottom: 10,
              backgroundColor: notification.isRead ? "#ffffff" : "#f8fafc",
            }}
          >
            <Text style={{ fontWeight: "700" }}>{notification.title}</Text>
            <Text style={{ marginTop: 4, color: "#374151" }}>{notification.message}</Text>
            <Text style={{ marginTop: 6, color: "#9ca3af", fontSize: 12 }}>
              {new Date(notification.createdAt).toLocaleString("es-AR")}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
