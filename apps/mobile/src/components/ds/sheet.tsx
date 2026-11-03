import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { Dimensions, Modal, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector, Pressable } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing, typography } from "@/theme";
import type { ThemeColors } from "@/theme";
import { radii as radius } from "@habita/design-tokens";
import { reducedMotionDuration, sheetSpringConfig } from "./motion";
import { shouldDismissSheet } from "./sheet-logic";

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  /** Header: Cancelar / title / optional trailing action. */
  title?: string;
  cancelLabel?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
}

const SCREEN_HEIGHT = Dimensions.get("window").height;

/** §6.14 Sheet — spring up, scrim ink 40%, drag past 30% height or velocity dismisses. */
export function Sheet({ visible, onClose, title, cancelLabel = "Cancelar", actionLabel, onAction, children }: SheetProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const reducedMotion = useReducedMotion();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const scrimOpacity = useSharedValue(0);
  const sheetHeight = useSharedValue(SCREEN_HEIGHT);

  useEffect(() => {
    if (visible) {
      translateY.value = reducedMotion
        ? withTiming(0, { duration: reducedMotionDuration })
        : withSpring(0, sheetSpringConfig);
      scrimOpacity.value = withTiming(1, { duration: reducedMotion ? reducedMotionDuration : 200 });
    } else {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: reducedMotion ? reducedMotionDuration : 220 });
      scrimOpacity.value = withTiming(0, { duration: reducedMotion ? reducedMotionDuration : 200 });
    }
  }, [visible, reducedMotion, translateY, scrimOpacity]);

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (shouldDismissSheet(event.translationY, sheetHeight.value, event.velocityY)) {
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, sheetSpringConfig);
      }
    });

  const sheetAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const scrimAnimatedStyle = useAnimatedStyle(() => ({ opacity: scrimOpacity.value }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.scrim, scrimAnimatedStyle]}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Cerrar" onPress={onClose} />
        </Animated.View>
        <Animated.View
          style={[styles.sheet, sheetAnimatedStyle]}
          onLayout={(e) => {
            sheetHeight.value = e.nativeEvent.layout.height;
          }}
        >
          <GestureDetector gesture={pan}>
            <View style={styles.handleArea}>
              <View style={styles.handle} />
            </View>
          </GestureDetector>
          {title || actionLabel ? (
            <View style={styles.header}>
              <Pressable accessibilityRole="button" accessibilityLabel={cancelLabel} onPress={onClose} hitSlop={8}>
                <Text style={styles.cancel}>{cancelLabel}</Text>
              </Pressable>
              {title ? <Text style={styles.title} numberOfLines={1}>{title}</Text> : <View style={styles.spacer} />}
              {actionLabel && onAction ? (
                <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction} hitSlop={8}>
                  <Text style={styles.action}>{actionLabel}</Text>
                </Pressable>
              ) : (
                <View style={styles.spacer} />
              )}
            </View>
          ) : null}
          <View style={styles.content}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: "flex-end",
    },
    scrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: c.scrim,
    },
    sheet: {
      backgroundColor: c.paper,
      borderTopLeftRadius: radius.sheet,
      borderTopRightRadius: radius.sheet,
      paddingBottom: 34,
      maxHeight: SCREEN_HEIGHT * 0.92,
    },
    handleArea: {
      paddingTop: 10,
      paddingBottom: spacing.sm,
      alignItems: "center",
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: "#CFC7B8",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.md,
    },
    cancel: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 15,
      color: c.ink2,
      minWidth: 60,
    },
    title: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: typography.t1.fontSize,
      color: c.ink,
      flex: 1,
      textAlign: "center",
    },
    action: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 15,
      color: c.monte,
      minWidth: 60,
      textAlign: "right",
    },
    spacer: {
      minWidth: 60,
    },
    content: {
      paddingHorizontal: spacing.xl,
    },
  });
}
