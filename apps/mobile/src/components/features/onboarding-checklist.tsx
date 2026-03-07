import { useEffect, useMemo, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CheckCircle2, ChevronRight, Circle, X } from "lucide-react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamily, radius, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";

interface OnboardingChecklistProps {
  hasExpense: boolean;
  hasCompletedTask: boolean;
}

const DISMISSED_KEY = "habita_onboarding_checklist_dismissed";
const SHOPPING_KEY = "habita_shopping_first_search";

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: `${colors.primary}30`,
      borderRadius: radius.xl,
      padding: spacing.xl,
      marginBottom: spacing.lg,
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: spacing.md,
    },
    titleBlock: {
      flex: 1,
    },
    title: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      fontFamily: fontFamily.sans,
    },
    progressText: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: fontFamily.sans,
      marginTop: 2,
    },
    dismissButton: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: spacing.sm,
    },
    progressBarTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.muted,
      marginBottom: spacing.md,
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
      borderRadius: 3,
      backgroundColor: colors.primary,
    },
    stepRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
      marginBottom: spacing.xs,
    },
    stepLabel: {
      flex: 1,
      fontSize: 14,
      fontFamily: fontFamily.sans,
      marginLeft: spacing.md,
    },
    stepLabelPending: {
      color: colors.text,
    },
    stepLabelDone: {
      color: colors.mutedForeground,
      textDecorationLine: "line-through",
    },
    completionText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.primary,
      fontFamily: fontFamily.sans,
      textAlign: "center",
      paddingVertical: spacing.sm,
    },
  });
}

interface Step {
  label: string;
  done: boolean;
  onPress: () => void;
}

export function OnboardingChecklist({ hasExpense, hasCompletedTask }: OnboardingChecklistProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash
  const [shoppingSearched, setShoppingSearched] = useState(false);
  const [completing, setCompleting] = useState(false);

  const fadeAnim = useMemo(() => new Animated.Value(0), []);
  const slideAnim = useMemo(() => new Animated.Value(12), []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void AsyncStorage.multiGet([DISMISSED_KEY, SHOPPING_KEY]).then((pairs) => {
      const isDismissed = pairs[0]?.[1] === "1";
      const hasShopped = pairs[1]?.[1] === "1";
      // These setState calls are inside an async callback, not synchronous in the effect body
      setShoppingSearched(hasShopped); // eslint-disable-line react-hooks/set-state-in-effect
      setDismissed(isDismissed); // eslint-disable-line react-hooks/set-state-in-effect

      if (!isDismissed) {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
          }),
        ]).start();
      }
    });
  }, [fadeAnim, slideAnim]);

  const steps: Step[] = [
    {
      label: "Registrá tu primer gasto",
      done: hasExpense,
      onPress: () => router.push("/(app)/new-expense"),
    },
    {
      label: "Completá una tarea",
      done: hasCompletedTask,
      onPress: () => router.push("/(app)/tasks"),
    },
    {
      label: "Compará precios",
      done: shoppingSearched,
      onPress: () => router.push("/(app)/compras"),
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === 3;

  useEffect(() => {
    if (!allDone || dismissed || completing) return;

    setCompleting(true); // eslint-disable-line react-hooks/set-state-in-effect
    const timer = setTimeout(() => {
      void AsyncStorage.setItem(DISMISSED_KEY, "1");
      setDismissed(true); // eslint-disable-line react-hooks/set-state-in-effect
    }, 2000);

    return () => clearTimeout(timer);
  }, [allDone, dismissed, completing]);

  const handleDismiss = () => {
    void AsyncStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  };

  if (dismissed) return null;

  const progressWidth = `${(completedCount / 3) * 100}%` as `${number}%`;

  return (
    <Animated.View
      style={[
        styles.card,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Tus primeros pasos</Text>
          <Text style={styles.progressText}>{completedCount} de 3 completados</Text>
        </View>
        <Pressable onPress={handleDismiss} hitSlop={8} style={styles.dismissButton}>
          <X size={14} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { width: progressWidth }]} />
      </View>

      {/* Steps or completion */}
      {completing ? (
        <Text style={styles.completionText}>¡Completaste todos los pasos!</Text>
      ) : (
        steps.map((step) => (
          <Pressable
            key={step.label}
            onPress={step.onPress}
            style={({ pressed }) => [
              styles.stepRow,
              pressed && !step.done && { backgroundColor: colors.muted },
            ]}
          >
            {step.done ? (
              <CheckCircle2 size={20} color={colors.primary} />
            ) : (
              <Circle size={20} color={`${colors.mutedForeground}80`} />
            )}
            <Text
              style={[
                styles.stepLabel,
                step.done ? styles.stepLabelDone : styles.stepLabelPending,
              ]}
            >
              {step.label}
            </Text>
            {!step.done && (
              <ChevronRight size={16} color={colors.mutedForeground} />
            )}
          </Pressable>
        ))
      )}
    </Animated.View>
  );
}
