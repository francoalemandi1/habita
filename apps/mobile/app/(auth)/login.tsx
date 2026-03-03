import { useRef, useState } from "react";
import { router } from "expo-router";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChefHat,
  ClipboardCheck,
  Receipt,
  ShoppingCart,
} from "lucide-react-native";
import * as WebBrowser from "expo-web-browser";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { mobileConfig } from "@/lib/config";
import { colors, fontFamily, radius, spacing } from "@/theme";

import type { LucideIcon } from "lucide-react-native";

WebBrowser.maybeCompleteAuthSession();

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Slide data ─────────────────────────────────────────────────────────────

interface OnboardingSlide {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  color: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    icon: ClipboardCheck,
    title: "Organizá las tareas\ndel hogar",
    subtitle: "Distribuí tareas de forma justa con IA.\nCada miembro sabe qué le toca.",
    color: "#ffffff",
  },
  {
    icon: ShoppingCart,
    title: "Ahorrá en\nel supermercado",
    subtitle: "Compará precios entre supermercados\ny encontrá las mejores ofertas.",
    color: "#ffffff",
  },
  {
    icon: ChefHat,
    title: "Cociná sin\ncomplicarte",
    subtitle: "Recibí sugerencias de recetas basadas\nen lo que tenés en tu heladera.",
    color: "#ffffff",
  },
  {
    icon: Receipt,
    title: "Controlá los\ngastos del hogar",
    subtitle: "Registrá gastos, dividí cuentas\ny mantené las finanzas en orden.",
    color: "#ffffff",
  },
];

// ─── SlideItem ──────────────────────────────────────────────────────────────

function SlideItem({ slide, index, scrollX }: { slide: OnboardingSlide; index: number; scrollX: Animated.Value }) {
  const inputRange = [
    (index - 1) * SCREEN_WIDTH,
    index * SCREEN_WIDTH,
    (index + 1) * SCREEN_WIDTH,
  ];

  const scale = scrollX.interpolate({
    inputRange,
    outputRange: [0.8, 1, 0.8],
    extrapolate: "clamp",
  });

  const opacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.4, 1, 0.4],
    extrapolate: "clamp",
  });

  const translateY = scrollX.interpolate({
    inputRange,
    outputRange: [20, 0, 20],
    extrapolate: "clamp",
  });

  return (
    <View style={[slideStyles.container, { width: SCREEN_WIDTH }]}>
      <Animated.View style={{ transform: [{ scale }, { translateY }], opacity, alignItems: "center" }}>
        <slide.icon size={56} color={slide.color} strokeWidth={1.2} style={slideStyles.icon} />
        <Text style={slideStyles.title}>{slide.title}</Text>
        <Text style={slideStyles.subtitle}>{slide.subtitle}</Text>
      </Animated.View>
    </View>
  );
}

const slideStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  icon: {
    marginBottom: 28,
  },
  title: {
    fontFamily: fontFamily.sans,
    fontSize: 30,
    fontWeight: "800",
    color: "#ffffff",
    textAlign: "center",
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
});

// ─── DotIndicator ───────────────────────────────────────────────────────────

function DotIndicator({ count, scrollX }: { count: number; scrollX: Animated.Value }) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: count }).map((_, i) => {
        const inputRange = [
          (i - 1) * SCREEN_WIDTH,
          i * SCREEN_WIDTH,
          (i + 1) * SCREEN_WIDTH,
        ];

        const width = scrollX.interpolate({
          inputRange,
          outputRange: [8, 24, 8],
          extrapolate: "clamp",
        });

        const backgroundColor = scrollX.interpolate({
          inputRange,
          outputRange: [
            "rgba(255,255,255,0.3)",
            "#d2ffa0",
            "rgba(255,255,255,0.3)",
          ],
          extrapolate: "clamp",
        });

        return (
          <Animated.View
            key={i}
            style={[dotStyles.dot, { width, backgroundColor }]}
          />
        );
      })}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "center", gap: 8 },
  dot: { height: 8, borderRadius: 4 },
});

// ─── LoginScreen ────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { exchangeTokens } = useMobileAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleContinue = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const signinUrl = `${mobileConfig.oauthBaseUrl}/api/auth/mobile/signin`;
      const result = await WebBrowser.openAuthSessionAsync(signinUrl, "habita://auth");

      if (result.type !== "success") {
        setError(`result.type=${result.type}`);
        return;
      }

      const url = new URL(result.url);
      const authError = url.searchParams.get("error");
      if (authError) {
        setError(`Error de autenticación: ${authError}`);
        return;
      }

      const accessToken = url.searchParams.get("accessToken");
      const refreshToken = url.searchParams.get("refreshToken");
      if (!accessToken || !refreshToken) {
        setError(`Sin tokens. URL: ${result.url}`);
        return;
      }

      await exchangeTokens({ accessToken, refreshToken });
      router.replace("/(app)/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Slides */}
        <View style={styles.slidesArea}>
          {/* Logo */}
          <Image source={require("../../assets/logo-96.png")} style={styles.logoIcon} />
          <FlatList
            ref={flatListRef}
            data={SLIDES}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            viewabilityConfig={viewabilityConfig}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false },
            )}
            scrollEventThrottle={16}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item, index }) => (
              <SlideItem slide={item} index={index} scrollX={scrollX} />
            )}
          />
        </View>

        {/* Bottom section */}
        <View style={styles.bottomArea}>
          <DotIndicator count={SLIDES.length} scrollX={scrollX} />

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => void handleContinue()}
            disabled={isSubmitting}
            style={[styles.googleButton, isSubmitting && styles.buttonDisabled]}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleButtonText}>
              {isSubmitting ? "Iniciando sesión..." : "Continuar con Google"}
            </Text>
          </Pressable>

          <Text style={styles.disclaimer}>
            Es gratis. Organizá tu hogar en familia.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  safeArea: {
    flex: 1,
  },
  logoIcon: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignSelf: "center",
    marginBottom: spacing.xl,
  },
  slidesArea: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: spacing.xl,
  },
  bottomArea: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 32,
    gap: 16,
  },
  errorBanner: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  errorText: {
    fontFamily: fontFamily.sans,
    color: "#fecaca",
    fontSize: 13,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#ffffff",
    borderRadius: radius.xl,
    paddingVertical: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  googleIcon: {
    fontFamily: fontFamily.sans,
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
  googleButtonText: {
    fontFamily: fontFamily.sans,
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },
  disclaimer: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },
});
