import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { radius, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";

const SCREEN_HEIGHT = Dimensions.get("window").height;

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Max height as fraction of screen height. Default: 0.85 */
  maxHeightRatio?: number;
  /** If true, content is scrollable. Default: true */
  scrollable?: boolean;
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: c.overlay,
    },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: spacing.xxl + (Platform.OS === "ios" ? 20 : 0),
    },
    dragIndicator: {
      width: 36,
      height: 4,
      borderRadius: radius.full,
      backgroundColor: c.border,
      alignSelf: "center",
      marginTop: spacing.sm,
      marginBottom: spacing.md,
    },
    header: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      marginBottom: spacing.sm,
    },
    title: {
      fontSize: 16,
      fontWeight: "700",
      color: c.text,
    },
  });
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  maxHeightRatio = 0.85,
  scrollable = true,
}: BottomSheetProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const translateY = useMemo(() => new Animated.Value(SCREEN_HEIGHT), []);
  const backdropOpacity = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          damping: 28,
          stiffness: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 220,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, backdropOpacity]);

  const ContentWrapper = scrollable ? ScrollView : View;
  const contentProps = scrollable
    ? { showsVerticalScrollIndicator: false, bounces: false }
    : {};

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={staticStyles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            { maxHeight: SCREEN_HEIGHT * maxHeightRatio },
            { transform: [{ translateY }] },
          ]}
        >
          {/* Drag indicator */}
          <View style={styles.dragIndicator} />

          {/* Header */}
          {title ? (
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
            </View>
          ) : null}

          {/* Content */}
          <ContentWrapper {...contentProps} style={staticStyles.content}>
            {children}
          </ContentWrapper>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const staticStyles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
});
