import { useEffect, useMemo } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamily, radius, spacing } from "@/theme";

import type { ReactNode } from "react";
import type { ThemeColors } from "@/theme";

interface Step {
  icon: ReactNode;
  title: string;
  description: string;
}

interface SectionGuideCardProps {
  steps: Step[];
  onDismiss: () => void;
}

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
    stepRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: spacing.lg,
    },
    numberCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: `${colors.primary}15`,
      alignItems: "center",
      justifyContent: "center",
      marginRight: spacing.md,
      marginTop: 2,
    },
    numberText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.primary,
      fontFamily: fontFamily.sans,
    },
    stepContent: {
      flex: 1,
    },
    iconRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.xs,
    },
    icon: {
      marginRight: spacing.sm,
    },
    stepTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
      fontFamily: fontFamily.sans,
    },
    stepDescription: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: fontFamily.sans,
      lineHeight: 18,
    },
    buttonContainer: {
      alignItems: "center",
      marginTop: spacing.xs,
    },
  });
}

export function SectionGuideCard({ steps, onDismiss }: SectionGuideCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const fadeAnim = useMemo(() => new Animated.Value(0), []);
  const slideAnim = useMemo(() => new Animated.Value(12), []);

  useEffect(() => {
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
  }, [fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={[
        styles.card,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {steps.map((step, index) => (
        <View key={step.title} style={styles.stepRow}>
          <View style={styles.numberCircle}>
            <Text style={styles.numberText}>{index + 1}</Text>
          </View>
          <View style={styles.stepContent}>
            <View style={styles.iconRow}>
              <View style={styles.icon}>{step.icon}</View>
              <Text style={styles.stepTitle}>{step.title}</Text>
            </View>
            <Text style={styles.stepDescription}>{step.description}</Text>
          </View>
        </View>
      ))}
      <View style={styles.buttonContainer}>
        <Button variant="ghost" onPress={onDismiss}>
          Entendido
        </Button>
      </View>
    </Animated.View>
  );
}
