import { useState } from "react";
import { router, useURL } from "expo-router";
import { Pressable, SafeAreaView, Text, TextInput, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { mobileConfig } from "@/lib/config";
import { semanticColors } from "@habita/design-tokens";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { exchangeTokens } = useMobileAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContinue = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      // Backend-driven OAuth: the backend handles Google auth and redirects
      // back to the app via habita://auth?accessToken=...&refreshToken=...
      // This works on both simulator and real device without bundle ID restrictions.
      const signinUrl = `${mobileConfig.apiBaseUrl}/api/auth/mobile/signin`;
      const result = await WebBrowser.openAuthSessionAsync(signinUrl, "habita://auth");

      if (result.type !== "success") {
        if (result.type !== "dismiss") {
          setError("No se pudo completar el inicio de sesión.");
        }
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
        setError("No se recibieron tokens de sesión.");
        return;
      }

      await exchangeTokens({ accessToken, refreshToken });
      router.replace("/(app)/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión mobile");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 20, backgroundColor: "#ffffff" }}>
      <View style={{ marginTop: 20, gap: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: "700" }}>Habita Mobile</Text>
        <Text style={{ color: "#666666" }}>
          Iniciá sesión con Google para obtener tokens mobile seguros.
        </Text>
      </View>

      <View style={{ marginTop: 24, gap: 12 }}>
        {error ? <Text style={{ color: "#b91c1c" }}>{error}</Text> : null}
        <Pressable
          onPress={() => void handleContinue()}
          disabled={isSubmitting}
          style={{
            backgroundColor: semanticColors.primary,
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: "center",
            opacity: isSubmitting ? 0.6 : 1,
          }}
        >
          <Text style={{ color: "#ffffff", fontWeight: "600" }}>
            {isSubmitting ? "Iniciando..." : "Continuar con Google"}
          </Text>
        </Pressable>
        <TextInput
          editable={false}
          value={mobileConfig.apiBaseUrl}
          style={{ borderWidth: 1, borderColor: "#eeeeee", borderRadius: 10, padding: 12, color: "#666666" }}
        />
      </View>
    </SafeAreaView>
  );
}
