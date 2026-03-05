import type { ReactNode } from "react";
import { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamily, radius } from "@/theme";

import type { ThemeColors } from "@/theme";

interface FeatureHighlightProps {
  active: boolean;
  children: ReactNode;
  label?: string;
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    badge: {
      position: "absolute",
      top: -8,
      right: -4,
      backgroundColor: c.primary,
      borderRadius: radius.full,
      paddingHorizontal: 8,
      paddingVertical: 2,
      zIndex: 10,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 3,
    },
    badgeText: {
      fontFamily: fontFamily.sans,
      fontSize: 10,
      fontWeight: "700",
      color: "#ffffff",
    },
  });
}

export function FeatureHighlight({ active, children, label = "Nuevo" }: FeatureHighlightProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, pulseAnim]);

  if (!active) return <>{children}</>;

  const shadowOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.35],
  });

  const shadowRadius = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 12],
  });

  return (
    <View style={staticStyles.wrapper}>
      <Animated.View
        style={[
          staticStyles.pulseWrap,
          {
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity,
            shadowRadius,
            elevation: 4,
          },
        ]}
      >
        {children}
      </Animated.View>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{label}</Text>
      </View>
    </View>
  );
}

const staticStyles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  pulseWrap: {
    borderRadius: 16,
  },
});
