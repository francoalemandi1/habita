import { useMemo } from "react";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight } from "@/theme";
import type { ThemeColors } from "@/theme";
import { motionDuration } from "./motion";
import { resolveSwipeAction, SWIPE_WIDTHS } from "./swipe-row-logic";

export interface SwipeRowProps {
  children: ReactNode;
  onDone: () => void;
  onPass: () => void;
  onDelete: () => void;
}

/** §6.12 SwipeRow — right "Hecha" (monte, 96), left "Pasar" (sand) + "Borrar" (ladrillo, 76 each). */
export function SwipeRow({ children, onDone, onPass, onDelete }: SwipeRowProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const translateX = useSharedValue(0);

  function commit(action: ReturnType<typeof resolveSwipeAction>): void {
    if (action === "done") onDone();
    else if (action === "pass") onPass();
    else if (action === "delete") onDelete();
  }

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      const action = resolveSwipeAction(event.translationX);
      translateX.value = withTiming(0, { duration: motionDuration.base });
      if (action !== "none") runOnJS(commit)(action);
    });

  const rowAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));

  return (
    <View style={styles.container}>
      <View style={[styles.actionsLayer, styles.rightActions]}>
        <View style={[styles.action, { width: SWIPE_WIDTHS.done, backgroundColor: colors.monte }]}>
          <Text style={styles.actionLabel}>Hecha</Text>
        </View>
      </View>
      <View style={[styles.actionsLayer, styles.leftActions]}>
        <View style={[styles.action, { width: SWIPE_WIDTHS.pass, backgroundColor: colors.sand }]}>
          <Text style={[styles.actionLabel, { color: colors.ink }]}>Pasar</Text>
        </View>
        <View style={[styles.action, { width: SWIPE_WIDTHS.delete, backgroundColor: colors.ladrillo }]}>
          <Text style={styles.actionLabel}>Borrar</Text>
        </View>
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.content, rowAnimatedStyle]}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      position: "relative",
    },
    content: {
      backgroundColor: c.surface,
    },
    actionsLayer: {
      ...StyleSheet.absoluteFillObject,
      flexDirection: "row",
      alignItems: "center",
    },
    rightActions: {
      justifyContent: "flex-start",
    },
    leftActions: {
      justifyContent: "flex-end",
    },
    action: {
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    actionLabel: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 14,
      fontWeight: "600",
      color: c.paper,
    },
  });
}
