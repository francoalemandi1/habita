import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  ChefHat,
  ClipboardCheck,
  Compass,
  Receipt,
  ShoppingCart,
} from "lucide-react-native";
import { colors, fontFamily, radius, spacing } from "@/theme";
import { HabitaLogo } from "@/components/ui/habita-logo";

// ─── Feature pills ────────────────────────────────────────────────────────────

interface FeaturePill {
  icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  label: string;
}

const FEATURES: FeaturePill[] = [
  { icon: ClipboardCheck, label: "Organizá las tareas" },
  { icon: Receipt,        label: "Controlá los gastos" },
  { icon: ShoppingCart,   label: "Ahorrá en el super" },
  { icon: ChefHat,        label: "Cociná con recetas" },
  { icon: Compass,        label: "Descubrí planes" },
];

function FeaturePillItem({ item, delay }: { item: FeaturePill; delay: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY, delay]);

  return (
    <Animated.View
      style={[styles.pill, { opacity, transform: [{ translateY }] }]}
    >
      <item.icon size={14} color={colors.primary} strokeWidth={2} />
      <Text style={styles.pillLabel}>{item.label}</Text>
    </Animated.View>
  );
}

// ─── WelcomeScreen ────────────────────────────────────────────────────────────

export default function WelcomeScreen() {
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroY = useRef(new Animated.Value(16)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(heroOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(heroY, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.timing(buttonOpacity, { toValue: 1, duration: 350, delay: 200, useNativeDriver: true }),
    ]).start();
  }, [heroOpacity, heroY, buttonOpacity]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        {/* Logo */}
        <View style={styles.logo}>
          <HabitaLogo size={52} />
        </View>

        {/* Hero copy */}
        <Animated.View
          style={[
            styles.heroSection,
            { opacity: heroOpacity, transform: [{ translateY: heroY }] },
          ]}
        >
          <Text style={styles.headline}>Tu hogar,{"\n"}coordinado.</Text>
          <Text style={styles.subheadline}>
            Tareas, gastos, compras, recetas y salidas — todo lo que tu casa
            necesita, en un solo lugar.
          </Text>
        </Animated.View>

        {/* Feature pills */}
        <View style={styles.pillsRow}>
          {FEATURES.map((f, i) => (
            <FeaturePillItem key={f.label} item={f} delay={300 + i * 80} />
          ))}
        </View>

        {/* CTA */}
        <Animated.View style={[styles.ctaSection, { opacity: buttonOpacity }]}>
          <Pressable
            onPress={() => router.push("/(auth)/onboarding")}
            style={({ pressed }) => [styles.ctaButton, pressed && styles.ctaButtonPressed]}
          >
            <Text style={styles.ctaButtonText}>Comencemos</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(auth)/join")}
            style={styles.joinLink}
          >
            <Text style={styles.joinLinkText}>
              Tengo un código de invitación
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    justifyContent: "center",
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 14,
    marginBottom: spacing.xl,
  },
  heroSection: {
    marginBottom: spacing.xl,
  },
  headline: {
    fontFamily: fontFamily.sans,
    fontSize: 40,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -1,
    lineHeight: 46,
    marginBottom: 14,
  },
  subheadline: {
    fontFamily: fontFamily.sans,
    fontSize: 16,
    color: colors.mutedForeground,
    lineHeight: 24,
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: spacing.xxl,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full ?? 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  pillLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  ctaSection: {
    gap: spacing.md,
  },
  ctaButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: 17,
    alignItems: "center",
  },
  ctaButtonPressed: {
    opacity: 0.85,
  },
  ctaButtonText: {
    fontFamily: fontFamily.sans,
    fontSize: 16,
    fontWeight: "700",
    color: colors.white,
  },
  joinLink: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  joinLinkText: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
});
