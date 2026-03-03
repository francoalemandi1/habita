import { Stack } from "expo-router";
import { Animated, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { useEffect, useRef, useState } from "react";
import { RuntimeBanner } from "@/components/runtime-banner";
import { MobileQueryProvider } from "@/providers/query-provider";
import { MobileAuthProvider, useMobileAuth } from "@/providers/mobile-auth-provider";
import { ToastProvider } from "@/components/ui/toast";
import { colors, fontFamily } from "@/theme";

function BrandedSplash() {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const scaleIn = useRef(new Animated.Value(0.9)).current;

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
        <View style={splashStyles.iconWrap}>
          <Text style={splashStyles.iconText}>H</Text>
        </View>
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
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  iconText: {
    fontSize: 40,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -1,
  },
  brand: {
    fontFamily: "DMSans",
    fontSize: 44,
    fontWeight: "800",
    color: "#d2ffa0",
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
  const opacity = useRef(new Animated.Value(1)).current;
  const [mounted, setMounted] = useState(true);
  const hasBootstrapped = useRef(false);

  useEffect(() => {
    if (!visible && !hasBootstrapped.current) {
      // First time bootstrapping completes — fade out
      hasBootstrapped.current = true;
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setMounted(false));
    } else if (visible && hasBootstrapped.current) {
      // Subsequent hydrate() calls (e.g. after household creation) — skip splash
      setMounted(false);
    }
  }, [visible, opacity]);

  if (!mounted) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity }]}>
      <BrandedSplash />
    </Animated.View>
  );
}

function RootNavigator() {
  const { isBootstrapping } = useMobileAuth();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="dark" backgroundColor={colors.background} />
      <RuntimeBanner />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
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
      <MobileAuthProvider>
        <ToastProvider>
          <RootNavigator />
        </ToastProvider>
      </MobileAuthProvider>
    </MobileQueryProvider>
  );
}
