import { Easing } from "react-native-reanimated";
import { motion } from "@habita/design-tokens";

/** §8.1 durations, re-exported for direct use in ds/ components. */
export const motionDuration = motion.duration;

/** §8.2 easing curves, converted to reanimated bezier easings. */
export const motionEasing = {
  enter: Easing.bezier(...motion.easing.enter),
  exit: Easing.bezier(...motion.easing.exit),
  move: Easing.bezier(...motion.easing.move),
};

/** §8.2 sheet spring config (damping 28 / stiffness 300). */
export const sheetSpringConfig = motion.sheetSpring;

/** §8.3 reduced-motion fallback: everything fades at 120ms. */
export const reducedMotionDuration = 120;
