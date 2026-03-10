import { useMemo } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Share2 } from "lucide-react-native";
import { useFadeIn } from "@/hooks/use-fade-in";
import { useThemeColors } from "@/hooks/use-theme";
import {
  cyclingColors,
  cyclingTextColors,
  fontFamily,
  palette,
  radius,
  spacing,
} from "@/theme";
import { computeMemberPoints, computeHouseholdTotal, getTierLabel, getNextTier } from "./points-utils";

import type { ThemeColors } from "@/theme";
import type { TierColorKey } from "./points-utils";

interface MemberStat {
  id: string;
  name: string;
  weeklyTasks: number;
  weeklyPoints: number;
}

interface HouseholdWeekCardProps {
  memberStats: MemberStat[];
  householdStreak: number;
  isSolo: boolean;
  currentMemberId: string | null;
  onShare: () => void;
}

function getMemberInitial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase();
}

function getMemberColor(index: number): { bg: string; text: string } {
  const bg = cyclingColors[index % cyclingColors.length] ?? palette.primary;
  const text = cyclingTextColors[index % cyclingTextColors.length] ?? palette.white;
  return { bg, text };
}

function getTierBadgeColors(colorKey: TierColorKey, c: ThemeColors) {
  switch (colorKey) {
    case "gold":
      return { bg: c.warningBg, text: c.warningText };
    case "fire":
      return { bg: c.warningBg, text: c.warningText };
    case "primary":
      return { bg: c.primaryLight, text: c.primary };
    case "info":
      return { bg: c.infoBg, text: c.infoText };
    case "success":
      return { bg: c.successBg, text: c.successText };
    default:
      return { bg: c.muted, text: c.mutedForeground };
  }
}

export function HouseholdWeekCard({
  memberStats,
  householdStreak,
  isSolo,
  currentMemberId,
  onShare,
}: HouseholdWeekCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const fadeOpacity = useFadeIn(400, 200);

  // Compute points per member
  const memberBreakdowns = useMemo(
    () =>
      memberStats.map((m, originalIndex) => ({
        ...m,
        originalIndex,
        points: computeMemberPoints(m.weeklyPoints ?? m.weeklyTasks, m.weeklyTasks, householdStreak),
      })),
    [memberStats, householdStreak],
  );

  // Sort by points descending (ranking)
  const ranked = useMemo(
    () => [...memberBreakdowns].sort((a, b) => b.points.total - a.points.total),
    [memberBreakdowns],
  );

  const householdTotal = useMemo(
    () => computeHouseholdTotal(memberBreakdowns.map((m) => m.points)),
    [memberBreakdowns],
  );

  const tier = getTierLabel(householdTotal);
  const tierColors = getTierBadgeColors(tier.colorKey, colors);
  const nextTier = getNextTier(householdTotal);

  if (memberStats.length === 0) return null;

  const streakText = isSolo
    ? `${householdStreak} semana${householdStreak === 1 ? "" : "s"} activo/a`
    : `${householdStreak} semana${householdStreak === 1 ? "" : "s"} seguidas`;

  // Progress bar towards next tier (0-1)
  const progressFraction = nextTier
    ? Math.min(householdTotal / nextTier.threshold, 1)
    : 1;

  return (
    <Animated.View style={{ opacity: fadeOpacity }}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerLabel}>Esta semana</Text>
          <Pressable
            onPress={onShare}
            hitSlop={12}
            style={({ pressed }) => pressed && styles.sharePressed}
          >
            <Share2 size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* Big number */}
        <Text style={[styles.bigNumber, { color: colors.primary }]}>
          {householdTotal}
        </Text>
        <Text style={styles.pointsLabel}>puntos</Text>

        {/* Tier pill badge */}
        <View style={[styles.tierBadge, { backgroundColor: tierColors.bg }]}>
          <Text style={[styles.tierBadgeText, { color: tierColors.text }]}>
            {tier.emoji} {tier.label}
          </Text>
        </View>

        {/* Progress bar to next tier */}
        {nextTier ? (
          <View style={styles.progressSection}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: tierColors.text,
                    width: `${Math.max(progressFraction * 100, 4)}%` as never,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressLabel}>
              {nextTier.threshold - householdTotal} pts → {nextTier.emoji} {nextTier.label}
            </Text>
          </View>
        ) : null}

        {/* Ranked member avatars */}
        {ranked.length > 1 ? (
          <View style={styles.avatarRow}>
            {ranked.map((member, rankIndex) => {
              const isMe = member.id === currentMemberId;
              const isLeader = rankIndex === 0 && member.points.total > 0;
              const color = getMemberColor(member.originalIndex);
              return (
                <View key={member.id} style={styles.avatarItem}>
                  {/* Leader crown */}
                  {isLeader ? (
                    <Text style={styles.leaderCrown}>👑</Text>
                  ) : (
                    <View style={styles.leaderCrownPlaceholder} />
                  )}
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: color.bg },
                      isMe && { borderWidth: 2.5, borderColor: colors.primary },
                      isLeader && styles.avatarLeader,
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

        {/* Streak pill */}
        {householdStreak > 0 ? (
          <View style={[styles.streakPill, { backgroundColor: `${colors.primary}12` }]}>
            <Text style={[styles.streakText, { color: colors.primary }]}>
              🔥 {streakText}
            </Text>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.lg,
      alignItems: "center",
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
      marginBottom: spacing.md,
    },
    headerLabel: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      fontWeight: "600",
      color: c.mutedForeground,
    },
    sharePressed: {
      opacity: 0.5,
    },
    bigNumber: {
      fontFamily: fontFamily.handwritten,
      fontSize: 40,
      fontWeight: "700",
      lineHeight: 44,
    },
    pointsLabel: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      color: c.mutedForeground,
      marginTop: 2,
    },
    // Tier badge
    tierBadge: {
      marginTop: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.full,
    },
    tierBadgeText: {
      fontFamily: fontFamily.handwritten,
      fontSize: 16,
      fontWeight: "600",
    },
    // Progress bar
    progressSection: {
      width: "100%",
      marginTop: spacing.sm,
      alignItems: "center",
      gap: 2,
    },
    progressTrack: {
      width: "60%",
      height: 4,
      backgroundColor: c.muted,
      borderRadius: 2,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 2,
    },
    progressLabel: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      color: c.mutedForeground,
    },
    // Avatars
    avatarRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: spacing.lg,
      marginTop: spacing.lg,
      flexWrap: "wrap",
    },
    avatarItem: {
      alignItems: "center",
      gap: 3,
    },
    leaderCrown: {
      fontSize: 14,
      marginBottom: 2,
    },
    leaderCrownPlaceholder: {
      height: 18,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarLeader: {
      width: 44,
      height: 44,
      borderRadius: 22,
    },
    avatarInitial: {
      fontFamily: fontFamily.sans,
      fontSize: 16,
      fontWeight: "700",
    },
    avatarPoints: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      fontWeight: "700",
    },
    avatarName: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      color: c.mutedForeground,
      maxWidth: 64,
      textAlign: "center",
    },
    // Streak
    streakPill: {
      marginTop: spacing.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 1,
      borderRadius: radius.full,
    },
    streakText: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      fontWeight: "600",
    },
  });
}
