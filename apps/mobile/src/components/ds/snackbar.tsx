import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector, Pressable } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import type { ThemeColors } from "@/theme";
import { radii as radius } from "@habita/design-tokens";
import { motionDuration, reducedMotionDuration } from "./motion";
import { getSnackbarDuration, resolveSnackbarQueue } from "./snackbar-logic";
import type { SnackbarRequest, SnackbarTone } from "./snackbar-logic";

export type { SnackbarRequest, SnackbarTone };

export interface SnackbarOptions {
  text: string;
  tone?: SnackbarTone;
  actionLabel?: string;
  onAction?: () => void;
}

interface SnackbarContextValue {
  show: (options: SnackbarOptions) => void;
}

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

function getActionColor(c: ThemeColors, tone: SnackbarTone): string {
  if (tone === "error") return "#F2A893";
  if (tone === "navigation") return "#C9D8CC";
  return c.manteca;
}

let requestIdCounter = 0;

/** §6.13 Snackbar — floats 16px above the tab bar, swipe down dismisses, one at a time. */
export function SnackbarProvider({ children, bottomOffset = 16 }: { children: ReactNode; bottomOffset?: number }): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const reducedMotion = useReducedMotion();
  const [request, setRequest] = useState<SnackbarRequest | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const translateY = useSharedValue(80);
  const opacity = useSharedValue(0);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const duration = reducedMotion ? reducedMotionDuration : motionDuration.base;
    translateY.value = withTiming(80, { duration });
    opacity.value = withTiming(0, { duration }, () => {
      runOnJS(setRequest)(null);
    });
  }, [reducedMotion, translateY, opacity]);

  const show = useCallback(
    (options: SnackbarOptions) => {
      const incoming: SnackbarRequest = { id: String(++requestIdCounter), ...options };
      setRequest((current) => resolveSnackbarQueue(current, incoming));
      if (timerRef.current) clearTimeout(timerRef.current);

      const duration = reducedMotion ? reducedMotionDuration : motionDuration.base;
      translateY.value = withTiming(0, { duration });
      opacity.value = withTiming(1, { duration });

      timerRef.current = setTimeout(dismiss, getSnackbarDuration(options.tone));
    },
    [reducedMotion, translateY, opacity, dismiss],
  );

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationY > 24 || event.velocityY > 400) {
        runOnJS(dismiss)();
      } else {
        translateY.value = withTiming(0, { duration: motionDuration.quick });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const value = useMemo<SnackbarContextValue>(() => ({ show }), [show]);
  const tone = request?.tone ?? "default";

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      {request ? (
        <View style={[styles.container, { bottom: bottomOffset }]} pointerEvents="box-none">
          <GestureDetector gesture={pan}>
            <Animated.View style={[styles.snackbar, animatedStyle]}>
              <Text style={styles.text} numberOfLines={3}>
                {request.text}
              </Text>
              {request.actionLabel ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={request.actionLabel}
                  hitSlop={8}
                  onPress={() => {
                    request.onAction?.();
                    dismiss();
                  }}
                >
                  <Text style={[styles.actionText, { color: getActionColor(colors, tone) }]}>{request.actionLabel}</Text>
                </Pressable>
              ) : null}
            </Animated.View>
          </GestureDetector>
        </View>
      ) : null}
    </SnackbarContext.Provider>
  );
}

export function useSnackbar(): SnackbarContextValue {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error("useSnackbar must be used within <SnackbarProvider>");
  return ctx;
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      position: "absolute",
      left: spacing.lg,
      right: spacing.lg,
    },
    snackbar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      backgroundColor: c.ink,
      borderRadius: radius.tile,
      paddingVertical: 12,
      paddingLeft: 16,
      paddingRight: 12,
    },
    text: {
      flex: 1,
      fontFamily: fontFamilyForWeight(400),
      fontSize: 14,
      color: c.paper,
    },
    actionText: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 14,
      fontWeight: "600",
    },
  });
}
