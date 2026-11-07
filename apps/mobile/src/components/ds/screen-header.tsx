import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import type { ThemeColors } from "@/theme";

const SCROLL_CROSSFADE_RANGE = 40;

/** Scroll progress shared value + onScroll handler for a tab-variant ScreenHeader. */
export function useScreenHeaderScroll() {
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  return { scrollY, scrollHandler };
}

export interface ScreenHeaderTabProps {
  variant: "tab";
  title: string;
  scrollY: ReturnType<typeof useScreenHeaderScroll>["scrollY"];
  trailing?: React.ReactNode;
}

export interface ScreenHeaderDetailProps {
  variant: "detail";
  title: string;
  backLabel: string;
  onBack: () => void;
  action?: React.ReactNode;
}

export interface ScreenHeaderSheetProps {
  variant: "sheetHeader";
  title: string;
  cancelLabel: string;
  onCancel: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

export type ScreenHeaderProps = ScreenHeaderTabProps | ScreenHeaderDetailProps | ScreenHeaderSheetProps;

const DUMMY_SCROLL_Y_FALLBACK = 0;

/** §6.24 ScreenHeader — tab (crossfade on scroll), detail (back + centered title), sheet-header. */
export function ScreenHeader(props: ScreenHeaderProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const fallbackScrollY = useSharedValue(DUMMY_SCROLL_Y_FALLBACK);
  const scrollY = props.variant === "tab" ? props.scrollY : fallbackScrollY;

  const largeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, SCROLL_CROSSFADE_RANGE], [1, 0]),
  }));
  const smallStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, SCROLL_CROSSFADE_RANGE], [0, 1]),
  }));

  if (props.variant === "tab") {
    return (
      <View style={styles.tabContainer}>
        <Animated.Text style={[styles.largeTitle, largeStyle]} numberOfLines={1}>
          {props.title}
        </Animated.Text>
        <Animated.Text style={[styles.smallTitle, smallStyle]} numberOfLines={1}>
          {props.title}
        </Animated.Text>
        {props.trailing}
      </View>
    );
  }

  if (props.variant === "detail") {
    return (
      <View style={styles.detailContainer}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Volver a ${props.backLabel}`} hitSlop={8} onPress={props.onBack} style={styles.backButton}>
          <ChevronLeft size={20} strokeWidth={1.75} color={colors.monte} />
          <Text style={styles.backLabel} numberOfLines={1}>{props.backLabel}</Text>
        </Pressable>
        <Text style={styles.detailTitle} numberOfLines={1}>{props.title}</Text>
        <View style={styles.detailAction}>{props.action}</View>
      </View>
    );
  }

  return (
    <View style={styles.sheetContainer}>
      <Pressable accessibilityRole="button" accessibilityLabel={props.cancelLabel} hitSlop={8} onPress={props.onCancel}>
        <Text style={styles.sheetSide}>{props.cancelLabel}</Text>
      </Pressable>
      <Text style={styles.sheetTitle} numberOfLines={1}>{props.title}</Text>
      {props.actionLabel && props.onAction ? (
        <Pressable accessibilityRole="button" accessibilityLabel={props.actionLabel} hitSlop={8} onPress={props.onAction}>
          <Text style={[styles.sheetSide, styles.sheetAction]}>{props.actionLabel}</Text>
        </Pressable>
      ) : (
        <View style={styles.sheetSideSpacer} />
      )}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    tabContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.xl,
      height: 56,
    },
    largeTitle: {
      position: "absolute",
      left: spacing.xl,
      fontFamily: fontFamilyForWeight(700),
      fontSize: 30,
      fontWeight: "700",
      color: c.ink,
    },
    smallTitle: {
      position: "absolute",
      left: spacing.xl,
      fontFamily: fontFamilyForWeight(600),
      fontSize: 17,
      fontWeight: "600",
      color: c.ink,
    },
    detailContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      height: 52,
    },
    backButton: {
      flexDirection: "row",
      alignItems: "center",
      minWidth: 60,
    },
    backLabel: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 16,
      color: c.monte,
    },
    detailTitle: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 16,
      color: c.ink,
      flex: 1,
      textAlign: "center",
    },
    detailAction: {
      minWidth: 60,
      alignItems: "flex-end",
    },
    sheetContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
    },
    sheetSide: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 15,
      color: c.ink2,
      minWidth: 60,
    },
    sheetAction: {
      color: c.monte,
      fontFamily: fontFamilyForWeight(600),
      textAlign: "right",
    },
    sheetSideSpacer: {
      minWidth: 60,
    },
    sheetTitle: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 17,
      color: c.ink,
      flex: 1,
      textAlign: "center",
    },
  });
}
