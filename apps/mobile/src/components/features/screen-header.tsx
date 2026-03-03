import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Bell } from "lucide-react-native";
import { colors, fontFamily, spacing } from "@/theme";
import { useMobileAuth } from "@/providers/mobile-auth-provider";

interface ScreenHeaderProps {
  notificationCount?: number;
}

export function ScreenHeader({ notificationCount = 0 }: ScreenHeaderProps) {
  const { me, activeHouseholdId } = useMobileAuth();
  const activeHousehold = me?.households.find((h) => h.id === activeHouseholdId);
  const initials = me?.name
    ? me.name.trim().split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("")
    : "?";

  return (
    <View style={styles.header}>
      <Pressable onPress={() => router.push("/(app)/dashboard")} hitSlop={8}>
        <Image
          source={require("../../../assets/logo-32.png")}
          style={styles.logoIcon}
        />
      </Pressable>
      <View style={styles.actions}>
        <Pressable
          onPress={() => router.push("/(app)/notifications")}
          style={styles.iconButton}
          hitSlop={8}
        >
          <Bell size={20} color={colors.text} strokeWidth={1.8} />
          {notificationCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {notificationCount > 9 ? "9+" : notificationCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable
          onPress={() => router.push("/(app)/settings")}
          style={styles.avatarButton}
          hitSlop={8}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${colors.primary}20`,
    borderWidth: 1.5,
    borderColor: `${colors.primary}50`,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
    lineHeight: 13,
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: colors.destructive,
    borderRadius: 999,
    minWidth: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#ffffff",
  },
});
