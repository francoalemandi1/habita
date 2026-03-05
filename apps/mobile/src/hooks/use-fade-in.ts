import { useEffect, useMemo } from "react";
import { Animated } from "react-native";

/**
 * Returns an Animated.Value opacity that fades in on mount.
 * Use with Animated.View style={{ opacity }}
 */
export function useFadeIn(duration = 300, delay = 0) {
  const opacity = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, [opacity, duration, delay]);

  return opacity;
}
