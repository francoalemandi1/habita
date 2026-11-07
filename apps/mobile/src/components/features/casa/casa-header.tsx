import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Bell, ChevronDown } from "lucide-react-native";
import { Avatar } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import type { ThemeColors } from "@/theme";

export interface CasaHeaderProps {
  householdName: string;
  memberName: string;
  hasUnreadNotifications: boolean;
}

/** Casa header (§5.3) — logo + household name + chevron, bell with a dot, own avatar. */
export function CasaHeader({ householdName, memberName, hasUnreadNotifications }: CasaHeaderProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Cambiar de casa, actual: ${householdName}`}
        hitSlop={8}
        onPress={() => router.push("/(app)/perfil")}
        style={styles.householdButton}
      >
        <View style={styles.logoDot} />
        <Text style={styles.householdName} numberOfLines={1}>{householdName}</Text>
        <ChevronDown size={16} strokeWidth={1.75} color={colors.ink2} />
      </Pressable>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Avisos"
          hitSlop={8}
          onPress={() => router.push("/(app)/avisos")}
          style={styles.bellButton}
        >
          <Bell size={20} strokeWidth={1.75} color={colors.ink} />
          {hasUnreadNotifications ? <View style={styles.unreadDot} /> : null}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Perfil"
          hitSlop={8}
          onPress={() => router.push("/(app)/perfil")}
        >
          <Avatar name={memberName} size={28} isCurrentUser />
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.xl,
      height: 44,
    },
    householdButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      flex: 1,
      marginRight: spacing.md,
    },
    logoDot: {
      width: 26,
      height: 26,
      borderRadius: 8,
      backgroundColor: c.monte,
    },
    householdName: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 16,
      color: c.ink,
      flexShrink: 1,
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.lg,
    },
    bellButton: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    unreadDot: {
      position: "absolute",
      top: 4,
      right: 5,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.ladrillo,
    },
  });
}
