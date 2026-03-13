import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import { Animated, Easing, StyleSheet, Text, View, ViewStyle } from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamily, spacing } from "@/theme";
import { Button } from "./button";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  /** Numbered hint steps shown below the subtitle */
  steps?: Array<{ label: string }>;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
  /** When true, the icon pulses continuously (use for loading states) */
  pulsing?: boolean;
}

export function EmptyState({
  icon,
  title,
  subtitle,
  steps,
  actionLabel,
  onAction,
  style,
  pulsing = false,
}: EmptyStateProps) {
  const colors = useThemeColors();

  // Spring entrance for the whole container
  const scale = useMemo(() => new Animated.Value(0.8), []);
  const opacity = useMemo(() => new Animated.Value(0), []);
  const translateY = useMemo(() => new Animated.Value(16), []);

  // Pulse loop for the icon
  const pulseScale = useMemo(() => new Animated.Value(1), []);
  const pulseOpacity = useMemo(() => new Animated.Value(0.45), []);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale, translateY]);

  useEffect(() => {
    if (!pulsing) {
      pulseScale.setValue(1);
      pulseOpacity.setValue(0.45);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseScale, {
            toValue: 1.18,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.85,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseScale, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.45,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulsing, pulseOpacity, pulseScale]);

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        {
          opacity,
          transform: [{ scale }, { translateY }],
        },
      ]}
    >
      {icon ? (
        <Animated.View
          style={[
            styles.iconWrapper,
            {
              opacity: pulseOpacity,
              transform: [{ scale: pulseScale }],
            },
          ]}
        >
          {icon}
        </Animated.View>
      ) : null}
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text> : null}
      {steps && steps.length > 0 ? (
        <View style={styles.stepsContainer}>
          {steps.map((step, index) => (
            <View key={step.label} style={styles.stepRow}>
              <View style={[styles.stepNumber, { backgroundColor: `${colors.primary}15` }]}>
                <Text style={[styles.stepNumberText, { color: colors.primary }]}>{index + 1}</Text>
              </View>
              <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>{step.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {actionLabel && onAction ? (
        <Button variant="outline" onPress={onAction} style={styles.button}>
          {actionLabel}
        </Button>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xxl,
    gap: spacing.sm,
  },
  iconWrapper: {
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fontFamily.sans,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  subtitle: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  stepsContainer: {
    marginTop: spacing.md,
    gap: spacing.sm,
    alignSelf: "stretch",
    paddingHorizontal: spacing.md,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    fontWeight: "700",
  },
  stepLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    flex: 1,
  },
  button: {
    marginTop: spacing.md,
  },
});
