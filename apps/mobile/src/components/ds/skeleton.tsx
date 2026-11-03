import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, withTiming } from "react-native-reanimated";
import { useThemeColors } from "@/hooks/use-theme";
import type { ThemeColors } from "@/theme";
import { radii as radius } from "@habita/design-tokens";
import { reducedMotionDuration } from "./motion";
import { SKELETON_DELAY_MS, SKELETON_FADE_IN_MS, shouldDisplaySkeleton } from "./skeleton-logic";

export interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  style?: ViewStyle;
}

/** §6.20 Skeleton block — static, no shimmer. Hidden if loading resolves before 300ms. */
export function Skeleton({ width, height = 16, style }: SkeletonProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return <View style={[styles.block, { width, height }, style]} />;
}

export interface SkeletonGateProps {
  loading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
}

/** Gates skeleton vs. content per §6.20: delayed appearance, fade-in on content. */
export function SkeletonGate({ loading, skeleton, children }: SkeletonGateProps): React.JSX.Element {
  const [visible, setVisible] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (loading) {
      startedAtRef.current = Date.now();
      const timer = setTimeout(() => {
        const elapsed = Date.now() - (startedAtRef.current ?? Date.now());
        if (shouldDisplaySkeleton(elapsed)) setVisible(true);
      }, SKELETON_DELAY_MS);
      return () => clearTimeout(timer);
    }
    const resetTimer = setTimeout(() => setVisible(false), 0);
    return () => clearTimeout(resetTimer);
  }, [loading]);

  const contentOpacity = useAnimatedStyle(() => ({
    opacity: withTiming(loading ? 0 : 1, {
      duration: reducedMotion ? reducedMotionDuration : SKELETON_FADE_IN_MS,
    }),
  }));

  if (loading && visible) return <>{skeleton}</>;
  if (loading) return <></>;

  return <Animated.View style={contentOpacity}>{children}</Animated.View>;
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    block: {
      backgroundColor: c.sand,
      borderRadius: radius.rowIcon - 4,
    },
  });
}
