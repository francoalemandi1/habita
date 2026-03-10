import { forwardRef, useMemo } from "react";
import { Platform, Share, StyleSheet, Text, View } from "react-native";
import ViewShot from "react-native-view-shot";
import { useThemeColors } from "@/hooks/use-theme";
import {
  cyclingColors,
  cyclingTextColors,
  fontFamily,
  palette,
  radius,
  spacing,
} from "@/theme";
import { computeMemberPoints, computeHouseholdTotal, getShareMessage, getTierLabel } from "./points-utils";

import type { ThemeColors } from "@/theme";

interface MemberStat {
  id: string;
  name: string;
  weeklyTasks: number;
  weeklyPoints: number;
}

interface ShareableWeekCardProps {
  memberStats: MemberStat[];
  householdStreak: number;
  isSolo: boolean;
  currentMemberId: string | null;
}

function getMemberInitial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase();
}

function getMemberColor(index: number): { bg: string; text: string } {
  const bg = cyclingColors[index % cyclingColors.length] ?? palette.primary;
  const text = cyclingTextColors[index % cyclingTextColors.length] ?? palette.white;
  return { bg, text };
}

export const ShareableWeekCard = forwardRef<ViewShot, ShareableWeekCardProps>(
  function ShareableWeekCard({ memberStats, householdStreak, isSolo, currentMemberId }, ref) {
    const colors = useThemeColors();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const sorted = [...memberStats].sort((a, b) => a.name.localeCompare(b.name));

    const memberBreakdowns = sorted.map((m) => ({
      ...m,
      points: computeMemberPoints(m.weeklyPoints ?? m.weeklyTasks, m.weeklyTasks, householdStreak),
    }));

    const householdTotal = computeHouseholdTotal(memberBreakdowns.map((m) => m.points));
    const tier = getTierLabel(householdTotal);
    const message = getShareMessage(householdTotal, householdStreak);

    const streakText = isSolo
      ? `${householdStreak} semana${householdStreak === 1 ? "" : "s"} activo/a`
      : `${householdStreak} semana${householdStreak === 1 ? "" : "s"} seguidas`;

    return (
      <ViewShot
        ref={ref}
        options={{ format: "png", quality: 1 }}
        style={styles.offscreen}
      >
        <View style={styles.card}>
          {/* Title */}
          <Text style={styles.label}>
            {isSolo ? "Mi semana" : "Nuestra semana"}
          </Text>

          {/* Big number */}
          <Text style={[styles.bigNumber, { color: colors.primary }]}>
            {householdTotal}
          </Text>
          <Text style={styles.subtitle}>puntos</Text>

          {/* Tier */}
          <Text style={styles.tierLabel}>
            {tier.label} {tier.emoji}
          </Text>

          {/* Member avatars */}
          {sorted.length > 1 ? (
            <View style={styles.avatarRow}>
              {memberBreakdowns.map((member, index) => {
                const isMe = member.id === currentMemberId;
                const color = getMemberColor(index);
                return (
                  <View key={member.id} style={styles.avatarItem}>
                    <View
                      style={[
                        styles.avatar,
                        { backgroundColor: color.bg },
                        isMe && { borderWidth: 2.5, borderColor: colors.primary },
                      ]}
                    >
                      <Text style={[styles.avatarInitial, { color: color.text }]}>
                        {getMemberInitial(member.name)}
                      </Text>
                    </View>
                    <Text style={[styles.avatarPoints, { color: colors.text }]}>
                      {member.points.total}
                    </Text>
                    <Text style={styles.avatarName} numberOfLines={1}>
                      {member.name.split(" ")[0]}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          {/* Streak */}
          {householdStreak > 0 ? (
            <Text style={[styles.streak, { color: colors.primary }]}>
              🔥 {streakText}
            </Text>
          ) : null}

          {/* Fun message */}
          <Text style={styles.funMessage}>{message}</Text>

          {/* Branding */}
          <Text style={styles.branding}>via Habita</Text>
        </View>
      </ViewShot>
    );
  },
);

/** Capture the shareable card and open the share sheet. */
export async function shareWeekCard(viewShotRef: ViewShot | null): Promise<void> {
  if (!viewShotRef) return;

  try {
    const uri = await viewShotRef.capture?.();
    if (!uri) return;

    await Share.share(
      Platform.OS === "ios"
        ? { url: uri }
        : { message: uri, title: "Nuestra semana" },
    );
  } catch {
    // user cancelled or error
  }
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    offscreen: {
      position: "absolute",
      left: -9999,
      top: -9999,
    },
    card: {
      width: 340,
      backgroundColor: c.background,
      borderRadius: radius.xl,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xxl,
      alignItems: "center",
    },
    label: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      fontWeight: "600",
      color: c.mutedForeground,
      marginBottom: spacing.md,
    },
    bigNumber: {
      fontFamily: fontFamily.handwritten,
      fontSize: 56,
      fontWeight: "700",
    },
    subtitle: {
      fontFamily: fontFamily.sans,
      fontSize: 16,
      color: c.mutedForeground,
      marginTop: 2,
    },
    tierLabel: {
      fontFamily: fontFamily.handwritten,
      fontSize: 22,
      color: c.text,
      marginTop: spacing.sm,
    },
    avatarRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: spacing.xl,
      marginTop: spacing.xl,
      flexWrap: "wrap",
    },
    avatarItem: {
      alignItems: "center",
      gap: 4,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarInitial: {
      fontFamily: fontFamily.sans,
      fontSize: 20,
      fontWeight: "700",
    },
    avatarPoints: {
      fontFamily: fontFamily.sans,
      fontSize: 16,
      fontWeight: "700",
    },
    avatarName: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
      maxWidth: 72,
      textAlign: "center",
    },
    streak: {
      fontFamily: fontFamily.sans,
      fontSize: 15,
      fontWeight: "600",
      marginTop: spacing.xl,
    },
    funMessage: {
      fontFamily: fontFamily.handwritten,
      fontSize: 22,
      color: c.text,
      marginTop: spacing.lg,
      textAlign: "center",
    },
    branding: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      color: c.mutedForeground,
      marginTop: spacing.xl,
      opacity: 0.5,
    },
  });
}
