import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamily, radius, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";

type ToastVariant = "default" | "success" | "error" | "warning" | "celebration";

interface ToastMessage {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function getVariantStyles(c: ThemeColors): Record<ToastVariant, { bg: string; text: string }> {
  return {
    default: { bg: c.text, text: c.background },
    success: { bg: c.successBg, text: c.successText },
    error: { bg: c.destructive, text: "#ffffff" },
    warning: { bg: c.warningBg, text: c.warningText },
    celebration: { bg: c.primaryLight, text: c.primary },
  };
}

function ToastItem({
  toast,
  onDismiss,
  colors,
}: {
  toast: ToastMessage;
  onDismiss: () => void;
  colors: ThemeColors;
}) {
  const translateY = useMemo(() => new Animated.Value(80), []);
  const opacity = useMemo(() => new Animated.Value(0), []);

  const variantMap = useMemo(() => getVariantStyles(colors), [colors]);
  const v = variantMap[toast.variant];

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [translateY, opacity]);

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 80, duration: 180, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(onDismiss);
  }, [translateY, opacity, onDismiss]);

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: v.bg },
        { transform: [{ translateY }], opacity },
      ]}
    >
      <Text style={[styles.toastText, { color: v.text }]} numberOfLines={3}>
        {toast.message}
      </Text>
      <Pressable onPress={dismiss} style={styles.dismissButton} hitSlop={8}>
        <Text style={[styles.dismissText, { color: v.text }]}>✕</Text>
      </Pressable>
    </Animated.View>
  );
}

let toastIdCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const colors = useThemeColors();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const show = useCallback((message: string, variant: ToastVariant = "default") => {
    const id = String(++toastIdCounter);
    setToasts((prev) => [...prev, { id, message, variant }]);

    timersRef.current[id] = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      delete timersRef.current[id];
    }, 5000);
  }, []);

  const dismiss = useCallback((id: string) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value: ToastContextValue = useMemo(
    () => ({
      show,
      success: (msg: string) => show(msg, "success"),
      error: (msg: string) => show(msg, "error"),
      warning: (msg: string) => show(msg, "warning"),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={() => dismiss(toast.id)}
            colors={colors}
          />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 80,
    left: spacing.lg,
    right: spacing.lg,
    gap: spacing.sm,
    zIndex: 9999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    fontFamily: fontFamily.sans,
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  dismissButton: {
    padding: 2,
  },
  dismissText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
