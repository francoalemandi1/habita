import { useCallback, useMemo } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import {
  ChefHat,
  MapPin,
  Receipt,
  ShoppingCart,
  Users,
} from "lucide-react-native";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { useThemeColors } from "@/hooks/use-theme";
import { useHouseholdDetail } from "@/hooks/use-households";
import { mobileConfig } from "@/lib/config";
import { fontFamily, radius, spacing } from "@/theme";

import type { LucideIcon } from "lucide-react-native";
import type { ThemeColors } from "@/theme";
import type { TourSection } from "@/hooks/use-guided-tour";

interface TourSheetProps {
  section: TourSection;
  stepNumber: number;
  totalSteps: number;
  visible: boolean;
  onDismiss: () => void;
  onSkipTour: () => void;
  onNavigate: () => void;
}

interface TourSectionContent {
  icon: LucideIcon;
  title: string;
  description: string;
  features: { emoji: string; label: string }[];
  cta: string;
  route: string;
}

const TOUR_CONTENT: Record<TourSection, TourSectionContent> = {
  invitar: {
    icon: Users,
    title: "Invitá a tu hogar",
    description: "Habita funciona mejor en equipo. Invitá a las personas con las que vivís.",
    features: [
      { emoji: "👥", label: "Dividir gastos" },
      { emoji: "📊", label: "Ver quién hace qué" },
      { emoji: "🔔", label: "Notificarse mutuamente" },
    ],
    cta: "Compartir invitación",
    route: "/(app)/settings",
  },
  registra: {
    icon: Receipt,
    title: "Registrá gastos",
    description: "Anotá cuánto gastan y Habita calcula los balances automáticamente.",
    features: [
      { emoji: "🧾", label: "Registro rápido" },
      { emoji: "📈", label: "Insights automáticos" },
      { emoji: "💰", label: "Liquidar deudas" },
    ],
    cta: "Registrar un gasto",
    route: "/(app)/expenses",
  },
  ahorra: {
    icon: ShoppingCart,
    title: "Compará precios",
    description: "Buscá productos y encontrá el mejor precio en 11 supermercados.",
    features: [
      { emoji: "🔍", label: "Buscar productos" },
      { emoji: "🏪", label: "11 supermercados" },
      { emoji: "🏷️", label: "Ofertas bancarias" },
    ],
    cta: "Buscar un producto",
    route: "/(app)/shopping-plan",
  },
  descubri: {
    icon: MapPin,
    title: "Descubrí tu ciudad",
    description: "Cine, teatro, música y más — todo lo que pasa cerca tuyo.",
    features: [
      { emoji: "🎫", label: "Eventos actualizados" },
      { emoji: "🔖", label: "Guardá favoritos" },
      { emoji: "📍", label: "Filtrar por zona" },
    ],
    cta: "Explorar eventos",
    route: "/(app)/discover",
  },
  cocina: {
    icon: ChefHat,
    title: "Cociná con lo que tenés",
    description: "Decile a Habita qué tenés y te sugiere recetas personalizadas.",
    features: [
      { emoji: "👨‍🍳", label: "Recetas personalizadas" },
      { emoji: "⏱️", label: "Filtrar por tiempo" },
      { emoji: "❤️", label: "Guardar favoritas" },
    ],
    cta: "Probar Cociná",
    route: "/(app)/cocina",
  },
};

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    dotsRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 6,
      marginBottom: spacing.lg,
    },
    dotActive: {
      width: 24,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.primary,
    },
    dotDone: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.primary + "66", // 40% opacity
    },
    dotPending: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.border,
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: c.primaryLight,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
      marginBottom: spacing.md,
    },
    title: {
      fontFamily: fontFamily.sans,
      fontSize: 20,
      fontWeight: "700",
      color: c.text,
      textAlign: "center",
      marginBottom: 6,
    },
    description: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      color: c.mutedForeground,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: spacing.lg,
      paddingHorizontal: spacing.sm,
    },
    featureRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: c.muted + "80",
      borderRadius: radius.xl,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    featureEmoji: {
      fontSize: 18,
    },
    featureLabel: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      fontWeight: "500",
      color: c.text,
    },
    featuresGap: {
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    ctaBtn: {
      marginBottom: spacing.sm,
    },
    footerRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: spacing.lg,
      paddingVertical: spacing.sm,
    },
    dismissText: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      color: c.mutedForeground,
    },
    separator: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      color: c.border,
    },
  });
}

export function TourSheet({
  section,
  stepNumber,
  totalSteps,
  visible,
  onDismiss,
  onSkipTour,
  onNavigate,
}: TourSheetProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const content = TOUR_CONTENT[section];
  const Icon = content.icon;
  const householdQuery = useHouseholdDetail();

  const handleCta = useCallback(() => {
    if (section === "invitar") {
      const code = householdQuery.data?.household?.inviteCode;
      const name = householdQuery.data?.household?.name ?? "mi hogar";
      if (code) {
        const baseUrl = mobileConfig.oauthBaseUrl;
        const message = `Unite a "${name}" en Habita: ${baseUrl}/onboarding?mode=join\n\nCódigo: ${code}`;
        void Share.share({ message });
      }
      onNavigate();
      return;
    }
    onNavigate();
    router.push(content.route as never);
  }, [onNavigate, content.route, section, householdQuery.data]);

  return (
    <BottomSheet visible={visible} onClose={onDismiss} scrollable={false}>
      {/* Step dots */}
      <View style={styles.dotsRow}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View
            key={i}
            style={
              i + 1 === stepNumber
                ? styles.dotActive
                : i + 1 < stepNumber
                  ? styles.dotDone
                  : styles.dotPending
            }
          />
        ))}
      </View>

      {/* Icon */}
      <View style={styles.iconWrap}>
        <Icon size={28} color={colors.primary} />
      </View>

      {/* Title + description */}
      <Text style={styles.title}>{content.title}</Text>
      <Text style={styles.description}>{content.description}</Text>

      {/* Features */}
      <View style={styles.featuresGap}>
        {content.features.map((f) => (
          <View key={f.label} style={styles.featureRow}>
            <Text style={styles.featureEmoji}>{f.emoji}</Text>
            <Text style={styles.featureLabel}>{f.label}</Text>
          </View>
        ))}
      </View>

      {/* CTA */}
      <Button onPress={handleCta} style={styles.ctaBtn}>
        {content.cta}
      </Button>

      {/* Dismiss / Skip */}
      <View style={styles.footerRow}>
        <Pressable onPress={onDismiss} hitSlop={8}>
          <Text style={styles.dismissText}>Ahora no</Text>
        </Pressable>
        {stepNumber === 1 && (
          <>
            <Text style={styles.separator}>·</Text>
            <Pressable onPress={onSkipTour} hitSlop={8}>
              <Text style={styles.dismissText}>Saltar tour</Text>
            </Pressable>
          </>
        )}
      </View>
    </BottomSheet>
  );
}
