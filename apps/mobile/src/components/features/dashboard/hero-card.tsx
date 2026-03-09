import { useMemo } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useThemeColors } from "@/hooks/use-theme";
import { usePressAnimation } from "@/hooks/use-press-animation";
import { useFadeIn } from "@/hooks/use-fade-in";
import { Skeleton } from "@/components/ui/skeleton";
import { fontFamily, radius, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";
import type { HeroPriority, HeroState } from "./types";

interface HeroCardProps {
  state: HeroState;
  loading?: boolean;
}

function getColorScheme(priority: HeroPriority, c: ThemeColors) {
  if (priority === "transfers") {
    return { bg: c.warningBg, accent: c.warningText, btnBg: c.warningText, btnText: "#ffffff" };
  }
  return { bg: c.primaryLight, accent: c.primary, btnBg: c.primary, btnText: "#ffffff" };
}

export function HeroCard({ state, loading }: HeroCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { scale, onPressIn, onPressOut } = usePressAnimation(0.98);
  const fadeOpacity = useFadeIn(400);

  if (loading) {
    return (
      <View style={styles.skeletonWrap}>
        <Skeleton width="60%" height={28} borderRadius={radius.md} />
        <Skeleton width="80%" height={16} style={{ marginTop: 10 }} />
        <Skeleton width="50%" height={40} borderRadius={radius.full} style={{ marginTop: 16 }} />
      </View>
    );
  }

  const scheme = getColorScheme(state.priority, colors);
  const showButton = state.priority !== "all-clear";

  return (
    <Animated.View style={{ opacity: fadeOpacity, transform: [{ scale }] }}>
      <Pressable
        onPress={() => router.push(state.ctaRoute as never)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <View style={[styles.card, { backgroundColor: scheme.bg }]}>
          {/* Headline */}
          <Text style={[styles.headline, { color: scheme.accent }]}>
            {state.headline}
          </Text>

          {/* Description */}
          <Text style={[styles.label, { color: colors.text }]}>
            {state.label}
          </Text>

          {/* CTA */}
          {showButton ? (
            <View
              style={[
                styles.ctaButton,
                { backgroundColor: scheme.btnBg },
              ]}
            >
              <Text style={[styles.ctaButtonText, { color: scheme.btnText }]}>
                {state.ctaLabel}
              </Text>
            </View>
          ) : (
            <Text style={[styles.ctaLink, { color: scheme.accent }]}>
              {state.ctaLabel}
            </Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      borderRadius: radius.xl,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
    },
    headline: {
      fontFamily: fontFamily.handwritten,
      fontSize: 24,
    },
    label: {
      fontFamily: fontFamily.sans,
      fontSize: 15,
      fontWeight: "500",
      marginTop: 4,
    },
    ctaButton: {
      alignSelf: "flex-start",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.full,
      marginTop: spacing.lg,
    },
    ctaButtonText: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      fontWeight: "600",
    },
    ctaLink: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      fontWeight: "600",
      marginTop: spacing.md,
    },
    skeletonWrap: {
      borderRadius: radius.xl,
      backgroundColor: c.muted,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xl,
      minHeight: 130,
    },
  });
}
