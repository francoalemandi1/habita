import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { useThemeColors } from "@/hooks/use-theme";
import { mobileApi } from "@/lib/api";
import { mobileConfig } from "@/lib/config";
import { fontFamilyForWeight, spacing, typography } from "@/theme";
import { HabitaLogo } from "@/components/ds";
import { GoogleSignInButton } from "@/components/features/onboarding/google-sign-in-button";
import { BienvenidaBullets } from "@/components/features/onboarding/bienvenida-bullets";

import type { ThemeColors } from "@/theme";
import type { AuthMeResponse } from "@habita/contracts";

WebBrowser.maybeCompleteAuthSession();

/** Bienvenida — handoff §5.3 Entrada. Merges the former login + welcome screens. */
export default function WelcomeScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { exchangeTokens } = useMobileAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContinue = async (intent: "default" | "join") => {
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

      const authCode = url.searchParams.get("code");
      if (!authCode) {
        setError("No se recibió código de autenticación");
        return;
      }

      const tokenResponse = await mobileApi.post<{
        accessToken: string;
        refreshToken: string;
        expiresInSeconds: number;
      }>("/api/auth/mobile/code-exchange", { code: authCode });

      await exchangeTokens({
        accessToken: tokenResponse.accessToken,
        refreshToken: tokenResponse.refreshToken,
      });

      if (intent === "join") {
        router.replace("/(auth)/join");
        return;
      }

      try {
        const me = await mobileApi.get<AuthMeResponse>("/api/auth/me");
        router.replace(me.households.length === 0 ? "/(auth)/onboarding" : "/(app)/casa");
      } catch (error) {
        console.warn("Welcome: failed to fetch /api/auth/me, defaulting to casa", error);
        router.replace("/(app)/casa");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.hero}>
          <HabitaLogo size={72} />
          <Text style={styles.headline}>La casa, en orden.</Text>
          <BienvenidaBullets />
        </View>

        <View style={styles.ctaSection}>
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <GoogleSignInButton
            label={isSubmitting ? "Iniciando sesión..." : "Continuar con Google"}
            loading={isSubmitting}
            onPress={() => void handleContinue("default")}
          />

          <Pressable onPress={() => void handleContinue("join")} style={styles.joinLink} disabled={isSubmitting}>
            <Text style={styles.joinLinkText}>Tengo un código de invitación</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.monte },
    inner: {
      flex: 1,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xl,
      justifyContent: "space-between",
    },
    hero: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.xl },
    headline: {
      fontFamily: fontFamilyForWeight(700),
      fontSize: 48,
      color: c.paper,
      textAlign: "center",
      letterSpacing: -1,
      lineHeight: 52,
    },
    ctaSection: { gap: spacing.md },
    errorBanner: { backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 14, padding: spacing.md },
    errorText: { fontFamily: fontFamilyForWeight(400), color: c.ladrilloSoft, fontSize: typography.b2.fontSize },
    joinLink: { alignItems: "center", paddingVertical: spacing.sm },
    joinLinkText: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: typography.b1.fontSize,
      color: c.paper,
      textDecorationLine: "underline",
    },
  });
}
