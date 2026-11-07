import { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/hooks/use-theme";
import type { ThemeColors } from "@/theme";
import { motionDuration, reducedMotionDuration } from "./motion";
import { getToggledState, isCheckboxInteractive } from "./checkbox-logic";
import type { CheckboxState } from "./checkbox-logic";

export interface CheckboxProps {
  state: CheckboxState;
  onToggle: (next: CheckboxState) => void;
  requiresVerification?: boolean;
  accessibilityLabel: string;
}

/** §6.2 / §8.3 Checkbox — 5 states, with the "done" choreography and a light haptic. */
export function Checkbox({ state, onToggle, requiresVerification = false, accessibilityLabel }: CheckboxProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const reducedMotion = useReducedMotion();

  const boxScale = useSharedValue(1);
  const checkScale = useSharedValue(state === "done" ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      checkScale.value = withTiming(state === "done" ? 1 : 0, { duration: reducedMotionDuration });
      return;
    }
    if (state === "done") {
      boxScale.value = withTiming(0.9, { duration: 0 });
      boxScale.value = withTiming(1, { duration: motionDuration.quick });
      checkScale.value = withDelay(60, withTiming(1, { duration: motionDuration.quick }));
    } else {
      checkScale.value = withTiming(0, { duration: motionDuration.quick });
    }
  }, [state, reducedMotion, boxScale, checkScale]);

  const boxAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: boxScale.value }] }));
  const checkAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: checkScale.value }] }));

  const interactive = isCheckboxInteractive(state);
  const boxStyle = getBoxStyle(styles, state);

  function handlePress(): void {
    if (!interactive) return;
    const next = getToggledState(state, requiresVerification);
    if (next === "done") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(next);
  }

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: state === "done", disabled: !interactive }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={11}
      disabled={!interactive}
      onPress={handlePress}
      style={styles.touchArea}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.box,
            boxStyle,
            pressed && interactive && styles.boxPressed,
            boxAnimatedStyle,
            pressed && interactive && { transform: [{ scale: 0.9 }] },
          ]}
        >
          {state === "done" ? (
            <Animated.View style={checkAnimatedStyle}>
              <View style={styles.checkStroke} />
            </Animated.View>
          ) : null}
          {state === "toVerify" ? <View style={styles.dash} /> : null}
        </Animated.View>
      )}
    </Pressable>
  );
}

function getBoxStyle(styles: ReturnType<typeof createStyles>, state: CheckboxState) {
  switch (state) {
    case "done":
      return styles.boxDone;
    case "toVerify":
      return styles.boxToVerify;
    case "transferred":
      return styles.boxTransferred;
    default:
      return styles.boxPending;
  }
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    touchArea: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    box: {
      width: 22,
      height: 22,
      borderRadius: 6,
      alignItems: "center",
      justifyContent: "center",
    },
    boxPending: {
      borderWidth: 1.5,
      borderColor: "#B9B3A6",
    },
    boxPressed: {
      borderWidth: 1.5,
      borderColor: c.monte,
      backgroundColor: c.monteSoft,
    },
    boxDone: {
      backgroundColor: c.monte,
    },
    boxToVerify: {
      borderWidth: 1.5,
      borderColor: c.monte,
      borderStyle: "dashed",
    },
    boxTransferred: {
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.paper,
    },
    checkStroke: {
      width: 6,
      height: 11,
      borderRightWidth: 2,
      borderBottomWidth: 2,
      borderColor: c.paper,
      transform: [{ rotate: "45deg" }, { translateY: -1 }],
    },
    dash: {
      width: 10,
      height: 2,
      borderRadius: 1,
      backgroundColor: c.monte,
    },
  });
}
