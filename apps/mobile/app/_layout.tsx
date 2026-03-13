import { Stack } from "expo-router";
import { Animated, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { useEffect, useMemo, useRef, useState } from "react";
import { RuntimeBanner } from "@/components/runtime-banner";
import { MobileQueryProvider } from "@/providers/query-provider";
import { MobileAuthProvider, useMobileAuth } from "@/providers/mobile-auth-provider";
import { ThemeProvider, useTheme } from "@/providers/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { NotificationProvider } from "@/providers/notification-provider";
import { colors, fontFamily } from "@/theme";
import { HabitaLogo } from "@/components/ui/habita-logo";

function BrandedSplash() {
  const fadeIn = useMemo(() => new Animated.Value(0), []);
  const scaleIn = useMemo(() => new Animated.Value(0.9), []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleIn, { toValue: 1, damping: 15, stiffness: 120, useNativeDriver: true }),
    ]).start();
  }, [fadeIn, scaleIn]);

  return (
    <View style={splashStyles.container}>
      <StatusBar style="light" />
      <Animated.View style={[splashStyles.center, { opacity: fadeIn, transform: [{ scale: scaleIn }] }]}>
        <HabitaLogo size={72} />
        <Text style={splashStyles.brand}>Habita</Text>
        <Text style={splashStyles.tagline}>Tu hogar, organizado</Text>
      </Animated.View>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    marginBottom: 8,
  },
  brand: {
    fontFamily: "DMSans",
    fontSize: 44,
    fontWeight: "800",
    color: colors.lime,
    letterSpacing: -1,
  },
  tagline: {
    fontFamily: "DMSans",
    fontSize: 16,
    fontWeight: "500",
    color: "rgba(255,255,255,0.7)",
  },
});

/**
 * Splash overlay that fades out when bootstrapping completes.
 * Stays mounted briefly after isBootstrapping flips to false to animate out.
 */
function SplashOverlay({ visible }: { visible: boolean }) {
  const opacity = useMemo(() => new Animated.Value(1), []);
  const [mounted, setMounted] = useState(true);
  const [hasBootstrapped, setHasBootstrapped] = useState(false);
  const [fadeStarted, setFadeStarted] = useState(false);

  // Track visible transitions via derived state
  const [prevVisible, setPrevVisible] = useState(visible);
  if (prevVisible !== visible) {
    setPrevVisible(visible);
    if (!visible && !hasBootstrapped) {
      // First time bootstrapping completes — mark for fade out
      setHasBootstrapped(true);
      setFadeStarted(true);
    } else if (visible && hasBootstrapped) {
      // Subsequent hydrate() calls — skip splash immediately
      setMounted(false);
    }
  }

  // Perform the fade-out animation
  useEffect(() => {
    if (!fadeStarted) return;
    Animated.timing(opacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setMounted(false));
  }, [fadeStarted, opacity]);

  if (!mounted) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity }]}>
      <BrandedSplash />
    </Animated.View>
  );
}

function RootNavigator() {
  const { isBootstrapping } = useMobileAuth();
  const { resolvedMode, colors: themeColors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      <StatusBar style={resolvedMode === "dark" ? "light" : "dark"} backgroundColor={themeColors.background} />
      <RuntimeBanner />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: themeColors.background } }} />
      <SplashOverlay visible={isBootstrapping} />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans: require("../assets/fonts/DMSans-Variable.ttf"),
    Caveat: require("../assets/fonts/Caveat-Variable.ttf"),
  });

  if (!fontsLoaded) {
    return <BrandedSplash />;
  }

  return (
    <MobileQueryProvider>
      <ThemeProvider>
        <MobileAuthProvider>
          <NotificationProvider>
            <ToastProvider>
              <RootNavigator />
            </ToastProvider>
          </NotificationProvider>
        </MobileAuthProvider>
      </ThemeProvider>
    </MobileQueryProvider>
  );
}
