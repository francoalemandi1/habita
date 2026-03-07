import { useMemo } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useThemeColors } from "@/hooks/use-theme";
import { usePressAnimation } from "@/hooks/use-press-animation";
import { useFadeIn } from "@/hooks/use-fade-in";
import { SkeletonCard } from "@/components/ui/skeleton";
import { fontFamily, radius, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";
import type { DailyHighlightState, HighlightType } from "./types";

interface DailyHighlightProps {
  highlight: DailyHighlightState | null;
  loading?: boolean;
}

function getHighlightConfig(type: HighlightType, c: ThemeColors) {
  switch (type) {
    case "deal":
      return {
        emoji: "🏷️",
        bg: c.infoBg,
        border: `${c.infoText}20`,
        accent: c.infoText,
        emojiBg: `${c.infoText}18`,
      };
    case "event":
      return {
        emoji: "🎭",
        bg: `${c.lavender}15`,
        border: `${c.lavender}30`,
        accent: c.purpleDark,
        emojiBg: `${c.lavender}25`,
      };
    case "recipe":
      return {
        emoji: "👨‍🍳",
        bg: `${c.orange}10`,
        border: `${c.orange}25`,
        accent: c.orange,
        emojiBg: `${c.orange}15`,
      };
  }
}

export function DailyHighlight({ highlight, loading }: DailyHighlightProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { scale, onPressIn, onPressOut } = usePressAnimation(0.98);
  const fadeOpacity = useFadeIn(400, 100);

  if (loading) {
    return <SkeletonCard lines={2} />;
  }

  if (!highlight) return null;

  const config = getHighlightConfig(highlight.type, colors);

  return (
    <Animated.View style={{ opacity: fadeOpacity, transform: [{ scale }] }}>
      <Pressable
        onPress={() => {
          if (highlight.ctaParams) {
            router.push({
              pathname: highlight.ctaRoute as never,
              params: highlight.ctaParams,
            });
          } else {
            router.push(highlight.ctaRoute as never);
          }
        }}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: config.bg, borderColor: config.border },
          ]}
        >
          {/* Emoji hero */}
          <View style={[styles.emojiCircle, { backgroundColor: config.emojiBg }]}>
            <Text style={styles.emoji}>{config.emoji}</Text>
          </View>

          {/* Category label */}
          <Text style={[styles.categoryLabel, { color: config.accent }]}>
            {highlight.categoryLabel}
          </Text>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {highlight.title}
          </Text>

          {/* Subtitle */}
          <Text style={styles.subtitle} numberOfLines={2}>
            {highlight.subtitle}
          </Text>

          {/* CTA pill button */}
          <View style={[styles.ctaPill, { backgroundColor: config.accent }]}>
            <Text style={styles.ctaPillText}>
              {highlight.ctaLabel}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      borderRadius: radius.xl,
      borderWidth: 1,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
    },
    emojiCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.md,
    },
    emoji: {
      fontSize: 24,
    },
    categoryLabel: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 4,
    },
    title: {
      fontFamily: fontFamily.sans,
      fontSize: 17,
      fontWeight: "700",
      lineHeight: 22,
    },
    subtitle: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
      color: c.mutedForeground,
      lineHeight: 18,
      marginTop: 3,
    },
    ctaPill: {
      alignSelf: "flex-start",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      marginTop: spacing.md,
    },
    ctaPillText: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
      fontWeight: "600",
      color: "#ffffff",
    },
  });
}
