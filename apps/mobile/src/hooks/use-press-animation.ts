import { useMemo } from "react";
import { Animated } from "react-native";

/**
 * Returns an Animated.Value scale + handler pair for press feedback.
 * Use with Animated.View transform: [{ scale }]
 */
export function usePressAnimation(toValue = 0.97) {
  const scale = useMemo(() => new Animated.Value(1), []);

  const onPressIn = () => {
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 30 }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
  };

  return { scale, onPressIn, onPressOut };
}
