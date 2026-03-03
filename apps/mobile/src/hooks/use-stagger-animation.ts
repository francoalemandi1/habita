import { useEffect, useRef } from "react";
import { Animated } from "react-native";

/**
 * Returns an Animated.Value opacity for a staggered list item.
 * Each item fades in after index * staggerMs delay.
 */
export function useStaggerItem(index: number, staggerMs = 60) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 250,
      delay: index * staggerMs,
      useNativeDriver: true,
    }).start();
  }, [opacity, index, staggerMs]);

  return opacity;
}
