import { useMemo } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, withTiming } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/hooks/use-theme";
import type { ThemeColors } from "@/theme";
import { motionDuration, reducedMotionDuration } from "./motion";

export interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel: string;
}

/** §6.4 Toggle — 44x26 track, 20px knob. Applies instantly (pattern A). */
export function Toggle({ value, onValueChange, disabled = false, accessibilityLabel }: ToggleProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const reducedMotion = useReducedMotion();

  const knobStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: withTiming(value ? 18 : 2, {
          duration: reducedMotion ? reducedMotionDuration : motionDuration.quick,
        }),
      },
    ],
  }));

  const trackColor = disabled ? colors.line : value ? colors.monte : colors.sand;

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={10}
      onPress={() => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onValueChange(!value);
      }}
      style={[styles.track, { backgroundColor: trackColor }]}
    >
      <Animated.View style={[styles.knob, knobStyle]} />
    </Pressable>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    track: {
      width: 44,
      height: 26,
      borderRadius: 13,
      justifyContent: "center",
    },
    knob: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: c.surface,
    },
  });
}
